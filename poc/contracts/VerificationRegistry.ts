import { Field, SmartContract, State, Struct, declareMethods, declareState } from "o1js";

export class VerificationEvent extends Struct({
  proofHash: Field,
  result: Field,
}) {}

export class VerificationRegistry extends SmartContract {
  lastProofHash = State<Field>();
  lastResult = State<Field>();

  events = {
    verification: VerificationEvent,
  };

  async init() {
    super.init();
    this.lastProofHash.set(Field(0));
    this.lastResult.set(Field(0));
  }

  async recordVerification(proofHash: Field, result: Field) {
    this.lastProofHash.set(proofHash);
    this.lastResult.set(result);

    this.emitEvent(
      "verification",
      new VerificationEvent({
        proofHash,
        result,
      }),
    );
  }
}

// Use non-decorator declarations for compatibility with the current tsgo/tsx runtime setup.
declareState(VerificationRegistry, {
  lastProofHash: Field,
  lastResult: Field,
} as any);

declareMethods(VerificationRegistry, {
  init: [],
  recordVerification: [Field, Field],
} as any);
