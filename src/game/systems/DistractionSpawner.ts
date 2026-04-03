import {
  DISTRACTION_DEFINITIONS,
  DISTRACTION_SPAWN_RULES,
  type DistractionDefinition
} from "../data/distractions";
import type {
  ActiveDistractionState,
  DistractionKind,
  RoundSimulationState
} from "../types/gameplay";

export class DistractionSpawner {
  private spawnTimerMs = DISTRACTION_SPAWN_RULES.spawnCheckIntervalMs;
  private nextId = 0;
  private readonly cooldowns = new Map<DistractionKind, number>();

  constructor(private readonly random: () => number = Math.random) {
    this.reset();
  }

  reset(): void {
    this.spawnTimerMs = DISTRACTION_SPAWN_RULES.spawnCheckIntervalMs;
    this.nextId = 0;
    this.cooldowns.clear();

    for (const kind of Object.keys(DISTRACTION_DEFINITIONS) as DistractionKind[]) {
      this.cooldowns.set(kind, 0);
    }
  }

  update(state: RoundSimulationState, deltaMs: number): ActiveDistractionState[] {
    this.updateActiveDistractions(state, deltaMs);
    this.updateCooldowns(deltaMs);

    const spawned: ActiveDistractionState[] = [];
    this.spawnTimerMs -= deltaMs;

    while (this.spawnTimerMs <= 0) {
      this.spawnTimerMs += DISTRACTION_SPAWN_RULES.spawnCheckIntervalMs;
      const distraction = this.trySpawn(state);

      if (distraction) {
        state.activeDistractions.push(distraction);
        spawned.push(distraction);
      }
    }

    return spawned;
  }

  private updateActiveDistractions(
    state: RoundSimulationState,
    deltaMs: number
  ): void {
    const deltaSeconds = deltaMs / 1000;

    state.activeDistractions = state.activeDistractions
      .map((distraction) => ({
        ...distraction,
        x: distraction.x + distraction.velocityX * deltaSeconds,
        remainingMs: distraction.remainingMs - deltaMs
      }))
      .filter((distraction) => distraction.remainingMs > 0);
  }

  private updateCooldowns(deltaMs: number): void {
    for (const [kind, cooldownMs] of this.cooldowns.entries()) {
      this.cooldowns.set(kind, Math.max(0, cooldownMs - deltaMs));
    }
  }

  private trySpawn(state: RoundSimulationState): ActiveDistractionState | null {
    if (state.activeDistractions.length >= DISTRACTION_SPAWN_RULES.maxConcurrentDistractions) {
      return null;
    }

    const spawnChance = Math.max(
      0,
      Math.min(
        1,
        DISTRACTION_SPAWN_RULES.spawnChancePerCheck *
          state.definition.distractionProfile.spawnChanceMultiplier
      )
    );

    if (this.random() > spawnChance) {
      return null;
    }

    const activeKinds = new Set(state.activeDistractions.map((distraction) => distraction.kind));
    const localActiveCount = state.activeDistractions.filter(
      (distraction) => !distraction.isGlobal
    ).length;

    const eligibleDefinitions = (
      Object.values(DISTRACTION_DEFINITIONS) as DistractionDefinition[]
    )
      .map((definition) => ({
        definition,
        effectiveWeight:
          definition.spawnWeight *
          state.definition.distractionProfile.weightMultipliers[definition.kind]
      }))
      .filter(({ definition, effectiveWeight }) => {
        if (effectiveWeight <= 0) {
          return false;
        }

        if ((this.cooldowns.get(definition.kind) ?? 0) > 0) {
          return false;
        }

        if (activeKinds.has(definition.kind)) {
          return false;
        }

        if (
          !definition.isGlobal &&
          localActiveCount >= DISTRACTION_SPAWN_RULES.maxConcurrentLocalDistractions
        ) {
          return false;
        }

        return true;
      });

    if (eligibleDefinitions.length === 0) {
      return null;
    }

    const chosenDefinition = this.chooseWeightedDefinition(eligibleDefinitions);
    const spawned = this.createDistractionState(state, chosenDefinition);
    this.cooldowns.set(chosenDefinition.kind, chosenDefinition.cooldownMs);

    return spawned;
  }

  private chooseWeightedDefinition(
    eligibleDefinitions: Array<{
      definition: DistractionDefinition;
      effectiveWeight: number;
    }>
  ): DistractionDefinition {
    const totalWeight = eligibleDefinitions.reduce(
      (sum, entry) => sum + entry.effectiveWeight,
      0
    );
    let weightCursor = this.random() * totalWeight;

    for (const entry of eligibleDefinitions) {
      weightCursor -= entry.effectiveWeight;

      if (weightCursor <= 0) {
        return entry.definition;
      }
    }

    return eligibleDefinitions[eligibleDefinitions.length - 1]!.definition;
  }

  private createDistractionState(
    state: RoundSimulationState,
    definition: DistractionDefinition
  ): ActiveDistractionState {
    if (definition.isGlobal) {
      return {
        id: `${definition.kind}-${this.nextId += 1}`,
        kind: definition.kind,
        label: definition.label,
        x: state.dog.x,
        velocityX: 0,
        direction: 1,
        remainingMs: definition.durationMs,
        durationMs: definition.durationMs,
        influenceRadius: definition.influenceRadius,
        isGlobal: true,
        subtitleId: definition.audioSubtitleId
      };
    }

    const direction = this.random() < 0.5 ? -1 : 1;
    const offset =
      definition.spawnOffsetMin +
      (definition.spawnOffsetMax - definition.spawnOffsetMin) * this.random();
    const x = state.dog.x - offset * direction;

    return {
      id: `${definition.kind}-${this.nextId += 1}`,
      kind: definition.kind,
      label: definition.label,
      x,
      velocityX: definition.baseSpeed * direction,
      direction,
      remainingMs: definition.durationMs,
      durationMs: definition.durationMs,
      influenceRadius: definition.influenceRadius,
      isGlobal: false,
      subtitleId: definition.audioSubtitleId
    };
  }
}
