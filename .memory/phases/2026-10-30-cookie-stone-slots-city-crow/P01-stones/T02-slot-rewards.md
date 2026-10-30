# Task: T02 라운드·야영지·혼돈 슬롯 보상

## Status: pending

## Goal
전투 후 3×3 슬롯을 한 번씩 돌리고 결과에 따라 전용 또는 기본 스톤을 영구 지급한다. 야영지는 스톤 2회, 혼돈은 스톤·소모품 각 1회다.

## Decision Summary
- 기호 4종, 9칸 독립 균등 추첨. 당첨선은 가로 3개와 대각선 2개, 세로는 제외. 여러 선이어도 한 번만 지급.
- 일반 지역은 기존 소모품 1개 선택 유지, 야영지 회복 또는 추가 스톤 슬롯 2회, 혼돈 소모품 슬롯 실패 시 지급 없음.
- 최종 혼돈 보스 뒤에는 슬롯 없음. 기존 적 체력·수 유지.

## Implementation

### I01. 순수 슬롯 추첨과 영구 보상
- Related Files:
  - `assets/js/battle-engine.js` :: `drawRewardChoices`, `advanceRound`, `chooseCampReward`, `enterRound`, 신규 `spinRewardSlot`, `finishCampSlot` — 보상 상태·원자적 지급; modify.
- Signatures & Types: `spinRewardSlot(state, kind:'stone'|'consumable', rng:()=>number): {accepted:boolean,reason?:string,result?:SlotResult}`. `finishCampSlot(state,{rng,now}): {accepted:boolean,area?:string,round?:number}`.
- Data & Schema Fields: `state.slotReward: null | {context:'round'|'camp',stoneSpinsRemaining:number,consumableSpinsRemaining:number,stoneResults:SlotResult[],consumableResults:SlotResult[]}`. `SlotResult={symbols:string[9],winningLine:number[3]|null,prizeId:string|null,instanceId?:string}`. 당첨선 순서 `[0,1,2]`, `[3,4,5]`, `[6,7,8]`, `[0,4,8]`, `[2,4,6]`.
- Execution Flow / Logic: 스톤 슬롯의 네 기호는 각각 1/4 확률. 일치선이 있으면 선택 쿠키의 전용 C 스톤 1개, 없으면 기본 C 스톤 1개를 새 `instanceId`로 보유 목록에 넣는다. 합성 질문은 띄우지 않는다. 혼돈 소모품 슬롯은 보유량 3 미만인 소모품 종류만 동일 확률로 추첨한다. 일치선이 있으면 그 종류 1개, 실패하면 없음. 모든 소모품이 가득 찼으면 소비 없이 완료로 표시한다. 중복 클릭·잘못된 화면·이미 끝난 스핀은 지급 없이 거부한다. `maxAmmo`/`ammo`는 현재 전투 중 바꾸지 않고 다음 `enterRound`에서 새 덱 길이로 설정한다.
- State Transition: 일반 지역 라운드 클리어 시 `context:'round'`, 스톤 1회와 소모품 선택을 준비한다. 도시 보스 후에도 동일하고 결과 뒤 혼돈에서 사용할 수 있다. 혼돈 1·2라운드는 스톤/소모품 각 1회 슬롯을 준비한다. 야영지에서 무기 대신 추가 스핀을 선택하면 `context:'camp'`, 스톤 2회; 완료 후 `finishCampSlot`로 다음 지역 진입. 회복 선택은 바로 다음 지역 진입.
- Error Handling: 스핀 도중 새로고침 시 현재 게임이 리셋되는 기존 정책 유지. 잘못된 난수·보상 재진입은 기존 엔진 거부 형식 사용.

### I02. 화면 이동과 결과 상태
- Related Files:
  - `src/game/gameSession.js` :: `finishCombatRouting`, `selectReward`, `continueAfterReward`, `chooseCampReward`, 신규 `spinRewardSlot`/`continueAfterCampSlot` — 보상 화면 순서; modify.
  - `src/App.jsx` :: `camp-slot` 화면 이름 등록; modify.
  - `src/components/RewardScreen.jsx` :: 기존 사탕 선택 영역을 1회 슬롯으로 바꾸고 소모품 선택/혼돈 소모품 슬롯 표시; modify.
  - `src/components/CampScreen.jsx` :: 무기 선택을 추가 슬롯 2회로 안내; modify.
  - `src/components/CampSlotScreen.jsx` :: 야영지 슬롯 2회를 보여주고 완료 후 다음 지역 버튼 제공; new.
  - `src/components/SlotMachine.jsx` :: 3×3 칸·가로/대각선 당첨선·결과·한 번만 누를 수 있는 버튼; new.
  - `src/styles/game.css` :: 슬롯 화면의 데스크톱·모바일 배치와 결과 상태; modify.
- Signatures & Types: 세션 액션은 기존 `{accepted:boolean,reason?:string}` 반환 계약 유지. 슬롯 스핀은 예약된 라운드에서만 허용.
- Data & Schema Fields: 기존 `state.run.slotReward`를 화면에서 읽는다. 별도 클라이언트 난수나 숨은 지급 상태를 만들지 않는다. `SlotMachine` props는 `{kind,remaining,results,onSpin,disabled}`로 둔다.
- Execution Flow / Logic: 전투 종료 연출이 끝난 뒤 보상 화면에 들어간다. 스톤 스핀 완료와 소모품 선택(혼돈은 소모품 스핀 완료) 없이는 다음으로 넘어가지 않는다. 야영지 추가 스핀 2회를 끝내야 다음 지역으로 간다. 결과를 누구나 읽을 수 있는 텍스트와 하이라이트로 보여준다. 화면 애니메이션은 엔진 결과를 다시 뽑지 않는다. 모든 결과는 한 번만 확정한다.
- Error Handling: 이전 라운드의 지연된 입력은 보상/전투 상태를 바꾸지 않는다.

### I03. 검증
- Related Files:
  - `tests/slot-rewards.test.mjs` :: 3×3 줄 판정·한 번 지급·영구 재장전·혼돈·야영지; new.
  - `tests/game-session.test.mjs` :: 보상 라우팅의 새 계약을 최소한으로 수정; modify.
- Scenarios: 전용 당첨/기본 실패, 세로만 맞은 보드 실패, 여러 당첨선도 1개, 보유량 꽉 찬 소모품, 연속 스핀 거부, 다음 라운드 3→4→5발, 도시 마지막 보상과 혼돈 최종 제외.

## Acceptance Criteria
- [ ] 슬롯 한 번에 정확히 스톤 1개만 영구 지급된다.
- [ ] 메인/혼돈/야영지 경로가 각각 확정한 보상 규칙을 따른다.
- [ ] 재시도·중복 입력으로 보상을 추가로 얻지 못한다.

## Validation
- `node --test tests/slot-rewards.test.mjs tests/game-session.test.mjs`
- `npm run build`

## Commit Message
```text
feat(rewards): 라운드와 야영지에 스톤 슬롯 보상 적용

Plan: 2026-10-30-cookie-stone-slots-city-crow
Phase: P01-stones
Task: T02-slot-rewards

- 3×3 가로·대각선 당첨으로 전용 스톤 지급
- 야영지 추가 스핀과 혼돈 소모품 슬롯 연결
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
