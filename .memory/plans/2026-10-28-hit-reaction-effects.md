# Plan: 관리자 숲 시범판 피격 반응 이펙트

## Goal

로컬 관리자 숲 시범판에서 사탕에 맞은 몬스터와 적 공격에 맞은 쿠키의 반응을 명확히 보여준다. 처치된 몬스터의 마지막 충격, 양수 피해·방어·빗나감의 구별, 애니메이션 감소 설정을 확인한다. 전투 규칙과 일반 사용자 게임은 유지한다.

## Decision

[피격 반응 결정](../decisions/2026-10-28-hit-reaction-effects.md)을 따른다. 새 이펙트의 진입 조건은 `run.studioPrototype === 'forest-elevated-v1' && run.area === 'forest'`이다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` ✅ | 몬스터·쿠키 피격 표시, 접근성, 관리자/사용자 회귀 | [P01](../phases/2026-10-28-hit-reaction-effects/P01-hit-visuals/phase.md) |

## Completion criteria

- 양수 피해 때만 몬스터가 움찔하고 파편·고리·기존 숫자를 표시한다. 처치 타격도 잠깐 보인 후 사라진다.
- 쿠키는 양수 피해 때 부스러기·섬광, 방어 때 푸른 파동을 표시한다. 빗나감·피해 0은 새 피격 연출이 없다.
- 연출은 체력·점수·충돌 시간·카메라·조준에 영향을 주지 않는다. 사용자 게임과 Azure용 빌드에는 새 연출이 나오지 않는다.
- 관리자 E2E, 관련 사용자 E2E, 단위 테스트와 빌드가 통과한다.

## Execution order

`P01-T01` 한 Task로 구현·검증·한국어 커밋 후 `.memory/current.md`를 완료로 전진한다.

## Regression traps

- `MonsterGroup`은 사망한 적을 즉시 반환하므로 처치 이펙트가 사라진다. `shotReview`가 보이는 동안만 마지막 피격 대상을 렌더하고 CSS 종료 상태로 숨긴다.
- `lastEvent`는 다음 조준에도 남을 수 있다. 효과는 현재 `shotReview` 또는 `response.stage === 'impact'`에 묶고 이벤트 ID로 애니메이션을 재시작한다.
- `BattleArena`는 관리자·사용자 게임에 공유된다. 새 속성은 명시적 시범판 조건에서만 전달한다.
