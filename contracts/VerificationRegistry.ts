import { Field, SmartContract, State, Struct, method, state } from 'o1js';

export class VerificationEvent extends Struct({
  proofHash: Field,
  result: Field,
}) {}

export class VerificationRegistry extends SmartContract {
  @state(Field) lastProofHash = State<Field>();
  @state(Field) lastResult = State<Field>();

  events = {
    verification: VerificationEvent,
  };

  init() {
    super.init();
    this.lastProofHash.set(Field(0));
    this.lastResult.set(Field(0));
  }

  @method async recordVerification(proofHash: Field, result: Field) {
    this.lastProofHash.set(proofHash);
    this.lastResult.set(result);

    this.emitEvent(
      'verification',
      new VerificationEvent({
        proofHash,
        result,
      }),
    );
  }
}
