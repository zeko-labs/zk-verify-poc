use std::{
    fs::File,
    io::BufReader,
    path::Path,
};

use anyhow::{anyhow, Context, Result};
use futures::io::{AsyncReadExt as _, AsyncWriteExt as _};
use tokio::{io::AsyncRead, net::TcpListener};
use tokio_util::compat::{FuturesAsyncReadCompatExt, TokioAsyncReadCompatExt};
use tracing::info;

use tlsn::{
    attestation::{
        request::Request as AttestationRequest,
        signing::{Secp256k1Signer, SignatureAlgId},
        Attestation, AttestationConfig, CryptoProvider,
    },
    config::verifier::VerifierConfig,
    connection::{ConnectionInfo, TranscriptLength},
    transcript::ContentType,
    verifier::VerifierOutput,
    webpki::{CertificateDer, RootCertStore},
    Session,
};
use zkverify_tlsnotary::{parse_hex32, required_env};

fn load_root_cert_store(cert_path: &Path) -> Result<RootCertStore> {
    let file = File::open(cert_path).with_context(|| format!("failed opening certificate at {}", cert_path.display()))?;
    let mut reader = BufReader::new(file);
    let certs = rustls_pemfile::certs(&mut reader)?;
    let first = certs
        .first()
        .ok_or_else(|| anyhow!("no certificate found in {}", cert_path.display()))?;

    Ok(RootCertStore {
        roots: vec![CertificateDer(first.clone())],
    })
}

async fn run_notary<S>(
    socket: S,
    root_store: RootCertStore,
    signing_key: [u8; 32],
) -> Result<()>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Send + Sync + Unpin + 'static,
{
    let session = Session::new(socket.compat());
    let (driver, mut handle) = session.split();
    let driver_task = tokio::spawn(driver);

    let verifier_config = VerifierConfig::builder().root_store(root_store).build()?;

    let verifier = handle
        .new_verifier(verifier_config)?
        .commit()
        .await?
        .accept()
        .await?
        .run()
        .await?;

    let (
        VerifierOutput {
            transcript_commitments,
            ..
        },
        verifier,
    ) = verifier.verify().await?.accept().await?;

    let tls_transcript = verifier.tls_transcript().clone();
    verifier.close().await?;

    let sent_len = tls_transcript
        .sent()
        .iter()
        .filter_map(|record| {
            if let ContentType::ApplicationData = record.typ {
                Some(record.ciphertext.len())
            } else {
                None
            }
        })
        .sum::<usize>();

    let recv_len = tls_transcript
        .recv()
        .iter()
        .filter_map(|record| {
            if let ContentType::ApplicationData = record.typ {
                Some(record.ciphertext.len())
            } else {
                None
            }
        })
        .sum::<usize>();

    handle.close();
    let mut socket = driver_task.await??;

    let mut request_bytes = Vec::new();
    socket.read_to_end(&mut request_bytes).await?;
    let request: AttestationRequest = bincode::deserialize(&request_bytes)?;

    let signer = Box::new(Secp256k1Signer::new(&signing_key)?);
    let mut provider = CryptoProvider::default();
    provider.signer.set_signer(signer);

    if !provider
        .signer
        .supported_algs()
        .any(|alg| alg == SignatureAlgId::SECP256K1)
    {
        return Err(anyhow!("secp256k1 signer was not configured in provider"));
    }

    let mut attestation_config_builder = AttestationConfig::builder();
    attestation_config_builder
        .supported_signature_algs(Vec::from_iter(provider.signer.supported_algs()));

    let attestation_config = attestation_config_builder.build()?;
    let mut attestation_builder = Attestation::builder(&attestation_config).accept_request(request)?;
    attestation_builder
        .connection_info(ConnectionInfo {
            time: tls_transcript.time(),
            version: (*tls_transcript.version()),
            transcript_length: TranscriptLength {
                sent: sent_len as u32,
                received: recv_len as u32,
            },
        })
        .server_ephemeral_key(tls_transcript.server_ephemeral_key().clone())
        .transcript_commitments(transcript_commitments);

    let attestation = attestation_builder.build(&provider)?;
    let payload = bincode::serialize(&attestation)?;
    socket.write_all(&payload).await?;
    socket.close().await?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let host = std::env::var("TLSN_NOTARY_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("TLSN_NOTARY_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(7047);

    let cert_path = std::env::var("TLSN_ROOT_CERT_PATH")
        .unwrap_or_else(|_| "mock-server/cert.pem".to_string());

    let signing_key_hex = required_env("TLSNOTARY_SIGNING_KEY_HEX")?;
    let signing_key = parse_hex32(&signing_key_hex)?;
    let root_store = load_root_cert_store(Path::new(&cert_path))?;

    let listener = TcpListener::bind((host.as_str(), port)).await?;
    info!("listening on {}:{}", host, port);

    let (socket, addr) = listener.accept().await?;
    info!("accepted prover connection from {}", addr);

    run_notary(socket, root_store, signing_key).await
}
