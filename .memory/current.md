# Current Context

## Active Plan

[숲 고저차 몬스터와 기본 사탕 능력 관리자 시범판](./plans/2026-10-28-forest-elevated-enemies-candy-abilities.md)

## Active Phase

[P01 전투 시뮬레이션](./phases/2026-10-28-forest-elevated-enemies-candy-abilities/P01-combat-simulation/phase.md)

## Active Task

[T04 마법사 분기 구슬·장애물 흔들림](./phases/2026-10-28-forest-elevated-enemies-candy-abilities/P01-combat-simulation/T04-wizard-split-orbs.md)

## Status

- P01-T01~T03 구현과 바운스·파동·낙하 검증 75개 테스트 및 Vite 빌드 완료.
- 개발 전용 관리자 숲 시범판. 사용자 게임과 Azure 배포는 이번 계획 범위 밖.
- 순서: P01-T01 → P01-T02 → P01-T03 → P01-T04 → P02-T01.

## Next Step

T04 청사진을 읽고 마법사 분기 구슬 두 개의 물리 궤적·충돌·장애물 흔들림을 구현한다.

## Completed commits
- aa57886 — [2026-10-26-monster-projectile-throws / T01-projectile-throw](./phases/2026-10-26-monster-projectile-throws/P01-throw/T01-projectile-throw.md)
- 242a740 — [2026-10-26-map-studio-play-mode / T01-studio-play](./phases/2026-10-26-map-studio-play-mode/P01-play/T01-studio-play.md)
- d4264f4 — [2026-10-26-chaos-obstacle-effect-feedback / T01-chaos-effects](./phases/2026-10-26-chaos-obstacle-effect-feedback/P01-feedback/T01-chaos-effects.md)
- 3045b39 — [2026-10-26-snow-candy-reward-unlock / T01-reward-unlock](./phases/2026-10-26-snow-candy-reward-unlock/P01-rewards/T01-reward-unlock.md)
- 4c89d87 — [2026-10-26-giant-bosses-and-throw-mistakes / T01-giant-bosses](./phases/2026-10-26-giant-bosses-and-throw-mistakes/P01-combat/T01-giant-bosses.md)
- 625b7b0 — [2026-10-26-giant-bosses-and-throw-mistakes / T02-throw-mistakes](./phases/2026-10-26-giant-bosses-and-throw-mistakes/P01-combat/T02-throw-mistakes.md)
- 3883b99 — [2026-10-26-aimed-spear-candy / T01-physical-piercing](./phases/2026-10-26-aimed-spear-candy/P01-projectile/T01-physical-piercing.md)
- 7962ac5 — [2026-10-26-chaos-fused-boss / T01-combat-transition](./phases/2026-10-26-chaos-fused-boss/P01-encounter/T01-combat-transition.md)
- bcc1af0 — [2026-10-26-chaos-fused-boss / T02-boss-presentation](./phases/2026-10-26-chaos-fused-boss/P01-encounter/T02-boss-presentation.md)
- 02d2c53 — [2026-10-26-chaos-fused-boss / T03-integration-validation](./phases/2026-10-26-chaos-fused-boss/P01-encounter/T03-integration-validation.md)
- 7fbc4c6 — [2026-10-26-candy-grade-damage-rebalance / T01-grade-damage](./phases/2026-10-26-candy-grade-damage-rebalance/P01-damage/T01-grade-damage.md)
- b24653f — [2026-10-26-shot-resolution-integrity / T01-physical-hit-boundary](./phases/2026-10-26-shot-resolution-integrity/P01-resolution/T01-physical-hit-boundary.md)
- f26fe79 — [2026-10-26-shot-resolution-integrity / T02-single-shot-commit](./phases/2026-10-26-shot-resolution-integrity/P01-resolution/T02-single-shot-commit.md)
- a1dc86e — [2026-10-26-off-map-overdraw / T01-overdraw-flight](./phases/2026-10-26-off-map-overdraw/P01-flight/T01-overdraw-flight.md)
- 62725d1 — [2026-10-27-azure-production-deployment / T01-workflow-integration](./phases/2026-10-27-azure-production-deployment/P01-release/T01-workflow-integration.md)
- 6f840fd — [2026-10-27-azure-production-deployment / T03-ci-regression-stability](./phases/2026-10-27-azure-production-deployment/P01-release/T03-ci-regression-stability.md)
- 71729df — [2026-10-27-azure-production-deployment / T04-entra-display-name-claim](./phases/2026-10-27-azure-production-deployment/P01-release/T04-entra-display-name-claim.md)


## Pending commits

- 이 계획의 T04·P02-T01이 남았다.
- 기존 사용자 HTML 수정·캐시·사이트 임시 파일은 이번 계획 범위 밖이다.

## Local review

- 개발 서버 전용: http://127.0.0.1:5173/__dev/maps
- 관리자 시범판 검토 후 사용자 게임·Azure 승격은 별도 작업.
