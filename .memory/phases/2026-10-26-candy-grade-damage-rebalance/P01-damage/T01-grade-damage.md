# Task: T01 Grade Damage

## Status: done

## Goal
B 최대6/A 최대10 및 중간 피해 상향이 실제 발사 피해와 표시 범위에 동일하게 적용된다.

## Decision Summary
- C:[0,1,2,3,4], B:[1,2,3,5,6], A:[2,4,6,8,10]. 확률:[.02,.40,.40,.10,.08].
- C만 라운드0피해2회 이후0을1로 치환. 점수C1/B2/A4, 창2~5, 불공2배, 능력+1, 적 체력 유지.

## Implementation
### I01. 추첨표
- Related Files:
  - `assets/js/battle-engine.js` :: `rollWeaponDamage`, `getWeaponDamageRange` — modify
  - `src/game/candyPresentation.js` :: `getCandyDetails` — read-only (공통 범위 함수 사용 확인)
#### Details
```typescript
const GRADE_DAMAGE:Readonly<Record<'C'|'B'|'A',ReadonlyArray<number>>>;
rollWeaponDamage(rng:()=>number,grade:string,zeroRollsThisRound:number):number;
getWeaponDamageRange(grade:string,zeroRollsThisRound:number):{min:number,max:number};
```
- 등급 배열을 Object.freeze로 정의. 기존 rng 함수 검증/대문자 정규화/알 수 없는 등급 RangeError 유지.
- 기존 누적 확률로 index0~4를 한 번 추첨, 반환은 등급 배열[index]. normalizedGrade C && index0 && zeroRolls>=2일 때만1 반환.
- GRADE_MULTIPLIER는 점수 함수용으로 유지. resolveProjectile의 실제0추첨 카운트, grade 선택, 불공/마법사/바람궁수/창 로직 변경 없음.
- getWeaponDamageRange는 동일 함수 양끝 표본을 사용하므로 중복 표를 만들지 않는다. HUD는 새 범위를 자동 참조.

### I02. 회귀 검증
- Related Files:
  - `tests/grade-damage.test.mjs` — new
  - `tests/candy-presentation.test.mjs` — expected B max6/A max10 update
  - 기존 tests의 B/A 고정 피해 기대값 — 전체 테스트가 실패하면 새 표에 맞는 값만 수정
#### Details
- 각 구간 내부와 경계 .02/.42/.82/.92, rng1/음수 clamp를 모든 등급에 검증. C0보호와 B/A0기록 독립, grade 소문자/오류 검증.
- 실제 resolveProjectile 사용: A최대10/불공20, 마법사+바람궁수+불공24, 유도 없이 장애물4개최대3 + A마법사불공22 =>34 및 fused HP29 처치 우선. 마지막 사례는 계산 상한 fixture임을 명시하며 실제 궤적이 가능하다고 주장하지 않는다.
- 창 피해2~5 불변, 점수C1/B2/A4 유지, getCandyDetails 범위/불공 안내 일치.

## Acceptance Criteria
- [x] 등급표/확률/C보호/범위 일치
- [x] 능력·창·점수 회귀 없음
- [x] 전체 단위 및 build 통과

## Validation
- `node --test tests/grade-damage.test.mjs tests/candy-presentation.test.mjs`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`

## Commit Message
```text
feat(사탕): B A 등급 피해와 중간 추첨값 상향

Plan: 2026-10-26-candy-grade-damage-rebalance
Phase: P01-damage
Task: T01-grade-damage

- B 1·2·3·5·6과 A 2·4·6·8·10 피해표 적용
- C의 0피해 보호와 점수 및 창 피해 유지
- HUD와 능력 조합 및 융합 보스 처치 우선 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 단위183/build 통과, 로그 tmp/grade-damage-unit.log 및 tmp/grade-damage-build.log
- commit: pending
- 이전 자동 승인 검토 제한 보존. 사용자 요청에 따라 다음 버그 진단으로 진행.
- 메시지 `tmp/T01-grade-damage-commit.txt`. 최종 통합 unit195 및 실제 B/A HUD·불공 피해 브라우저2개 통과. Grade 점수 배율 유지 확인.
