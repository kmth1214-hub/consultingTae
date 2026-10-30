# Task: T04 도시 태엽 까마귀 그림과 공중 배치

## Status: pending

## Goal
도시 일반전의 세탁 로봇 두 마리를 태엽 까마귀로 바꾸고, 공중에서도 즉시 식별되는 그림과 배치를 제공한다.

## Decision Summary
- 도시 1·2라운드에서 각각 로봇 두 마리를 대체한다. 전체 적 수, 체력 4, 기본 공격 피해 범위와 보스는 유지한다.
- 검은 깃털, 황동 기어, 붉은 눈의 동화풍 그림을 사용한다. 지상 적·받침과 겹치지 않는 공중 높이에 둔다.

## Implementation

### I01. 몬스터 데이터
- Related Files:
  - `assets/js/battle-engine.js` :: `createEnemies` — 도시 일반전 로봇 목록의 정확히 2개를 `clockwork-crow`로 대체; modify.
  - `src/game/gameData.js` :: `MONSTER_NAMES` — `clockwork-crow:'태엽 까마귀'`; modify.
  - `src/game/assetCatalog.js` :: `ASSETS.monsters` — 까마귀 PNG 경로 추가; modify.
- Signatures & Types: 기존 Enemy `{id:string,kind:string,hp:number,maxHp:number,alive:boolean,size:number,isBoss:boolean}` 형식을 유지한다. 신규 kind만 추가한다.
- Execution Flow / Logic: 도시 라운드 1,2는 현재 총 적 수를 유지하며 정확히 두 `washing-robot`을 `clockwork-crow`로 대체한다. 보스 라운드에는 추가하지 않는다. 기존 적 공격 패턴/피해는 T05에서 연결한다.

### I02. 그림과 배치
- Related Files:
  - `assets/monsters/clockwork-crow.png` :: 투명 배경 까마귀 아트; new.
  - `src/components/MonsterGroup.jsx` :: `REGIONAL_MONSTER_ART`, `MonsterArt` — 까마귀 PNG 렌더링; modify.
  - `src/game/battlefieldModel.js` :: `buildBattlefieldLayout`/enemy placement — 까마귀는 공중 높이와 분리된 x 슬롯, 같은 라운드의 장애물·다른 적과 비중첩; modify.
  - `src/styles/arena.css` :: `.monster` — 날개 흔들림/공중 부유 기본 자세. 장식이 히트박스를 바꾸지 않도록 한다; modify.
- Data & Schema Fields: Enemy kind 외 저장 필드는 없다. 월드 배치는 기존 `placement.collider:{x:number,y:number}`와 `size`를 사용한다. 공중 y는 길 바닥보다 최소 몬스터 반지름 한 개 이상 위, 화면 상단 HUD와 떨어진 범위로 제한한다.
- Error Handling: 이미지 로딩 실패 시 기존 SVG/기본 몬스터 폴백.

### I03. 검증
- Related Files:
  - `tests/city-crow.test.mjs` :: 도시 1·2라운드 두 마리 대체, 보스 제외, 배치 비중첩; new.
- Scenarios: 각 라운드의 수/종류/체력, 공중 콜라이더와 지상/장애물 분리, PNG 존재.

## Acceptance Criteria
- [ ] 도시 일반전마다 두 태엽 까마귀가 공중에 보인다.
- [ ] 적 총수·체력·기존 다른 몬스터·보스는 유지된다.

## Validation
- `node --test tests/city-crow.test.mjs`
- `npm run build`

## Commit Message
```text
feat(city): 태엽 까마귀 그림과 공중 배치 추가

Plan: 2026-10-30-cookie-stone-slots-city-crow
Phase: P02-presentation
Task: T04-city-crow-art-placement

- 도시 일반전의 로봇 두 마리를 공중 까마귀로 대체
- 동화풍 태엽 까마귀 그림과 충돌 없는 초기 위치 추가
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
