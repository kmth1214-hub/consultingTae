# Plan: 관리자 조준 전체 보기와 직전 발사 가이드

## Goal

로컬 `/__dev/maps` 테스트 플레이에서 조준 중 V를 누르면 전장 전체를 보고, 직전 발사의 실제 궤적 80%와 타격·착지 지점을 다음 조준의 참고선으로 확인한다. 일반 게임과 Azure에는 적용하지 않는다.

## Decisions

- [확정 결정](../decisions/2026-11-11-studio-aim-overview-last-shot-guide.md)
- Space는 전용 스톤 능력 키로 유지하고 V는 누르는 동안만 작동한다.
- 현재 발사의 궤적 미리보기 길이는 유지한다. 직전 발사만 별도 스타일로 표시한다.
- 로컬에서는 변경 범위만 검증한다. 전체 단위·브라우저 회귀 검증은 배포 시 실행한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | V 조망 전환과 직전 발사 가이드 | [P01](../phases/2026-11-11-studio-aim-overview-last-shot-guide/P01-studio-aim/phase.md) |
