# Plan: Forest Layered Background

## Goal
숲 전투를 옆에서 보는 독립 이미지 레이어로 재구성한다. 먼 산과 숲, 중간 나무·과자집·폭포, 가까운 풀과 가지, 수평 흙길이 서로 구분되며 기존 카메라 이동에 시차 효과가 적용된다. 전투 중 안개·나뭇잎·폭포가 잔잔하게 움직인다. 적·발사대·조준선은 읽기 쉬워야 하며 다른 지역과 전투 동작은 유지한다.

## Source Decisions
- [Confirmed decisions](../decisions/2026-10-12-forest-layered-background.md)
- 기존 숲 PNG는 참고 원본으로 보존하고 화면에서 사용하는 방식만 교체한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 숲 장면 제작, 카메라 시차, 환경 연출 | [P01](../phases/2026-10-12-forest-layered-background/P01-forest-scene/phase.md) |

## Execution Order
사용자 후속 요청(2026-10-12): T01 뒤에 T01R01을 삽입하여 원본 기반 길목 이미지, 중경과 전경 사이의 경로/배우 배치, 더 넓은 숲과 긴 투석기-적 거리를 구현한다. 기존 world-size/actor-position 보존 조건은 준비된 숲에서만 갱신한다. 다른 지역은 유지한다.
1. T01: 별도 PNG 세 장과 정적인 숲 무대·흙길. 독립적으로 화면 확인 가능한 결과.
2. T02: 기존 카메라를 관찰하는 장식 레이어 시차. 전투 좌표는 그대로 유지.
3. T03: 환경 연출, 동작 중지 조건, 전체 화면·작은 화면·조준 회귀 검증.

## Validation Strategy
Node로 인라인 JavaScript 문법과 PNG 파일을 검사한다. `node`는 현재 환경에 설치되어 있다. 패키지 매니저 설정이나 기존 자동화 테스트는 없다. 실제 카메라·그림 품질·조준 검증은 HTTP로 제공한 페이지의 브라우저에서 실시하고 결과를 Task 문서에 기록한다. 로컬 파일 URL 검증 실패를 방지하기 위해 `npx --yes http-server . -a 127.0.0.1 -p 4173 -c-1`를 사용한다. 서버는 작업 종료 시 해당 프로세스만 중지한다. 스크린샷은 `.memory/validation/2026-10-12-forest-layered-background/`에 저장한다. 자동 구문 검사만으로 시각 검증을 통과 처리하지 않는다.

## Boundaries and Existing State
- 구현 대상은 `cookie-roguelike-mockup.html`과 `assets/maps/forest-layers/` 신규 이미지다. `.bonus-field`와 다른 지역 원본을 수정하지 않는다.
- 현재 Git 상태에서 HTML이 수정 상태지만 `git diff --stat`은 비어 있다. 실행 전에 차이와 줄바꿈 상태를 확인하고 사용자의 기존 수정을 보존한다. 계획 단계에서는 HTML을 수정하지 않는다.
- 이전 current 포인터는 완료된 area-background-depth 작업을 가리키고 있었다. 이번 계획의 T01로 이동하며 과거 문서는 보존한다.
- API, DB, 충돌 모델, 게임 규칙 변경 및 새 프레임워크는 필요 없다.
- 기존 `showScreen`은 reward 등 gameplay 화면으로 나갈 때 intro 취소가 누락될 수 있다. 이번 변경의 카메라/환경 수명 관리에 필요한 battle 이탈 취소만 포함한다. 다른 메뉴·전투 기능으로 범위를 늘리지 않는다.

## Completion
T01, T01R01, T02, T03 네 Task의 시각·동작 검증, 개별 커밋, phase 진행률 및 current 포인터 갱신이 모두 끝나면 완료한다. 첫 버전 확인 후 다른 지역 확장은 별도 인터뷰/계획으로 진행한다.
