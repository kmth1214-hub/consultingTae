# Phase: P02 관리자 화면 표시와 통합 검증

## Goal

관리자 지도 미리보기에 선택한 라운드의 실제 적·발사대·쿠키·받침을 보여주고 같은 배치로 테스트한다. 낙하·바운스·파동·분기 구슬을 전투 화면에 표시한 뒤 기존 사용자 화면과의 격리를 검증한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 동일 seed 지도 미리보기, 비행 시각화, HUD, E2E·프로덕션 회귀 | [T01](./T01-studio-preview-playback.md) |

## Progress

- done: 1/1 (complete)

## Phase exit

미리보기와 재실행 배치가 같은 seed로 일치하고, 새 배치만 변경된다. 관리자 시범판에서 실제 효과가 보이며, 일반 사용자 화면·Azure용 빌드에 개발 경로 및 새 전투 규칙이 나타나지 않는다.
