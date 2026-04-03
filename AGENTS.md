# Shiba Walk - Project Instructions

## Product
Build a polished web-first 2D side-scrolling game where an owner walks a Shiba through a sequence of destinations and then returns home.

## For visual iteration tasks:
- Implement only the explicitly requested changes.
- Do not combine pending requests into one pass.
- After each pass, report each requested item separately as done/not done.
- If the task is visual and uncertain, prefer smaller changes and stop for review.
- Do not describe a change as fixed unless it is directly addressed in code.

## Fixed technical decisions
- Use Phaser 3 + TypeScript + Vite for the actual game.
- React is allowed only for shell UI outside the gameplay canvas.
- Desktop and mobile browsers are first-class targets.
- No backend in v1. Use local persistence only.
- Use placeholder art and placeholder sound when final assets are missing.
- Keep the game fully playable with programmer art.

## Core gameplay loop
- A session contains multiple destination rounds and a final return-home round.
- Each destination is a timed round.
- The player moves to the right by default toward the current destination.
- The Shiba usually cooperates, but can refuse, pull backward, get distracted, or demand going home.
- The owner can pull the Shiba, but pulling drains stamina.
- Stamina regenerates only while not pulling.
- The round ends when the destination is reached or the timer expires.

## Required destinations for v1
- Park
- Cafe
- Pet shop
- Restaurant patio
- Dog park
- Home

## Required distraction events for v1
- Cat crossing left-to-right or right-to-left
- Small dog with owner: Shiba wants to approach/socialize
- Large dog with owner: Shiba wants to avoid
- Rain: Shiba strongly wants to go home
- Bonus optional distractions: food smell, loud truck, squirrel, pigeon flock

## Dog behavior model
Use a hybrid model:
1. Utility AI chooses the current dog intent.
2. A finite-state machine chooses movement and animation state.
3. Animation overlays add expressive motion.

Dog intents:
- go_to_destination
- chase_cat
- approach_small_dog
- avoid_large_dog
- go_home_due_to_rain
- refuse_to_walk
- recover_after_pull
- idle_sniff

Dog locomotion / animation states:
- idle
- walk_forward
- trot_excited
- pull_backward
- resist_brake
- sit_refuse
- sniff
- greet
- avoid
- rain_turnaround
- tired_recover
- bark_one_shot
- scream_one_shot
- arf_one_shot

## Owner model
Owner states:
- walk
- brace
- pull
- rest
- celebrate
- fail_timeout

## Simulation rules
- Treat horizontal x-position as the main simulation truth.
- Leash uses a spring-damper model with slack length, tension, and max stretch.
- Dog intent creates desired direction and desired speed.
- Owner input creates applied pull force.
- Pull drains stamina continuously.
- Rest regenerates stamina.
- Never let animation drive the simulation truth.

## Physics rules
- Use Phaser Arcade Physics first.
- Use Matter only if a specific feature clearly benefits from constraints/joints/complex bodies.
- Do not over-engineer physics for v1.

## Architecture requirements
- Separate simulation from rendering.
- Keep all tunable numbers in data/config files.
- No magic numbers in gameplay code.
- Round definitions, distraction weights, audio subtitle map, and difficulty curves must be data-driven.
- Use object pooling for frequently spawned distractions.
- Prefer composition over inheritance.

## Scene structure
- BootScene
- MenuScene
- RunScene
- UIScene
- SummaryScene

## Suggested folder structure
src/
  game/
    scenes/
    actors/
    systems/
    data/
    ui/
    audio/
    utils/
  assets/

## Required systems
- RoundManager
- DogBehaviorSystem
- OwnerStaminaSystem
- LeashSystem
- DistractionSpawner
- AudioSubtitleSystem
- InputRouter
- SaveProgressSystem

## Controls
Desktop:
- Arrow keys / A-D to move
- Space or Shift to pull
- Esc to pause

Mobile:
- Right-side hold area to walk/pull
- Left-side rest / calm button
- Large touch targets
- No tiny UI

## Accessibility
- Mute toggle
- Subtitle captions for all vocal sounds
- Reduced motion mode
- High contrast UI mode
- Color should never be the only signal

## Performance targets
- Smooth play on mid-range phones
- Avoid large texture waste
- Use atlases where reasonable
- Minimize per-frame allocations

## Testing expectations
For every major feature:
- Add at least one logic test for the gameplay rule
- Add one smoke test for the happy path of a round
- Add one regression test for previously fixed bugs

## Delivery expectations for each task
1. Explain the plan briefly.
2. Implement only the requested scope.
3. Keep placeholder assets acceptable.
4. Run build and tests before finishing.
5. Report changed files, risks, and next steps.