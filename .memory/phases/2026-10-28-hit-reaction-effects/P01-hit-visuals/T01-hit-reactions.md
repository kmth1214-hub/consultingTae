# Task: T01 몬스터·쿠키 피격 반응과 접근성

## Status: done

## Goal

관리자 숲 시범판에서 실제 사탕·적 공격의 결과가 결정된 순간에만 캐릭터의 물리적 반응과 파편을 표시한다. 쓰러뜨린 몬스터의 마지막 피격도 보여준다.

## Decision Summary

- 새 효과는 `run.studioPrototype === 'forest-elevated-v1' && run.area === 'forest'`인 테스트 전투 전용이다. 기존 피해 숫자·방어막·적 투사체는 유지한다.
- 실제 양수 피해와 방어 성공만 시각화한다. 시각 요소는 전투 엔진에 되돌아가지 않는다.

## Implementation

### I01. 몬스터 피격과 처치 잔상

- Related Files:
  - `src/components/BattleArena.jsx` :: `BattleArena`, `MonsterGroup` 호출 — 시범판 불리언과 `shotReview` 전달; modify.
  - `src/components/MonsterGroup.jsx` :: `MonsterGroup` — 피해 여부, 처치 직후 렌더, 피격 마크업; modify.
  - `src/styles/arena.css` :: `.monster` 관련 스타일 — 짧은 움찔·사탕빛 파편·충격 고리·사망 페이드; modify.

#### Signatures & Types

```typescript
type MonsterGroupProps = {
  enemies: Enemy[];
  placements: EnemyPlacement[];
  lastEvent?: { id: string | number; hits?: Array<{ id: string; damage: number; defeated?: boolean }>; visualKey?: string };
  hitEffectsEnabled?: boolean;
  showDefeatedHit?: boolean;
  // 기존 props 유지
};
```

#### Data & Schema Fields

- `hitEffectsEnabled:boolean=false`: 관리자 숲 시범판 여부. 일반 게임 기본값은 false.
- `showDefeatedHit:boolean=false`: 현재 발사 결과 검토(`shotReview`) 여부. 새로운 영속 상태를 만들지 않는다.
- `hit`: `lastEvent.hits`에서 같은 적 ID의 `damage > 0`인 실제 피해만 사용한다. 여러 피해 기록은 표시 전에 합산하거나 최종 실제 피해 숫자 하나로 정리한다.

#### Execution Flow / Logic

1. `BattleArena`는 `run.studioPrototype`과 지역을 확인해 활성화 속성을 전달한다.
2. 살아 있는 몬스터는 기존대로 렌더한다. 사망한 몬스터는 시범판에서 `showDefeatedHit && hit.damage > 0`일 때에만 일시 렌더한다. 현재 사건 이외에는 즉시 제거한다.
3. 피해 숫자는 기존 `hit-effect`를 유지하고, 시범판 양수 피해 시 `monster-body`가 짧게 움찔하며 별도 포인터 비활성 고리/파편이 나타난다. `lastEvent.id`를 key에 사용해 연속 명중 때 애니메이션을 재시작한다.
4. 사망 잔상은 약 500~700ms에 페이드한 뒤 결과 검토 종료 때 DOM에서 제거한다. CSS `forwards`로 검토 중에는 다시 나타나지 않는다. 미스·피해 0·이전 이벤트는 새 효과가 없다.

### I02. 쿠키 피격·방어와 검증

- Related Files:
  - `src/components/BattleArena.jsx` :: `PlayerCookie` 호출 — 같은 시범판 속성 전달; modify.
  - `src/components/PlayerCookie.jsx` :: `PlayerCookie` — `view.damage`, `view.blockedBy`, `view.impactId` 기반 파편·보호막 파동; modify.
  - `src/styles/arena.css` :: 쿠키 피격·방어 및 `prefers-reduced-motion` 스타일; modify.
  - `tests/studio-e2e/play-mode.spec.cjs` :: 관리자 숲 피격·방어·처치/0 피해 검증; modify.
  - `tests/e2e/enemy-response.spec.cjs`, `tests/e2e/game-flow.spec.cjs`, `tests/e2e/studio-exclusion.spec.cjs` :: 일반 게임 회귀; read-only.

#### Signatures & Types

```typescript
type PlayerCookieProps = {
  hitEffectsEnabled?: boolean;
  response?: { id: string | number; stage: 'windup' | 'travel' | 'impact'; attack: { damage: number; blocked?: boolean; blockedBy?: string; missed?: boolean } };
  // 기존 props 유지
};
```

#### Data & Schema Fields

- 새 피격 파편은 `view.impactId !== null && view.damage > 0`일 때만 렌더한다.
- 새 방어 파동은 `view.impactId !== null && view.blockedBy`일 때만 렌더한다. 무효/빗나감 공격에는 없다.

#### Execution Flow / Logic

1. 기존 `getPlayerPresentation`이 구별한 피해/방어를 재사용한다. 피해 때는 작은 부스러기·빛, 방어 때는 별도 푸른 링을 표시한다.
2. 새 연출 요소는 `aria-hidden`, `pointer-events:none`이며 `view.impactId`를 key로 두어 연속 피격에서도 새로 시작한다.
3. `prefers-reduced-motion: reduce`에서는 움직임을 없애고 짧은 정적 명암·색상 차이를 유지한다. 기존 방어/피해 텍스트와 모든 체력·점수는 변하지 않는다.
4. 관리자 숲 피해/방어/처치 화면과 사용자 게임 비노출을 E2E로 확인한다. 새 UI 테스트는 실제 피해 사건을 근거로 하며 구현만 복제하지 않는다.

## Acceptance Criteria

- [x] 양수 피해를 입은 몬스터는 움찔·파편·고리, 처치된 몬스터는 짧은 마지막 충격을 표시한다.
- [x] 쿠키는 양수 피해와 방어 성공을 서로 다른 효과로 표시하고 미스·피해 0에서는 새 피격 효과가 없다.
- [x] 관리자 숲에서만 새 효과가 동작하고 조준·카메라·체력·점수·사용자 게임은 유지된다.
- [x] 애니메이션 감소와 모바일에서 효과가 대상을 가리거나 입력을 막지 않는다.

## Validation

- `npm.cmd test` — 전체 단위/API 회귀 통과.
- `npm.cmd run test:studio` — 관리자 시범판 E2E 통과.
- `npm.cmd run build` — 배포 빌드 통과.
- `npx.cmd playwright test tests/e2e/enemy-response.spec.cjs tests/e2e/game-flow.spec.cjs tests/e2e/studio-exclusion.spec.cjs` — 일반 게임·관리자 차단 회귀 통과.

## Commit Message

```text
feat(관리자시범판): 몬스터와 쿠키 피격 반응 추가

Plan: 2026-10-28-hit-reaction-effects
Phase: P01-hit-visuals
Task: T01-hit-reactions

- 실제 피해와 방어 결과에 맞는 파편·반동·보호막 파동 표시
- 처치 순간 잔상과 일반 게임 격리 검증
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 — 단위/API 227개, 관리자 E2E 26개, 일반 E2E 24개, 빌드 통과.
- commit: `0b641af`
