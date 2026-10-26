# Task: T01 거대 보스

## Status: done

## Goal
보스를 3배 크기와 지역별 장식·체력바로 구분하고 실제 판정/카메라를 함께 맞춘다.

## Implementation
### I01. 공통 공간 모델
- modify `src/game/battlefieldModel.js` :: buildBattlefield — boss size=276 (기존 92 기준×3), normal 기존92/60 유지. collider y=ground-size*.52, radius=size*.42 기존 비율 적용. 현재 적 간격 최소 차930이므로 boss width276 비중첩 유지. 장애물 free interval은 실제 size 사용.
- modify `src/game/battlefieldCamera.js` :: getCameraPose — boss가 있는 overview/enemy 모드에서 몸과 상단 체력바에 필요한 세로 여백 확보. 기존 일반 몬스터 카메라 유지. overview scale 제한 시 수평 중앙 정렬, world/screen 왕복 유지. follow는 기존 높이760/지면 여백을 검증한다.
### I02. 보스 외형/동작
- modify `src/components/MonsterGroup.jsx`, `src/styles/arena.css`.
- modify `src/components/BattleArena.jsx` :: data-boss-battle — 세로 화면 보스전은 남은 화면 높이를 사용하여 기존 큰 사탕/소모품 HUD 뒤에 보스 이름이 가려지지 않도록 한다.
- forest: 기존 chocolateBoar 그림 유지 + SVG 갑옷/큰 엄니/등 가시 레이어(100×100 범위). snow: 기존 눈사람 몸체 위 다면 얼음 어깨/왕관. city: 기존 로봇에 화덕 문/불빛/굴뚝을 그린 보스 변형.
- 보스 전용 이름+HP/maxHP와 실제 비율 체력바. overview에서도 표시, 다중 boss/모바일 라벨 겹침 방지(72~150 CSS px, inverse camera scale). role img의 기존 접근성 이름 유지.
- 보스 공격은 무거운 준비/발사 keyframe, reduced motion에서는 정지. 근접 돌진 기존 이동 anchor 유지.
- source socket은 기존 EnemyResponse에서 size에 비례하므로 새 크기 자동 반영. render source를 직접 새로 계산하지 않는다.
### I03. 검증
- new `tests/giant-bosses.test.mjs`: 모든 지역/seed 다중 boss size276, collider/obstacle/적 nonoverlap, 실제 planShot 판정과 playable, 카메라320높이/폰/desktop body+bar 포함, HP·damage 불변.
- new `tests/e2e/giant-bosses.spec.cjs`: 세 지역 실제 boss art/HPbar/worldsize와 source, 혼돈 세 보스 비중첩, reduced 폰.
- modify `tests/battlefield-model.test.mjs`: 기존130 size 기대값을276으로 갱신. 밀도/도달 가능성 검증은 유지.

## Acceptance Criteria
- [x] 일반 기준3배와 실제 collider 적용
- [x] 지역별 외형·이름·체력바·묵직한 동작
- [x] 혼돈/폰/카메라/실제 조준 검증

## Validation
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test giant-bosses.spec.cjs` 또는 독립 production preview config

## Commit Message
```text
feat(보스): 3배 몸체와 지역별 외형 및 체력바 적용

Plan: 2026-10-26-giant-bosses-and-throw-mistakes
Phase: P01-combat
Task: T01-giant-bosses

- 피격 범위와 카메라를 거대 보스 크기에 맞춤
- 숲 엄니 갑옷·눈 얼음 왕관·도시 화덕과 묵직한 공격 추가
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 단위156, production build, 세 지역+혼돈 reduced phone 브라우저4 통과.
- 기존 모델 기대값130을276으로 갱신. 첫 브라우저는 정지 시계에서 카메라200ms 전환을 진행하지 않아 실패하여240ms 전진 후 검증하도록 교정.
- 스크린샷 검토에서 세로 HUD가 이름을 가리는 것을 발견하여 보스전 높이를 확보하고 HUD/이름 비중첩 assertion 추가. 최종4개 재실행 통과.
- commit은 기존 자동 승인 검토 사용량 제한으로 대기. 구현 검증 후 사용자 승인된 T02를 계속 진행.
