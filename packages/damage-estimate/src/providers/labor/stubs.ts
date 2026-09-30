import type { LaborTimeProvider, LaborTimeQuote } from "../types.js";

export class MotorLaborTimeProvider implements LaborTimeProvider {
  readonly name = "motor";
  async quote(): Promise<LaborTimeQuote> {
    throw new Error("MOTOR Information Systems LaborTimeProvider not configured (TODO: MOTOR_API_KEY)");
  }
}
