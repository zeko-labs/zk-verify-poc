use std::{
    fs::File,
    io::BufReader,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use anyhow::{anyhow, Context, Result};
use futures::io::{AsyncReadExt as _, AsyncWriteExt as _};
use k256::ecdsa::VerifyingKey;
use serde::Serialize;
use tokio_util::compat::TokioAsyncReadCompatExt;

use tlsn::{
    attestation::{
        request::{Request as AttestationRequest, RequestConfig},
        signing::{KeyAlgId, SignatureAlgId},
        Attestation, CryptoProvider,
    },
    config::{
        prove::ProveConfig,
        prover::ProverConfig,
        tls::TlsClientConfig,
        tls_commit::{mpc::MpcTlsConfig, TlsCommitConfig},
    },
    connection::{HandshakeData, ServerName},
    prover::ProverOutput,
    transcript::TranscriptCommitConfig,
    webpki::{CertificateDer, RootCertStore},
    Session,
};
use tlsn_formats::http::{DefaultHttpCommitter, HttpCommit, HttpTranscript};

use zkverify_tlsnotary::split_signature_64;

const MAX_SENT_DATA: usize = 1 << 12;
const MAX_RECV_DATA: usize = 1 << 14;
const OUTPUT_FILE: &str = "../output/attestation.json";

#[derive(Debug, Serialize)]
struct AttestationOutput {
    session_header_bytes_hex: String,
    signature: SignatureOutput,
    notary_public_key: PublicKeyOutput,
    response_body: String,
    server_name: String,
    timestamp: u64,
    signature_alg: String,
}

#[derive(Debug, Serialize)]
struct SignatureOutput {
    raw_hex: String,
    r_hex: String,
    s_hex: String,
}

#[derive(Debug, Serialize)]
struct PublicKeyOutput {
    sec1_hex: String,
    x_hex: String,
    y_hex: String,
}

fn load_root_cert_store(cert_path: &Path) -> Result<RootCertStore> {
    let file = File::open(cert_path)
        .with_context(|| format!("failed opening certificate at {}", cert_path.display()))?;
    let mut reader = BufReader::new(file);
    let certs = rustls_pemfile::certs(&mut reader)?;
    let first = certs
        .first()
        .ok_or_else(|| anyhow!("no certificate found in {}", cert_path.display()))?;

    Ok(RootCertStore {
        roots: vec![CertificateDer(first.clone())],
    })
}

fn now_unix_seconds() -> Result<u64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("system clock before UNIX epoch")?
        .as_secs())
}

fn parse_http_200_response(raw_response: &[u8]) -> Result<String> {
    let response = String::from_utf8(raw_response.to_vec())
        .context("HTTP response from server is not valid UTF-8")?;

    let mut sections = response.splitn(2, "\r\n\r\n");
    let head = sections
        .next()
        .ok_or_else(|| anyhow!("missing HTTP response head"))?;
    let body = sections
        .next()
        .ok_or_else(|| anyhow!("missing HTTP response body"))?;

    if !(head.starts_with("HTTP/1.1 200") || head.starts_with("HTTP/1.0 200")) {
        return Err(anyhow!("unexpected response status line: {head}"));
    }

    Ok(body.to_string())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let notary_host = std::env::var("TLSN_NOTARY_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let notary_port = std::env::var("TLSN_NOTARY_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(7047);

    let server_host = std::env::var("TLSN_SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let server_domain = std::env::var("TLSN_SERVER_DOMAIN").unwrap_or_else(|_| "localhost".to_string());
    let server_port = std::env::var("TLSN_SERVER_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(4443);
    let endpoint = std::env::var("TLSN_ENDPOINT")
        .unwrap_or_else(|_| "/api/v1/employee/EMP-001".to_string());
    let cert_path =
        std::env::var("TLSN_ROOT_CERT_PATH").unwrap_or_else(|_| "../mock-server/cert.pem".to_string());

    let root_store = load_root_cert_store(Path::new(&cert_path))?;

    let notary_socket = tokio::net::TcpStream::connect((notary_host.as_str(), notary_port)).await?;
    let session = Session::new(notary_socket.compat());
    let (driver, mut handle) = session.split();
    let driver_task = tokio::spawn(driver);

    let prover = handle
        .new_prover(ProverConfig::builder().build()?)?
        .commit(
            TlsCommitConfig::builder()
                .protocol(
                    MpcTlsConfig::builder()
                        .max_sent_data(MAX_SENT_DATA)
                        .max_recv_data(MAX_RECV_DATA)
                        .build()?,
                )
                .build()?,
        )
        .await?;

    let client_socket = tokio::net::TcpStream::connect((server_host.as_str(), server_port)).await?;

    let (mut tls_connection, prover_task_fut) = prover.connect(
        TlsClientConfig::builder()
            .server_name(ServerName::Dns(server_domain.clone().try_into()?))
            .root_store(root_store)
            .build()?,
        client_socket.compat(),
    )?;

    let prover_task = tokio::spawn(prover_task_fut);

    let raw_request = format!(
        "GET {endpoint} HTTP/1.1\r\nHost: {server_domain}\r\nAccept: */*\r\nAccept-Encoding: identity\r\nConnection: close\r\nUser-Agent: zkverify-poc\r\n\r\n"
    );
    tls_connection.write_all(raw_request.as_bytes()).await?;

    let mut raw_response = Vec::new();
    tls_connection.read_to_end(&mut raw_response).await?;
    let fallback_body = parse_http_200_response(&raw_response)?;

    let mut prover = prover_task.await??;
    let transcript = HttpTranscript::parse(prover.transcript())?;

    let mut transcript_builder = TranscriptCommitConfig::builder(prover.transcript());
    DefaultHttpCommitter::default().commit_transcript(&mut transcript_builder, &transcript)?;

    let transcript_commit = transcript_builder.build()?;

    let mut request_config_builder = RequestConfig::builder();
    request_config_builder.transcript_commit(transcript_commit);
    let request_config = request_config_builder.build()?;

    let mut disclosure_builder = ProveConfig::builder(prover.transcript());
    if let Some(config) = request_config.transcript_commit() {
        disclosure_builder.transcript_commit(config.clone());
    }

    let disclosure_config = disclosure_builder.build()?;

    let ProverOutput {
        transcript_commitments,
        transcript_secrets,
        ..
    } = prover.prove(&disclosure_config).await?;

    let prover_transcript = prover.transcript().clone();
    let tls_transcript = prover.tls_transcript().clone();
    prover.close().await?;

    let response_body = transcript
        .responses
        .first()
        .and_then(|response| response.body.as_ref())
        .map(|body| String::from_utf8_lossy(&body.content_data()).to_string())
        .unwrap_or(fallback_body);

    let mut attestation_request_builder = AttestationRequest::builder(&request_config);
    attestation_request_builder
        .server_name(ServerName::Dns(server_domain.clone().try_into()?))
        .handshake_data(HandshakeData {
            certs: tls_transcript
                .server_cert_chain()
                .expect("server cert chain must exist")
                .to_vec(),
            sig: tls_transcript
                .server_signature()
                .expect("server signature must exist")
                .clone(),
            binding: tls_transcript.certificate_binding().clone(),
        })
        .transcript(prover_transcript)
        .transcript_commitments(transcript_secrets, transcript_commitments);

    let provider = CryptoProvider::default();
    let (attestation_request, _secrets) = attestation_request_builder.build(&provider)?;

    handle.close();
    let mut socket = driver_task.await??;

    let request_bytes = bincode::serialize(&attestation_request)?;
    socket.write_all(&request_bytes).await?;
    socket.close().await?;

    let mut attestation_bytes = Vec::new();
    socket.read_to_end(&mut attestation_bytes).await?;

    let attestation: Attestation = bincode::deserialize(&attestation_bytes)?;

    attestation_request.validate(&attestation, &provider)?;

    if attestation.signature.alg != SignatureAlgId::SECP256K1 {
        return Err(anyhow!(
            "expected secp256k1 signature algorithm, got {:?}",
            attestation.signature.alg
        ));
    }

    if attestation.body.verifying_key().alg != KeyAlgId::K256 {
        return Err(anyhow!(
            "expected notary key algorithm k256, got {:?}",
            attestation.body.verifying_key().alg
        ));
    }

    let header_bytes = bcs::to_bytes(&attestation.header)?;
    let signature_raw = attestation.signature.data.clone();
    let (r, s) = split_signature_64(&signature_raw)?;

    let sec1_key = attestation.body.verifying_key().data.clone();
    let verifying_key = VerifyingKey::from_sec1_bytes(&sec1_key)
        .context("failed to parse notary secp256k1 verifying key")?;
    let uncompressed = verifying_key.to_encoded_point(false);
    let x = uncompressed
        .x()
        .ok_or_else(|| anyhow!("missing x coordinate in secp256k1 public key"))?;
    let y = uncompressed
        .y()
        .ok_or_else(|| anyhow!("missing y coordinate in secp256k1 public key"))?;

    let output = AttestationOutput {
        session_header_bytes_hex: hex::encode(header_bytes),
        signature: SignatureOutput {
            raw_hex: hex::encode(signature_raw),
            r_hex: hex::encode(r),
            s_hex: hex::encode(s),
        },
        notary_public_key: PublicKeyOutput {
            sec1_hex: hex::encode(sec1_key),
            x_hex: hex::encode(x),
            y_hex: hex::encode(y),
        },
        response_body,
        server_name: server_domain,
        timestamp: now_unix_seconds()?,
        signature_alg: "secp256k1".to_string(),
    };

    tokio::fs::create_dir_all("../output").await?;
    tokio::fs::write(
        OUTPUT_FILE,
        format!("{}\n", serde_json::to_string_pretty(&output)?),
    )
    .await?;

    println!("[prover] Attestation written to {OUTPUT_FILE}");

    Ok(())
}
