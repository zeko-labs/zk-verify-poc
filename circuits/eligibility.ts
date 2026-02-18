import {
  Bool,
  Bytes,
  Crypto,
  Field,
  Hash,
  Poseidon,
  UInt64,
  ZkProgram,
  createEcdsa,
  createForeignCurve,
} from 'o1js';

export const THIRTY_DAYS_MS_U64 = UInt64.from(2_592_000_000);

export interface EligibilityProgramBundle {
  Program: any;
  SignatureType: any;
  PublicKeyType: any;
  SessionHeaderType: any;
}

export function createEligibilityProgram(sessionHeaderLength: number): EligibilityProgramBundle {
  if (!Number.isInteger(sessionHeaderLength) || sessionHeaderLength <= 0) {
    throw new Error(`invalid session header length: ${sessionHeaderLength}`);
  }

  class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
  class EcdsaSignature extends createEcdsa(Secp256k1) {}
  class SessionHeaderBytes extends Bytes(sessionHeaderLength) {}

  const Program = ZkProgram({
    name: `employment-eligibility-${sessionHeaderLength}`,
    publicInput: Field,
    publicOutput: Bool,
    methods: {
      verifyEligibility: {
        privateInputs: [
          UInt64,
          UInt64,
          Field,
          EcdsaSignature,
          Secp256k1,
          SessionHeaderBytes,
          UInt64,
          UInt64,
          UInt64,
          Field,
        ],
        async method(
          dataCommitment: Field,
          salary: UInt64,
          hireDateUnix: UInt64,
          statusHash: Field,
          signature: any,
          notaryPublicKey: any,
          sessionHeader: any,
          minSalary: UInt64,
          minTenureMonths: UInt64,
          currentDateUnix: UInt64,
          requiredStatusHash: Field,
        ) {
          const computedDataCommitment = Poseidon.hash([
            salary.toField(),
            hireDateUnix.toField(),
            statusHash,
          ]);
          computedDataCommitment.assertEquals(dataCommitment);

          const signedMessageHash = Hash.SHA2_256.hash(sessionHeader);
          signature.verifySignedHash(signedMessageHash, notaryPublicKey).assertTrue();

          statusHash.assertEquals(requiredStatusHash);
          salary.assertGreaterThanOrEqual(minSalary);

          const tenureMs = currentDateUnix.sub(hireDateUnix);
          const tenureMonths = tenureMs.div(THIRTY_DAYS_MS_U64);
          tenureMonths.assertGreaterThanOrEqual(minTenureMonths);

          return { publicOutput: Bool(true) };
        },
      },
    },
  });

  return {
    Program,
    SignatureType: EcdsaSignature,
    PublicKeyType: Secp256k1,
    SessionHeaderType: SessionHeaderBytes,
  };
}
