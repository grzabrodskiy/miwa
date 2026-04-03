import type { ActorSimulationState } from "../types/gameplay";

export interface LeashMetrics {
  distance: number;
  slack: number;
  stretch: number;
  tension: number;
}

export interface LeashResolution extends LeashMetrics {
  ownerX: number;
  ownerVelocityX: number;
  dogX: number;
  dogVelocityX: number;
}

export class LeashSystem {
  constructor(
    private readonly slackDistance: number,
    private readonly maxStretchDistance: number,
    private readonly springStrength: number,
    private readonly dampingStrength: number,
    private readonly ownerMass: number,
    private readonly dogMass: number
  ) {}

  calculateMetrics(distance: number): LeashMetrics {
    const clampedDistance = Math.max(0, distance);
    const stretch = Math.max(0, clampedDistance - this.slackDistance);
    const tension = Math.max(
      0,
      Math.min(
        1,
        stretch / (this.maxStretchDistance - this.slackDistance)
      )
    );

    return {
      distance: clampedDistance,
      slack: Math.min(clampedDistance, this.slackDistance),
      stretch,
      tension
    };
  }

  simulate(
    owner: ActorSimulationState,
    dog: ActorSimulationState,
    deltaSeconds: number
  ): LeashResolution {
    const initialSeparation = dog.x - owner.x;
    const initialDirection = initialSeparation === 0 ? 1 : Math.sign(initialSeparation);
    const initialMetrics = this.calculateMetrics(Math.abs(initialSeparation));
    const relativeVelocity =
      (dog.velocityX - owner.velocityX) * initialDirection;

    const tensionForce =
      initialMetrics.stretch > 0
        ? Math.max(
            0,
            this.springStrength * initialMetrics.stretch +
              this.dampingStrength * relativeVelocity
          )
        : 0;

    let ownerVelocityX =
      owner.velocityX + (initialDirection * tensionForce * deltaSeconds) / this.ownerMass;
    let dogVelocityX =
      dog.velocityX - (initialDirection * tensionForce * deltaSeconds) / this.dogMass;
    let ownerX = owner.x + ownerVelocityX * deltaSeconds;
    let dogX = dog.x + dogVelocityX * deltaSeconds;

    const separation = dogX - ownerX;
    const direction = separation === 0 ? initialDirection : Math.sign(separation);
    const distance = Math.abs(separation);

    if (distance > this.maxStretchDistance) {
      const excess = distance - this.maxStretchDistance;
      const combinedMass = this.ownerMass + this.dogMass;
      const ownerCorrection = (excess * this.dogMass) / combinedMass;
      const dogCorrection = (excess * this.ownerMass) / combinedMass;

      ownerX += direction * ownerCorrection;
      dogX -= direction * dogCorrection;

      const separatingVelocity =
        (dogVelocityX - ownerVelocityX) * direction;

      if (separatingVelocity > 0) {
        ownerVelocityX += direction * (separatingVelocity * this.dogMass) / combinedMass;
        dogVelocityX -= direction * (separatingVelocity * this.ownerMass) / combinedMass;
      }
    }

    const finalMetrics = this.calculateMetrics(Math.abs(dogX - ownerX));

    return {
      ownerX,
      ownerVelocityX,
      dogX,
      dogVelocityX,
      ...finalMetrics
    };
  }
}
