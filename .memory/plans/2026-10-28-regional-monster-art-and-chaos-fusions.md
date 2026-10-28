# Plan: 눈·도시 몬스터 일러스트와 혼돈 융합체

## Goal

로컬 관리자 지도 스튜디오에서 눈·도시의 일반 몬스터 3종과 보스 2종을 숲 PNG와 비슷한 밀도의 투명 일러스트로 보여준다. 혼돈 1·2라운드는 세 지역 특징을 합친 일반 몬스터 3종을 각 1마리 이상 등장시키고, 예측 가능한 교대 공격과 방어 가능한 한 발짜리 조준 교란을 검토할 수 있게 한다. 사용자 게임·Azure 배포·혼돈 보스는 그대로 둔다.

## Decision

[지역 몬스터·혼돈 융합체 결정](../decisions/2026-10-28-regional-monster-art-and-chaos-fusions.md)을 따른다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 지역 그림, 혼돈 적 명단·공격, 조준 교란 및 관리자 검증 | [P01](../phases/2026-10-28-regional-monster-art-and-chaos-fusions/P01-regional-monsters/phase.md) |

## Execution order

`T01-regional-art` → `T02-chaos-fusions` → `T03-aim-disruptions`. 각 Task는 구현·독립 검증·한국어 커밋 후 포인터를 전진한다.

## Completion criteria

- 관리자 지도 미리보기와 테스트 플레이에서 눈·도시 일반/보스 5종 및 혼돈 융합체 3종이 개별 일러스트로 식별된다. 일반 사용자 게임은 기존 그림을 유지한다.
- 혼돈 1·2라운드의 9~13마리에 새 3종이 각 1마리 이상 포함된다. 시드 재현, 일반 체력 4·공격 피해 1~8·반격 1회가 유지된다.
- 두 공격은 고정 첫 기술 후 교대한다. 두 번째 기술의 실제 피격만 다음 한 발에 정해진 교란을 남긴다. 방어·빗나감·취소에서는 상태가 잘못 적용되거나 소모되지 않는다.
- 조준 표시와 실제 발사 경로·착지·굴림이 같은 교란 파라미터를 사용한다. 혼돈 3라운드 융합 보스·분리전, 사용자 게임·점수·리더보드는 회귀하지 않는다.

## Regression traps

- `MonsterGroup.jsx`는 관리자/사용자 공용이고 `BossArmor`를 SVG 위에 덧그린다. 새 보스 PNG가 장식을 포함하면 관리자에서 기존 오버레이를 빼야 한다.
- `createStudioScenario`와 `createStudioSession`이 동일 시드를 써서 미리보기와 테스트 전투를 일치시킨다. 혼돈 적 명단은 둘 중 한 곳에서만 바꾸면 불일치한다.
- `BattleArena.makeSolution`과 `preparePhysicalFlight`는 같은 `planShot`을 쓰지만 별도 호출이다. 교란 옵션을 양쪽에 전달해야 보이는 궤적과 실제 충돌이 맞는다.
- 관리자 숲에는 이미 `forest-elevated-v1` 조건이 있다. 새 지역 시범판 표시를 이 값을 덮어쓰는 방식으로 만들면 기존 고저차·사탕 능력이 사라질 수 있다.

## Out of scope observation

- 현재 지역 그림과 혼돈 적에 관한 범위 밖의 기존 결함은 확인되지 않았다. 사용자 게임으로 승격할 때에는 그림 라이선스·자산 크기·모바일 가독성을 다시 검토한다.
