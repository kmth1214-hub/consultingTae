# Task: T01 관리자 시작 스톤 등급 선택

## Status: done

## Goal
지도 스튜디오와 관리자 테스트 플레이에서 C·B·A 등급을 선택하고 해당 등급의 전용·기본 스톤으로 전투를 시작한다.

## Decision Summary
- 관리자 시범전의 시작 스톤 3개에 선택 등급을 적용한다. 선택 등급은 배치를 바꾸거나 재시작해도 유지한다.
- 일반 플레이의 스톤 획득·등급·해금은 변경하지 않는다.

## Implementation
### I01. 시범전 모델
- Related Files: `src/dev/createStudioSession.js` :: `createStudioScenario`, `createStudioSession`.
- Signature: `createStudioScenario({area:string,round:number,characterId:string,bossSpecial:boolean,seed:number,weaponGrade?:'C'|'B'|'A'})`.
- Data schema: `config.weaponGrade` 기본값 `'C'`, 허용값 `['C','B','A']`; `run.weapons[].grade` 모두 선택한 값; `run.weaponQueue`와 `run.currentWeaponId` 기존 규칙을 유지.
- Execution: 입력 검증에 등급을 추가하고, 생성된 관리자 run의 시작 스톤 등급을 설정한다. 일반 `createRunState`는 변경하지 않는다. 잘못된 등급은 `RangeError`.
### I02. 관리자 컨트롤
- Related Files: `src/dev/MapStudio.jsx` :: `MapStudio`, `launchPlay`; `src/dev/StudioPlay.jsx` :: `StudioPlay`.
- Data schema: `weaponGrade` React state 및 `play/draft` 구성에 추가.
- Execution: 지도 스튜디오 전투 테스트와 테스트 플레이 설정에 접근 가능한 `select`를 표시한다. 시작·선택 전투 재시작·같은 배치 재시작·새 배치 재시작 시 선택값을 보존하고 현재 등급을 상태 문구에 표시한다.
### I03. 검증
- Related Files: `tests/studio-session.test.mjs` :: 시범전 등급 테스트; `tests/studio-e2e/map-studio.spec.cjs` :: 관리자 선택 흐름 테스트.
- Cases: 기본 C, B/A 선택 시 전용·기본 스톤 3개 반영, 무효 등급 거절, 재시작 보존, 일반 게임의 기본 C 유지.

## Acceptance Criteria
- [x] 관리자 화면에서 C·B·A를 선택할 수 있다.
- [x] 선택한 등급이 실제 장전 스톤과 피해 계산에 적용된다.
- [x] 관리자 설정 외 일반 게임의 기본 등급은 유지된다.

## Validation
- `node --test tests/studio-session.test.mjs`
- `npm.cmd run build`

## Commit Message
```text
feat(studio): 관리자 전투에 시작 스톤 등급 선택 추가

Plan: 2026-10-31-studio-weapon-grade-city-monsters
Phase: P01-studio-combat
Task: T01-weapon-grade

- 관리자 지도와 테스트 플레이에서 C·B·A 선택
- 선택한 등급의 시작 스톤으로 전투 재시작
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
