# Task: T02 CI 발사 취소 화면 검증의 탄약 기대값 갱신

## Status: done

## Goal

취소된 비행이 다음 라운드에 영향을 주지 않는 화면 테스트가 새 마법사탕 보상에 따른 10발 장전을 인정하도록 한다. 실제 발사 취소 및 보상 흐름은 유지한다.

## Evidence

- GitHub Actions 실행 `40460075615`: 브라우저 테스트 164개 중 163개 통과.
- `tests/e2e/shot-integrity.spec.cjs:78`에서 새 사탕 보상 뒤 `ammo=9`를 기대했으나 실제로 `ammo=10`.

## Implementation

### I01. 다음 라운드 탄약 검증

- Related Files:
  - `tests/e2e/shot-integrity.spec.cjs` :: `a cancelled hidden flight cannot revive when a fresh round starts after a real clearing shot`; modify
- **Model & Schema Fields**: `RunState.weapons: Weapon[]`, `RunState.maxAmmo: number`, `RunState.ammo: number`. 기존 필드와 타입 변경 없음.
- **Logic**: 보상 뒤 라운드 2가 되면 별도 보유 사탕 2개에 따른 `maxAmmo=10`과 `ammo=maxAmmo`를 검증한다. 8초가 지나도 취소된 발사가 새 라운드를 바꾸지 않는 기존 상태 동일성 검증을 유지한다.

## Validation

- `npx.cmd playwright test tests/e2e/shot-integrity.spec.cjs --grep "a cancelled hidden flight"` — 핵심 화면 경로.
- `npm.cmd test` — 단위·API 회귀 검증.
- `git diff --check` — 공백 검사.
- GitHub Actions 전체 브라우저 검증과 Azure 업로드 결과 확인.

## Commit Message

```text
test(전투): 보상 뒤 발사 취소 검증을 새 탄약 규칙에 맞춤

Plan: 2026-10-27-reward-candy-ammo-growth
Phase: P01-ammo
Task: T02-ci-shot-integrity-ammo

- 새 사탕 보상 뒤 10발 장전과 취소된 발사의 상태 불변성을 확인한다.
- 원격 브라우저 테스트의 고정 9발 기대값을 제거한다.
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `test(전투): 보상 뒤 발사 취소 검증을 새 탄약 규칙에 맞춤`
