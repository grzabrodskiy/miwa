export interface StaminaUpdateInput {
  isPulling: boolean;
  isResting: boolean;
}

export class OwnerStaminaSystem {
  constructor(
    private readonly max: number,
    private readonly pullDrainPerSecond: number,
    private readonly recoverPerSecond: number
  ) {}

  update(current: number, deltaSeconds: number, input: StaminaUpdateInput): number {
    let next = current;

    if (input.isPulling) {
      next -= this.pullDrainPerSecond * deltaSeconds;
    } else if (input.isResting) {
      next += this.recoverPerSecond * deltaSeconds;
    }

    return Math.max(0, Math.min(this.max, next));
  }
}
