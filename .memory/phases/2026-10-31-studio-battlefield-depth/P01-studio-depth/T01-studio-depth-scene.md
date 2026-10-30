# Task: T01 관리자 전투 2.5D 장면

## Status: done

## Goal

로컬 관리자 테스트 플레이에서 숲·눈·도시·혼돈 모두 길의 두께와 물체의 접지가 드러나도록 한다. 기존 일러스트, 시차, 전투 좌표와 일반 게임 화면을 유지한다.

## Decision Summary

- 원본 일러스트를 보존하는 2.5D 오버레이를 테스트 플레이에만 사용한다.
- 지도 미리보기와 일반 사용자 게임은 오버레이 없이 유지한다.
- 네 지역의 색은 기존 팔레트에 맞추고 도시 원경과 조준선은 가리지 않는다.

## Implementation

### I01. 관리자 전용 장면과 플래그

- Related Files:
  - `src/dev/createStudioSession.js` :: `createStudioScenario` — `run.studioDepthPreview: boolean = true` 추가; modify.
  - `src/components/BattleArena.jsx` :: `BattleArena` — `run.studioDepthPreview === true`일 때 월드 내부에서 배경 위, 장애물·투사체·몬스터 아래에 입체 장식 배치; modify.
  - `src/components/StudioDepthScene.jsx` :: `StudioDepthScene` — 새 시각 전용 SVG; new.
  - `src/dev/mapStudio.css` :: `.studio-depth-scene` — 전투 월드용 절대 위치·z-index·pointer-events 스타일; modify.

#### Signatures & Types

```ts
type StudioDepthSceneProps = {
  area: 'forest' | 'snow' | 'city' | 'chaos';
  layout: {
    width: number; height: number; groundY: number;
    player: { x: number; y: number; width: number; height: number };
    launcher: { x: number; y: number; width: number; height: number };
    launcherPlatform?: { x: number; y: number; width: number; height: number } | null;
    obstacles: Array<{ id: string; x: number; y: number; width: number; height: number; supportsEnemyId?: string }>;
    enemies: Array<{ id: string; x: number; y: number; size: number; supportObstacleId?: string; patrol?: object }>;
  };
  toppledObstacleIds?: string[];
};
function StudioDepthScene(props: StudioDepthSceneProps): JSX.Element;
```

#### Data & Schema Fields

- `run.studioDepthPreview`: optional boolean. `true` only for `createStudioScenario`; absent in ordinary `BattleEngine.createRunState` output.
- `layout` is read-only presentation input. No persistence or gameplay schema change.

#### Execution Flow / Logic

1. Before rendering, require the studio flag; avoid changing `BattlefieldBackdrop`/`SceneArt`/`ForestLayerContent` so the preview and public game remain untouched.
2. Use `layout.width`, `layout.height`, and `layout.groundY` in the SVG `viewBox`. Draw a subtle route upper edge and front/side face below the combat surface (near y=900), with region palette gradients and small detail marks. Keep the scenic middle above the route visible.
3. Draw soft ground shadows for player, launcher, obstacle bases, and ground enemies at their actual world x positions. For elevated enemies draw a smaller support-top shadow and faint ground projection; for a flying patrol do not pretend it is standing on the road.
4. For launcher platform and supported obstacles, add narrow top rim/side accents aligned to existing rectangles. Do not duplicate hit boxes or move any sprite.
5. Avoid opaque coverage over existing background artwork. The layer has `pointer-events:none`, `aria-hidden:true` and sits below actors, trajectory, HUD. Skip or dim shadows under fallen obstacles via `toppledObstacleIds`.
6. No animation is required; static depth should remain available in reduced-motion mode. Unknown area or missing optional fields should not throw in normal valid layout input.

### I02. Focused verification

- Related Files:
  - `tests/studio-session.test.mjs` :: existing studio session contract — amend only if a meaningful flag isolation check is needed; modify optional.
  - `tests/studio-e2e/` :: existing local studio test harness — use manually for visual inspection, new test only if it checks admin/public isolation; read-only unless needed.

#### Details

- Confirm the flag is true for studio runs, absent for ordinary runs, and does not enter layout generation or shot geometry.
- In a browser inspect forest/snow/city/chaos administrator test play, city skyline visibility, elevated target, launcher platform, and aim overlay. Verify the studio map preview remains flat and ordinary game contains no studio depth SVG.

## Acceptance Criteria

- [x] Four studio test play regions show the same coherent top/side/shadow depth treatment without hiding the original panorama.
- [x] Ground, elevated enemies, launcher, and obstacles have visual contact points consistent with their actual coordinates.
- [x] Map preview/public game have no studio depth markup; no aim or collision rules change.
- [x] Local build and focused studio session validation pass.

## Validation

- `node --test tests/studio-session.test.mjs` — studio session and normal-run isolation.
- `npm run build` — React/Vite production compilation.
- Local browser review at `/__dev/maps` — four test play areas, public game isolation, and screenshot inspection.

## Commit Message

```text
feat(studio): 네 지역 전투 지도에 입체 길과 접지 그림자 추가

Plan: 2026-10-31-studio-battlefield-depth
Phase: P01-studio-depth
Task: T01-studio-depth-scene

- 관리자 테스트 플레이에만 지역별 2.5D 장식 연결
- 길 단면과 높낮이별 접지 그림자 표시
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see Git history for `feat(studio): 네 지역 전투 지도에 입체 길과 접지 그림자 추가`
