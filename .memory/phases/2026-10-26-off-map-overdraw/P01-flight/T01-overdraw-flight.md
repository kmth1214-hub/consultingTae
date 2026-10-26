# Task: T01 맵 밖 발사와 상단 파워

## Status: done

## Goal
파워바 상단까지 당기면 기존 3600 단위 전장을 지나칠 수 있고 카메라는 전장 안에 머문다. 사탕은 맵 경계에서 갑자기 멈추지 않고 화면 밖에서 비행을 마친 뒤 기존 단일 턴으로 처리한다.

## Decision Summary
- 파워 0~0.8 조준 유지, 상단 0.2만 추가 강화. 최대 속도 2600. 수치 노출 없이 강화 구간 표시.
- 카메라 경계는 그대로 두고 자유 비행의 x/상단 벽만 제거. 외부 착지는 `bounds`; 바닥 굴림 한도와 실제 충돌/한 번 확정 규칙 유지.

## Implementation

### I01. 단일 발사 속도와 배치 검사
- Related Files:
  - `src/game/battlefieldModel.js` :: `BATTLEFIELD`, `getLaunchSpeed` — modify/new export
  - `src/game/battlefieldPlacement.js` :: `witnessAt` — modify
  - `src/game/shotGeometry.js` :: `getBallisticPath`, `planStackedShot`, `planShot` — modify
  - `src/game/shotResolution.js`, `src/game/gameSession.js` — read-only (예약/확정 변경 금지)

#### Details
- **Signatures & Types**:
  ```typescript
  getLaunchSpeed(powerRatio: number): number | null;
  // BATTLEFIELD 추가/변경: standardMaxSpeed:number=1960,
  // powerBoostStart:number=0.8, maxSpeed:number=2600
  ```
- **Data & Schema Fields**: 유효한 유한 파워는 0~1로 clamp. speed=`240+(1960-240)*p+(2600-1960)*max(0,(p-.8)/.2)^2`. 비유한 입력은 null. 기존 drag ready/deadzone12, 최대당김220px, pouch geometry는 변경하지 않는다.
- **Execution Flow / Logic**:
  1. 기존 입력 검증 후 단일 함수를 호출한다. 배치 검사 `error(power)`의 `240+1720*power`도 반드시 교체한다.
  2. 일반/stacked 초기 속도와 착지 x속도를 같은 함수로 만든다. 충돌 후 감속(.72/.22/.55)은 기존대로 적용한다.
  3. 잘못된 pull/layout의 기존 null 반환 유지. 클라이언트 사본으로 피해/목표/발사번호를 바꾸는 경로를 만들지 않는다.
  4. weapon RNG, ammo, score, enemy damage/positions 규칙은 변경하지 않는다.

### I02. 카메라와 비행 범위 분리
- Related Files:
  - `src/game/shotGeometry.js` :: `ballisticFromVelocity`, `appendGroundRoll` — modify/read
  - `src/game/battlefieldCamera.js` :: `getCameraPose` — read-only
  - `src/components/ProjectileFlight.jsx`, `src/game/projectilePlayback.js` — read-only

#### Details
- **Signatures & Types**: `getBallisticPath({start:{x:number,y:number},direction:{x:number,y:number},powerRatio:number,layout:Battlefield}): Path|null` 유지. `Path.endKind`는 기존 `ground|bounds|timeout`, 종료 point/time/distance는 실제 포물선 값. 필드 추가 없음.
- **Execution Flow / Logic**:
  1. 유한 start/velocity 및 validLayout, 바닥보다 낮은 start 거부는 유지. start.x/카메라 minY를 비행 입력 벽으로 사용하지 않는다.
  2. 하향 착지 root와 8초 제한으로 종료 시점을 구한다. 기존 x=`width+radius` 또는 `-radius` 도달/상단 minY 도달의 조기 종료를 제거한다.
  3. 착지 root가 유효하고 끝 x가 `[-radius,width+radius]` 밖이면 endKind를 `bounds`로 바꾼다. 바깥 착지에는 `appendGroundRoll`을 호출하지 않는다. 맵 내 착지 및 바닥 끝에서 굴림 clipping은 유지한다.
  4. 맵 밖 표적을 생성하거나 가짜 명중을 추가하지 않는다. `bounds` miss는 기존 세션 beginShot→fireShot 토큰으로 한 번만 소비/반격한다. 기존 review 2초와 취소 동작 유지.
  5. 카메라는 기존 x clamp/top clamp를 유지하고 viewport 밖 사탕은 arena overflow로 보이지 않게 된다. 미니맵의 짧은 표시선은 변경하지 않는다.

### I03. 파워바 강화 구간
- Related Files:
  - `src/components/Slingshot.jsx` :: `Slingshot` — modify
  - `src/styles/arena.css` :: `.power-meter`, `.power-meter-mark` — modify

#### Details
- BATTLEFIELD.powerBoostStart를 활용해 overdraw 클래스/접근성 문구를 추가한다. 상단20% 구간과 기존 표식을 같은 경계에 맞춘다. fill은 실제 powerRatio 높이 그대로, 강화 시 붉은/금색 강조를 주되 숫자/각도 수치는 노출하지 않는다.
- 새로 고정된 화면 패널이나 조작 버튼을 추가하지 않는다. 새총·불공·창 아트/발사 motion/회수 타이밍은 보존한다.

### I04. 의미 있는 회귀 검증
- Related Files:
  - `tests/off-map-flight.test.mjs` — new: 독립 물리식/실제 세션 검증
  - `tests/e2e/off-map-flight.spec.cjs` — new: 실제 드래그/카메라/이탈/턴 검증
  - `tests/shot-geometry.test.mjs` — modify: 이전 세계벽 종료를 기대한 테스트를 새 자유 비행 기준으로 변경; 배치 검사 수식도 같은 속도 계약 사용
  - `tests/shot-resolution.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/e2e/shot-integrity.spec.cjs` — 필요 시 물리 fixture만 조정
  - `tests/game-session.test.mjs`, `tests/e2e/obstacle-chain.spec.cjs` — 80% 초과 고정 파워에 의존한 기존 연쇄 회귀 fixture의 조준값만 조정

#### Details
- 파워 .2/.5/.8의 이전 속도 불변, 최대2600/단조 증가/invalid 입력 확인. 실제 탄도 sample을 `x=x0+vx*t`, `y=y0+vy*t+600*t^2`로 독립 검증한다.
- 45도 full shot이 width보다 멀리 비행하고 width 통과 뒤 sample이 존재하며 bounds로 종료. 역발사도 -radius에서 끊기지 않는다. 수직 강발사는 minY 밖에서 다시 내려와 정상 착지한다. 너무 낮은 start/무한 입력 거부와 max8초 유지.
- 실전 모든 지역에서 장애물을 피한 full45도 발사를 예약/확정해 적 체력 불변, ammo1만 감소, 반격1회, 중복 callback 불변, wind 유도 예외 보존.
- Chrome 실제 화면에서 상단 파워 색상/비숫자 문구, projectile x>width 동안 launching 유지, camera 오른쪽 끝 고정/맵 바깥까지 따라가지 않음, 이후 review/반격/idle 한 번과 추가 수초 불변 확인. 역발사와 취소 후 다음 발도 확인.
- 기존 첫 접촉/관통/물체 연쇄 및 배치 보장 회귀를 단위 전체 + 관련 browser로 검증한다. 실패 시 실제 동작을 살피고 고정된 예전 속도에만 의존한 fixture는 동일 목적의 유효한 물리 발사로 바꾼다. 제품 판정을 테스트에 맞춰 약화하지 않는다.

## Acceptance Criteria
- [x] 중간 파워 조준은 보존되고 상단 파워에서 맵 밖으로 자연스럽게 비행한다.
- [x] 카메라는 기존 맵 안에 머물고 HUD/미니맵 제약 및 비숫자 파워 표현 유지.
- [x] 맵 밖 발사도 한 번만 확정되며 관통/유도/연쇄/취소 회귀 없음.

## Validation
- `npm.cmd test` — 전체 unit 통과.
- `npm.cmd run build` — 정적 bundle 생성 성공.
- 수동으로 만든 별도 preview 4192를 기동하고 `npx.cmd playwright test --config tmp/chaos-fused.playwright.cjs tests/e2e/off-map-flight.spec.cjs tests/e2e/shot-integrity.spec.cjs tests/e2e/wide-battlefield.spec.cjs tests/e2e/spear-projectile.spec.cjs tests/e2e/obstacle-chain.spec.cjs tests/e2e/grade-damage.spec.cjs` — 실제 Chrome 검증.
- `npx.cmd playwright test --config tmp/chaos-fused.studio.cjs tests/studio-e2e/play-mode.spec.cjs tests/studio-e2e/chaos-fused-boss.spec.cjs` — 관리자 실제 플레이 회귀.
- `git diff --check` — whitespace 정상. 새 screenshot 육안 확인. 기존4182 dev 유지, 새 preview만 종료.

## Commit Message
```text
feat(전투): 맵 밖 발사와 파워 상단 강화 적용

Plan: 2026-10-26-off-map-overdraw
Phase: P01-flight
Task: T01-overdraw-flight

- 카메라 경계와 사탕의 포물선 비행 범위를 분리
- 파워바 상단 강화와 단일 속도 계산을 배치·발사·착지에 공유
- 맵 밖 빗나감과 단일 반격 및 실제 화면 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending — 기존 자동 승인 검토 사용량 제한 보류 기록 유지. 앞선 13건과 공유 파일 hunk를 섞지 않으며 제한을 우회하지 않는다.

## Validation Results (2026-10-26)
- `npm.cmd test`: 203/203 통과 (`tmp/off-map-unit.log`). 신규 8개는 독립 포물선 식·상단 속도·카메라 경계·4개 지역의 실제 발사 예약/단일 확정을 검증한다.
- `npm.cmd run build`: 성공 (`tmp/off-map-build.log`). 번들 `App-SZs6Nq5m.js`, `index-DSxHee0E.js`, `App-BMA6-2ll.css`.
- 일반 Chrome: 위 Validation 명령 26/26 통과 (`tmp/off-map-browser-regression.log`); 신규 정/역방향 이탈과 모바일/감소 모션/취소 3개 포함. 첫 원격 피해 회귀, 지역별 반격 1회, Spear/Fireball, 물체 연쇄, Wind 우회도 통과.
- 관리자 Chrome: 위 Validation 명령 13/13 통과 (`tmp/off-map-studio.log`). 각 지역 바로 플레이, 재시작/지도 변경, 눈/도시 효과, 혼돈 융합/분리, 모바일, 기록 비저장 확인.
- `git diff --check`: exit0. `tmp/off-map-power-draw.png`, `tmp/off-map-flight-outside.png` 육안 확인: 새총/강화 파워바/짧은 미니맵 선, 맵 바깥 사탕을 따라 수평 카메라가 벗어나지 않음.
- 초기 unit 4개 실패는 0.8 초과 고정 파워의 충돌/관성 변화였다. 첫 Snow 접촉 회귀 .95→.88, custom 연쇄 .85→.84, 실제 post-settlement 연쇄 20°/.9→27.5°/.8로 조정해 원래 검증 목적을 유지했다. Browser 연쇄 Forest .9→.863, Snow .95→.88로 조정했다. 엔진의 피해/확정 규칙은 변경하지 않았다.
- 신규 Browser의 .7 경계가 마우스 부동소수점으로 ‘보통’이 되는 테스트 입력은 .72로 변경했다. 제품 파워 분류/조작을 테스트에 맞춰 바꾸지 않았다.

## Maintainer Notes
- `getLaunchSpeed(powerRatio)`는 배치 검사의 역산, 조준·실제 탄도, 물체 충돌 후 속도, 착지 굴림 초기 속도에 같은 입력 계약을 제공한다. 별도의 선형 속도를 다시 작성하지 않는다.
- 맵 외부에는 새 바닥/적/그림을 생성하지 않는다. 바닥 굴림 최대 지름5배와 바닥 끝 clipping, 기존 카메라 clamp, 첫 접촉/관통/유도 규칙, 단일 발사 토큰은 보존했다. 범위 밖 추가 변경 특이사항 없음.
- 공유 파일의 융합 보스/이전 버그 수정 hunk는 이전 Task에 속한다. 기존 사용자 HTML 수정, out.json 및 무관 파일은 이 Task 커밋에 포함하지 않는다. 커밋 완료 전 done/해시를 기록하지 않는다.
