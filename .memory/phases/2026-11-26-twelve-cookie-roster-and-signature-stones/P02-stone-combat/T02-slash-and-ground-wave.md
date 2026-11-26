# Task: T02 칠리맛 베기와 바다요정 파도

## Status: done

## Goal

첫 직접 접촉 후 새로 생성되는 공격의 이동·차단·피해를 물리 발사 결과에 기록한다. 베기와 파도는 별도의 적에게 실제 닿은 경우에만 추가 피해를 준다.

## Decision Summary

- 칠리맛: 첫 직접 명중 이후 진행 방향 뒤쪽 선분이 다른 적 1명에게 닿으면 고정 피해 1; 길이 C/B/A 180/240/300. 장애물에 막히면 멈춘다.
- 바다요정: 첫 적·장애물·바닥 접촉점의 지면부터 발사 진행 방향으로 낮은 파도가 전진한다. 길이 C/B/A 420/560/700, 지상 적 최대 2명에게 각각 고정 피해 1. 장애물에 막힌다. 공중·발판 위 적은 제외.
- 자기 스톤 직접 명중 대상의 중복 추가 피해는 주지 않는다. 창은 능력을 대체하고 불공은 추가 고정 피해를 증폭하지 않는다.

## Implementation

### I01. 베기·파도의 실제 접촉 기록

- Related Files:
  - `src/game/shotGeometry.js` :: `planShot` 결과의 직접 접촉 후 경로, `findObstacleContact` 및 적 collider 검사; modify.
  - `src/game/shotResolution.js` :: `flightResultPayload`; modify.
  - `src/game/battlefieldModel.js` :: `layout.enemies`, `layout.obstacles`, `groundY`, 순찰 위치 데이터 읽기 전용.
  - `tests/shot-geometry.test.mjs`, `tests/shot-resolution.test.mjs` :: 선분·지면 접촉 테스트; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type ExtraContact = {kind:'slash'|'ground-wave'; time:number; point:{x:number;y:number};
    sourceId:string|null; targetIds:string[]; maxDistance:number; blockedBy:string|null};
  // FlightSolution.abilityContacts: ExtraContact[]
  ```
- **Data & Schema Fields**: 베기의 `sourceId`는 첫 직접 명중 enemy ID. 파도는 첫 접촉 대상 ID, 바닥이면 `null`. `targetIds`는 실제 접촉 시간순이며 칠리 최대 1, 파도 최대 2. 파도는 `layout.groundY`와 실제 collider의 하단이 만나는 적만 지상으로 본다.
- **Execution Flow / Logic**:
  1. `piercing`이면 아무 ability contact도 만들지 않는다. 칠리는 첫 `hitIds[0]`의 실제 충돌점에서 발사 진행 방향으로 선분을 만든다. 원래 맞은 적은 후보에서 제외한다.
  2. 선분과 살아 있는 다른 enemy collider의 교점, 선분과 아직 서 있는 obstacle의 첫 교점을 계산해 앞선 충돌만 기록한다. 순찰·낙하 중 적은 그 시간의 실제 위치를 사용한다.
  3. 바다요정은 첫 적·장애물·바닥 접촉의 지면 X를 시작점으로 삼는다. 지면 바로 위의 낮은 경로를 진행 방향으로 최대 거리까지 만들고, 장애물의 첫 교점에서 자른다. 적 collider가 그 경로에 실제 닿은 순서대로 2명만 기록한다.
  4. 방어 가능한 물체의 전복/연쇄로 이미 쓰러진 장애물을 중복 차단에 넣지 않는다. 파도가 장애물을 직접 치더라도 기존 장애물 효과를 추가로 재발동시키지 않는다.
- **Error & Exception Handling**: 첫 직접 명중이 없으면 칠리 ability contact 없음. 파도 시작이 맵 바깥이면 없음. 첫 대상 사망과 무관하게 접촉 당시 ID와 좌표를 기록하되, 피해 확정 시 이미 죽은 적은 건너뛴다.

### I02. 피해 확정과 메타 경계

- Related Files:
  - `assets/js/battle-engine.js` :: `resolveProjectile`의 직접 명중 이후, 적 반격 이전 고정 피해 1 및 기존 `GRADE_MULTIPLIER` 점수 처리; modify.
  - `src/game/gameSession.js` :: `fireShot`의 `validAbilityContacts`와 예약 결과 비교; modify.
  - `tests/shot-hit-integrity.test.mjs`, `tests/battle-engine.test.cjs` :: 타격·차단·중복 피해 검증; modify.

#### Details

- `flightResultPayload`은 접촉 stream을 `shotMeta.abilityContacts`에 직렬화한다. `gameSession.fireShot`은 현재 장전된 스톤 ID와 kind, 예약된 `pendingShot.flight.abilityContacts`의 ID·시간·좌표·순서를 확인한다. 외부 호출자가 임의 target ID를 만들어 통과시키지 않는다.
- `resolveProjectile`은 기존 직접 피해를 먼저 주고, 추가 대상 중 아직 살아 있는 적만 HP에서 `min(hp,1)` 차감한다. 적별 결과 `hits`/점수는 실제 제거 HP를 따른다. 원래 직접 맞은 적은 추가 대상에서 제외한다.

## Acceptance Criteria

- [ ] 베기 길이·장애물 차단·다른 적 1명 제한이 C/B/A에 맞다.
- [ ] 파도는 지상 적 2명까지만, 지형 차단 전까지의 실제 접촉만 때린다.
- [ ] 같은 적 중복 피해와 창·불공 조합의 잘못된 증폭이 없다.
- [ ] 예약되지 않은 `abilityContacts`로 적을 죽일 수 없다.

## Validation

- `node --test tests/shot-geometry.test.mjs tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs tests/battle-engine.test.cjs` — 명중·차단·피해 경계 확인.
- `npm.cmd run build` — 번들 확인.

## Commit Message

```text
feat(combat): 칠리 베기와 바다요정 파도 충돌 구현

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P02-stone-combat
Task: T02-slash-and-ground-wave

- 베기 선분과 지면 파도의 실제 접촉 결과 기록
- 장애물 차단과 추가 피해 중복 방지
```

## Progress

- [x] 구현 완료
- [x] 지정 검증 통과
- commit: 이 문서를 포함한 Task 커밋
