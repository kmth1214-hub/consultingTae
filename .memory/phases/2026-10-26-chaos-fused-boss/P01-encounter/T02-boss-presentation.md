# Task: T02 Boss Presentation

## Status: done

## Goal
4.5배 융합 보스의 특징과 세 보스의 포물선 분리·착지·플레이어 충격을 일반/작은 화면에서 명확히 보여준다.

## Decision Summary
- 엔진은 한 번 확정, 화면은 재생만. 기존 2초 결과 리뷰 뒤 분리 연출. 세 보스가 떨어져도 플레이어 피해는 한 번만 표시.
- 새 융합 raster는 imagegen 스킬 built-in으로 제작하고 alpha 유지한 채 프로젝트에 저장. 기존 개별 보스 그림·장식 유지.

## Implementation
### I01. 외형과 표시
- Related Files:
  - `assets/monsters/chaos-fused-boss.png` — new, 기존 assetCatalog 규약 사용
  - `src/game/assetCatalog.js` :: `ASSETS.monsters` — modify
  - `src/game/gameData.js` :: `MONSTER_NAMES` — modify
  - `src/components/MonsterGroup.jsx` :: `MonsterArt`, `MonsterGroup` — modify
  - `src/components/EnemyResponse.jsx` :: `attackStyle`, 표시 이름 — modify
  - `src/styles/arena.css` — modify
#### Details
- 단일 초콜릿 멧돼지 몸체+눈사람 얼음 왕관/갑옷+화덕 가슴/굴뚝의 통합 캐릭터, 좌향 3/4, 투명 배경, text 없음. 생성 결과 검사 후 복사. 기존 아트 함수에 fused 전용 분기, 기존 BossArmor는 fused에 덧씌우지 않는다.
- 이름 `혼돈의 융합 군주`. attackStyle은 attack.attackKind가 있으면 해당 종류의 일반 공격 연출을 사용하되 화면 이름은 융합체. 기존 특수기/미스 연출 그대로.

### I02. 전환 재생
- Related Files:
  - `src/components/BossSplitTransition.jsx` — new
  - `src/game/bossSplitMotion.js` — new
  - `src/components/BattleArena.jsx`, `BattleScreen.jsx` — modify
  - `src/dev/StudioPlay.jsx` — modify (전환 중 조기 결과 방지)
#### Details
```typescript
sampleBossSplit({source:{x:number,y:number},target:{x:number,y:number},index:number,progress:number}):{x:number,y:number}
BossSplitTransition({transition,source,layout,onImpact,onComplete}):ReactElement
```
- source는 이전 fused 배치, 목적지는 split layout. 샘플은 선형 x/y 보간 + 위쪽 포물선 `-4*h*t*(1-t)` (h약260), 각index 지연약120ms, 비행약1100ms, 총flight 약1400ms와 impact500ms. 한 rAF clock, callbacks ref, visibility hidden 시 안전 완료, cleanup cancellation. reduced는 이동 생략·짧은 impact 표시.
- 리뷰 동안 fused roster/layout를 보여주고 엔진의 이미 교체된 split roster를 노출하지 않는다. 리뷰 종료 후에는 split 배치와 이동중 MonsterGroup을 렌더링하며 정상 고정 몬스터는 감춘다. 착지 후 새 장애물3개 등장·먼지/충격파, 한 번의 player impact.
- visualContacts/flight/lastImpact는 전환 시작 시 정리해 옛 장애물이 새 layout에 투영되지 않게 한다. 전환 중 카메라 전체 조망, minimap/사탕정보/소모품은 잠시 숨기거나 비활성. HP는 impact 전 shock.playerHpBefore, 후 실제run.playerHp. 화면 하단에 분리·착지 피해/차단 설명.
- BossTransition clock은 RNG/resolveProjectile를 호출하지 않음. id 확인 완료로 중복방지. 새 입력이 열릴 때 기존새 layout 및 same-round 능력 상태 유지.

## Acceptance Criteria
- [x] 융합 그림·이름·공격 종류·414 크기 렌더링
- [x] 리뷰→포물선→3착지→충격 한 번→다음행동/패배 순서
- [x] 모바일 및 reduced motion에서 캐릭터·피격 결과 확인 가능

## Validation
- `node --test tests/chaos-fused-boss.test.mjs tests/boss-split-motion.test.mjs` — 순수 궤도와 전투 검증
- `npm.cmd run build` — 이미지 경로 및 React 번들 확인

## Commit Message
```text
feat(보스): 융합 외형과 포물선 분리 착지 연출 추가

Plan: 2026-10-26-chaos-fused-boss
Phase: P01-encounter
Task: T02-boss-presentation

- 초콜릿 얼음 화덕을 합친 단일 융합 캐릭터 적용
- 분리 비행과 장애물 재생성 및 착지 충격 재생
- 작은 화면과 동작 줄이기 설정에서 입력과 카메라 보호
```

## Progress
- [x] 구현 완료 — 실제 아트 `assets/monsters/chaos-fused-boss.png`, 생성 프롬프트 sibling md
- [x] 검증 통과 — 신규 전투/궤도11 및 build, 브라우저 육안은 T03
- commit: bcc1af0
- 준비된 메시지: `tmp/chaos-fused-t02-commit.txt`.
- T03 실제 브라우저6 통과: full56 시작/414 아트, shield·phone ice·Milk·fatal 착지, hidden 중복방지. desktop/phone/flying/landing 스크린샷 육안 확인. PNG1254×1254 RGBA(alpha) 검증.
