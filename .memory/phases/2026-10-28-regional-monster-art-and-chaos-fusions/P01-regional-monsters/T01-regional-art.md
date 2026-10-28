# Task: T01 눈·도시 몬스터 일러스트

## Status: done

## Goal

로컬 관리자 지도 스튜디오의 눈·도시 1~3라운드에서 일반 적 3종과 보스 2종이 숲 몬스터와 비슷한 밀도의 개별 일러스트로 보이게 한다. 일반 사용자 게임은 기존 SVG 렌더링을 유지한다.

## Decision Summary

- 드라이아이스·눈덩이·겁쟁이 눈사람·세탁 로봇·오븐 로봇 다섯 종류를 투명 PNG로 만든다. 숲 PNG 2종의 회화적 명암과 큰 얼굴/윤곽을 참고하되 기존 캐릭터 자산을 복제하지 않는다.
- 로컬 `/__dev/maps` 미리보기와 테스트 플레이에만 새 그림을 연결한다. 숲 `forest-elevated-v1` 플래그와 혼돈 융합 보스 자산은 유지한다.

## Implementation

### I01. 원본 일러스트 자산

- Related Files:
  - `assets/monsters/jelly-snake.png`, `assets/monsters/chocolate-boar.png` :: 기존 숲 스타일 참조; read-only.
  - `assets/monsters/dry-ice-v2.png` :: 드라이아이스 단독 투명 전신; new.
  - `assets/monsters/snowball-v2.png` :: 눈덩이 단독 투명 전신; new.
  - `assets/monsters/cowardly-snowman-v2.png` :: 겁쟁이 눈사람 보스 단독 투명 전신; new.
  - `assets/monsters/washing-robot-v2.png` :: 세탁 로봇 단독 투명 전신; new.
  - `assets/monsters/oven-robot-v2.png` :: 오븐 로봇 보스 단독 투명 전신; new.

#### Details

- **Image creation**: 내장 `image_gen`을 자산당 한 번 사용하고 `transparent_background:true`를 지정한다. 기존 숲 몬스터 경로를 스타일 참조로 넣고, 새 캐릭터는 독자적인 전신 3/4 측면 포즈·굵은 눈/표정·명확한 색 구획으로 요청한다. 생성 결과를 작업 공간 위 파일명에 복사한다. 결과 이미지의 실제 투명 알파·잘린 팔다리·외곽 노이즈를 확인한다. 사용자가 명시하지 않은 기존 파일은 덮어쓰지 않는다.
- **Character art direction**: 드라이아이스는 서리 맺힌 푸른 수정 생물, 눈덩이는 눈이 뭉친 둥근 투척 괴물, 눈사람 보스는 크고 겁먹은 표정과 가시 얼음 왕관, 세탁 로봇은 황동/청록 세탁 드럼 몸체와 관절 팔, 오븐 보스는 구리 오븐 몸체·주황 화실·높은 굴뚝. 모두 60~92 월드 단위에서 읽히는 실루엣을 우선한다. 이미지 안에 글자·장면 배경·바닥 그림자를 넣지 않는다.
- **Output contract**: 각 파일 PNG, 알파 채널 포함, 전신 및 사방 여백 확보, 1:1에 가까운 캔버스. 파일이 없거나 이미지 생성이 실패하면 플레이스홀더로 완료 처리하지 않는다.

### I02. 관리자 전용 그림 선택

- Related Files:
  - `src/game/assetCatalog.js` :: `ASSETS.monsters`에 새 PNG import; modify.
  - `src/dev/createStudioSession.js` :: `createStudioScenario`가 눈·도시·혼돈 관리자 run에 독립 `studioMonsterPrototype` 값을 기록; modify.
  - `src/dev/MapStudio.jsx` :: `MonsterGroup`에 관리자 그림 플래그 전달; modify.
  - `src/components/BattleArena.jsx` :: 테스트 플레이 run의 동일 플래그 전달; modify.
  - `src/components/MonsterGroup.jsx` :: `MonsterArt`, `MonsterGroup`, `BossArmor` 조건; modify.
  - `src/styles/arena.css` :: PNG 비율과 보스 아머 중복 방지에 필요한 한정 스타일; modify.
  - `tests/studio-e2e/map-studio.spec.cjs`, `tests/studio-e2e/play-mode.spec.cjs` :: 그림 표기 및 시범판 일치; modify.

#### Signatures & Types

```typescript
type StudioMonsterPrototype = 'regional-monsters-v1' | null;
type MonsterGroupProps = { enemies: Enemy[]; placements: EnemyPlacement[];
  studioMonsterPrototype?: StudioMonsterPrototype; /* 기존 속성 유지 */ };
type MonsterArtProps = { enemy: Enemy; studioMonsterPrototype?: StudioMonsterPrototype };
```

#### Data & Schema Fields

- `run.studioMonsterPrototype:string|null`: 관리자 눈·도시·혼돈만 `'regional-monsters-v1'`; 사용자 run에는 없음. `run.studioPrototype`과 별개로 보관해 숲 고저차 기능을 덮어쓰지 않는다.
- `ASSETS.monsters`: 기존 키 보존, `dryIce`, `snowball`, `cowardlySnowman`, `washingRobot`, `ovenRobot` 새 키 추가.

#### Execution Flow / Logic

1. `createStudioScenario`에서 `area !== 'forest'`에만 `run.studioMonsterPrototype`을 지정한다. `createStudioSession`은 이 run을 그대로 clone하므로 지도와 플레이가 동일하다.
2. `MonsterArt`는 플래그가 있을 때만 5종의 새 PNG를 ID로 선택한다. 그 외에는 기존 SVG와 숲/혼돈 보스 PNG를 그대로 쓴다. 새 보스 PNG는 장식을 포함하므로 관리자 눈·도시에서는 `BossArmor`를 중복 렌더하지 않는다.
3. `MonsterGroup`의 실제 몬스터 컨테이너 크기·콜라이더·체력·투척 모션은 변경하지 않는다. `AssetImage`가 원본을 표시하며 로딩 실패 시 기존 SVG로 폴백한다.
4. 관리자 지도와 테스트 플레이에서 같은 종류의 `img`가 보이고 사용자 `/`의 눈·도시 전투는 기존 SVG를 보이는 E2E를 추가한다.

## Acceptance Criteria

- [ ] 관리자 눈 일반 적·눈 보스·도시 일반 적·도시 보스가 각기 다른 투명 일러스트로 보인다.
- [ ] 새 그림이 보스 체력 막대·피격/투척 동작·작은 몬스터 크기를 가리지 않는다.
- [ ] 관리자 지도 미리보기와 플레이가 같은 그림을 사용하고 사용자 게임·숲·혼돈 보스는 그대로다.

## Validation

- `npm.cmd run build` — 새 PNG import 성공.
- `npm.cmd run test:studio` — 관리자 그림·플레이 회귀 통과.
- `npx.cmd playwright test tests/e2e/giant-bosses.spec.cjs tests/e2e/monster-throw.spec.cjs tests/e2e/studio-exclusion.spec.cjs` — 기존 사용자 게임 회귀 통과.
- 관리자 지도 눈/도시 1·3라운드의 데스크톱 화면을 캡처해 그림 잘림·중복 장식·축소 가독성을 육안 확인한다.

## Commit Message

```text
feat(관리자시범판): 눈과 도시 몬스터 일러스트 교체

Plan: 2026-10-28-regional-monster-art-and-chaos-fusions
Phase: P01-regional-monsters
Task: T01-regional-art

- 눈·도시 일반 몬스터와 보스의 투명 일러스트 추가
- 지도와 테스트 플레이에만 새 그림 연결
```

## Progress

- [x] 구현 완료
- [x] 검증 통과: build, test:studio 27/27, 사용자 E2E 13/13
- commit: pending
