# Task: T01 실제 관통 사탕

## Status: done

## Goal
창을 준비한 후 직접 쏜 사탕의 실제 궤적에 닿은 최대3마리만 순서대로 피해를 입고, 창/불공 외형이 장전/비행에 일치한다.

## Implementation
### I01. 준비와 실제 발사 분리
- modify `assets/js/battle-engine.js` :: createRunState/useConsumable/resolveProjectile/enterRound/CONSUMABLE_CATALOG.
- Run `spearArmed:boolean=false`. 사용은 true 설정과 effect.armed만 반환, 피해/RNG 없음. 실제 수락한 발사에서만 false로 소모(취소/거부 유지), round 초기화false.
- 발사 시 창 피해는 randomInt(rng,2,5), config.damage 지정 시 기존 override 유지. 영구 사탕 zeroRoll·명중능력·Wind 발동 제외. baseDamage에서 실제 contact index만큼1 감소하여 각각 대상에 적용, 살아 있어도 다음 실제 접촉 진행, 중복/4번째 제외. 점수는 기존 창처럼 실제 제거HP. 탄약/queue/적 반격은 실제 발사1회만.
- event source는 weapon 유지, modifier='spear'|'fireball'|null 추가. 장애물 timeline은 창에서도 처리. 창 직접 명중은 적 접촉 시간별 timeline으로 장애물과 합쳐 실제 순서 준수.
### I02. 실제 경로와 세션
- modify `src/game/shotGeometry.js` :: planShot/planStackedShot signatures에 piercing:boolean=false.
- Shot `enemyContacts:Array<{id:string,point:{x:number,y:number},distance:number,time:number}>` 추가(관통 때 최대3 unique, 물리 접촉순).
- 관통은 첫/둘째 적을 멈춤 조건에서 제외하고 세 번째, 물리 끝, 장애물 감속 후 끝 중 실제 먼저 도달한 지점으로 종료. stack 각 segment에서 이미 닿은 적 제외, 누적시간/거리 적용. 바람 유도는 관통 시 비활성.
- 일반 샷의 첫 적 종료/기존 결과 유지. nonstack 관통은 실제 경로/장애물 전의 hit만 최대3, ground roll도 같은 방식.
- modify `src/components/BattleArena.jsx` :: makeSolution에 run.spearArmed 전달. startFlight는 projectileKind를 snapshot. completeFlight는 enemyContacts를 shotMeta에 전달. 실제 접촉시각에 관통 링/빛 연출을 표시하며 전투 판정은 기존 완료 콜백1회만.
- modify `src/game/gameSession.js` :: enemyContacts 유효성(배열/최대3/unique/유한point·time·distance/증가순/실제hitIds 일치/현재run적 id)을 거부 전 검사. 기존 shotMeta호환 유지. routeCombat의 visualKey는 modifier로 구분.
### I03. 장전·비행 외형/안내
- new `src/components/CandyProjectileArt.jsx` :: `{variant:'normal'|'spear'|'fireball'}` SVG 공통 그림. 창: 금속촉·마법사탕핵·청록잔광; 불공: 불꽃 꼬리·밝은핵. 지오메트리 collider 크기는 기존 사탕 반경 유지.
- modify `Slingshot.jsx` 장전그림과 `ProjectileFlight.jsx` 비행그림에 같은 variant 사용. 창/불공은 비행 tangent 방향, 일반/굴림 기존회전 유지. flight 스냅샷 사용(소모후 원래 외형으로 바뀌면 안 됨). reduced motion 유지.
- modify `src/game/candyPresentation.js` range2..5/관통감소 안내, `BattleScreen.jsx` 준비 문구, `src/styles/arena.css` 접촉/잔광.
- modify `src/components/MagicCandyCard.jsx` :: 창 준비 칩과 창 명중능력 제외 안내. new `tests/e2e/spear-support.cjs` :: 실제 buildPlayableBattlefield/planShot 기반 명중각을 구하는 테스트 helper.
### I04. 검증과 회귀 갱신
- new `tests/spear-projectile.test.mjs`: 즉시 피해 red test→green; 실제 연속적 접촉/높이 차이/3명 제한/후속 miss/역발사/굴림/장애물 이후 궤도/chronological effects/발사1회·준비유지/특수사탕명중능력 제외.
- new `tests/e2e/spear-projectile.spec.cjs`: 버튼직후 HP불변·장전외형, 조준취소유지, 실제 경로명중/비명중과 관통 비행·접촉순, 불공외형/소모/2배, 모바일.
- update 기존 `tests/battle-engine.test.cjs`, `tests/gameplay-rules.test.cjs`, `tests/e2e/game-flow.spec.cjs`, `tests/e2e/consumable-preparation.spec.cjs`의 즉시창피해 전제를 실제 발사로 갱신. 기존 해금/점수 검증은 삭제하지 않는다.

## Acceptance Criteria
- [x] 창 선택 즉시 피해/RNG/반격 없음
- [x] 실제 관통한 적만 순서대로 최대3명 피해
- [x] 창·불공 장전/비행 외형 및 소모 일치
- [x] 일반샷·장애물·굴림·보상/해금 회귀 통과

## Validation
- `node --test tests/spear-projectile.test.mjs` red→green
- `npm.cmd test`
- `npm.cmd run build`
- production Playwright spear-projectile/game-flow/consumable-preparation 관련 케이스

## Commit Message
```text
fix(창): 실제 사탕 발사의 관통 경로로 피해 판정 연결

Plan: 2026-10-26-aimed-spear-candy
Phase: P01-projectile
Task: T01-physical-piercing

- 즉시 적 목록에 피해를 주던 창 사용을 다음 발사 준비로 변경
- 실제 접촉 시간과 경로로 최대3마리 관통 피해 판정
- 창·불공의 장전 및 비행 외형과 능력 안내 통합
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Diagnosis / Validation Results
- Red: `node --test tests/spear-projectile.test.mjs` 선택 직후 enemies unchanged assertion 실패. 최소 engine 단독 재현에서도 snow HP [4,4,4,4,4]→[0,1,2,4,4].
- 원인: useConsumable가 실제 경로를 보지 않고 living enemies.slice(0,3)에 직접 피해. 동시에 기존 stacked geometry가 첫 적에서 종료되어 준비 플래그만 추가하면 관통되지 않음.
- Green: 동일 최소 node 재현에서 HP [4,4,4,4,4] 유지/hits[]/armedtrue 확인. 영구 회귀 테스트7개: 비행/굴림의 실제3접촉, typed stack 통합, 벽/역발사/off-path, timeline, 준비취소/거부/빗나감, HUD, session metadata 변조 거부와 실제 metadata 수락.
- 전체 단위167/167 통과. 기존 즉시창피해 테스트6개는 준비+실제 발사로 바꾸되 점수·해금·명중능력 제외 검증 유지.
- production browser6/6: desktop/phone 관통 준비/취소/실제 접촉/미접촉 HP불변, 빗나감, 불공 외형2배와 소비, 연금술사 점수, 발사 후 라운드 준비 슬롯.
- 첫 browser fireball 기대값을 잘못8로 가정했으나 C등급rng.5의 실제 기본 피해는2이므로2배=4. 기존 규칙대로 테스트만 교정. session 신규 테스트는 실제 UI가 변환하는 rolling 필드를 누락해 실패하여 실제 payload 형태로 교정.
- production build 통과. `tmp/spear-loaded-desktop.png`, `tmp/spear-loaded-phone.png`, `tmp/spear-flight.png`, `tmp/fireball-loaded.png`, `tmp/fireball-flight.png` 시각 검토. 정지 시계의200ms 카메라 전환을 진행한 후 그림 검토.
- 임시 디버그 계측/프로토타입 없음. 자체 preview/config 정리, 사용자5173 유지.
- 재발 방지: 아이템 선택은 준비 상태만, 피해는 공통 projectile의 물리 contact stream으로 한 번 계산. 장전/비행은 공통 CandyProjectileArt 사용.
- 범위 밖 발견: 특이사항 없음. commit은 이전 자동 승인 검토 사용량 제한으로 대기, 우회/재시도 없음.
