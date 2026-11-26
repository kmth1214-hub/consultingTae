# Plan: 눈·도시 전투 개선과 스톤 보관함

## Goal

눈 일반전 3·4마리와 이동 눈덩이, 도시 일반전 5·6마리와 범위 상자 연쇄·보스 환기구를 구현한다. 매 발사 전 획득순 보관함에서 기본·전용 스톤을 자유롭게 선택하고 실제 표시와 충돌·탄수·피해를 일치시킨다.

## Basis

- 확정 설계는 [결정 문서](../decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md)를 따른다.
- 사용자 조작·전투는 일반 게임과 로컬 관리자 테스트 플레이에 함께 적용한다.
- 단일 Phase 안에서 보관함 상태→UI→전장 구성→도시 효과→보스→전용 피드백→통합 순서로 실행한다. 모든 Task는 앞 Task 완료를 전제로 하며 자기 파일에 필요한 계약을 반복 명시한다.
- 계획 단계 산출물은 `.memory/` 문서다. 구현·커밋·검증은 후속 실행 단계에 수행한다.
- 개발 중에는 Task별 지정 검증과 빌드를 사용한다. 전체 테스트는 배포 때 실행한다. Azure 배포·점검 모드 변경·DB/인증 변경은 후속 배포 요청에서 처리한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 지역 전투와 보관함의 공통 발사 규칙·표시·검증 | [P01](../phases/2026-11-26-snow-city-battle-pacing-and-stone-rack/P01-regional-combat-and-stone-rack/phase.md) |

## Task 순서

- T01-stone-queue-and-loading — 획득순 탄창과 장전 상태
- T02-stone-rack-interface — 세로 보관함과 A·D·Space 조작
- T03-snow-city-encounters — 눈·도시 적 수와 이동 배치
- T04-city-blast-chain — 도시 상자의 범위 폭발과 연쇄
- T05-oven-vent-weakpoint — 오븐 환기구 명중과 과열 약화
- T06-signature-stone-feedback — 가속·회전 표시와 수동 폭발 보상
- T07-integration-and-rule-sync — 전투 흐름 통합과 규칙 동기화

## 별도 검토할 사항

- 도시 상자 포커스 시 폭발 반경 표시 아이디어는 구현 Task에 넣지 않았다. 추가 포함 여부는 사용자가 정한다.
- 기존 전체 테스트는 일부 적 수와 무작위 장전 순서에 의존한다. 변경된 계약의 테스트 갱신은 T07에서 다루고 실제 명중 경로의 검증은 유지한다.
