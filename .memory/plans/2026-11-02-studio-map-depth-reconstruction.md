# Plan: 관리자 맵 2.5D 재구성

## Goal

로컬 `/__dev/maps`의 숲·눈·도시·혼돈 미리보기와 테스트 플레이에서 동일한 새 2.5D 맵을 비교·검토한다. 지역별 색감·랜드마크와 옆모습 구도를 유지하면서 길·중경·전경 자체를 다시 제작한다. 일반 게임, 3600×1200 전투 좌표, 지면 y=900, 조준·충돌·배치, Azure 배포 화면은 유지한다.

## Decisions and boundaries

- 근거: [확정 결정](../decisions/2026-11-02-studio-map-depth-reconstruction.md).
- 4개 지역 × 3개 새 레이어 × 동·서 2패널 = 투명 PNG 24개. 원본 자산은 덮어쓰지 않는다.
- 신규 자산과 렌더러는 `src/dev`를 통해서만 참조한다. 일반 게임 자산 목록 `src/game/assetCatalog.js`에는 추가하지 않는다.
- 기존 테스트 플레이의 입체 장식·원본 비교 버튼을 새 맵 전체 비교로 바꾸고, 미리보기에도 같은 비교 상태를 제공한다.
- 보스 3번째 타격 이후 회피 장면은 [별도 아이디어](../ideas/2026-11-02-boss-third-hit-dodge-transition.md)이며 이 계획에 포함하지 않는다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 네 지역 자산 제작, 개발 전용 맵 렌더링, 미리보기·테스트 플레이 연결과 검증 | [P01](../phases/2026-11-02-studio-map-depth-reconstruction/P01-studio-map-depth/phase.md) |

## Delivery sequence

1. T01은 새 자산·매니페스트·픽셀 검증기를 완성한다. 렌더링 컴포넌트를 아직 변경하지 않아 독립 검증할 수 있다.
2. T02는 그 자산을 쓰는 하나의 개발 전용 장면을 만들고 관리자 미리보기에서 원본과 비교한다.
3. T03은 같은 장면을 관리자 테스트 플레이에 연결하고 일반 게임·배포 빌드 격리까지 확인한다.
