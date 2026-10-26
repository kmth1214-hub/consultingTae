# Task: T03 Integration Validation

## Status: done

## Goal
일반 플레이와 관리자 혼돈3 진입에서 융합·분리 전투가 실제 조준/발사/방어/관통/연쇄와 함께 작동한다.

## Decision Summary
- 새 테스트 진입 API를 제품에 만들지 않는다. 관리자 기존 지역·라운드 선택으로 접근. 브라우저 fixture는 기존 engine 관찰 훅에서 초기 HP/정해진 RNG만 고정한다.
- 기존 Chaos3 roster 전제가 바뀌는 테스트만 수정하고 숲/눈/도시, 아이템·보상·리더보드 검증의 의미는 유지한다.

## Implementation
### I01. 회귀와 실제 브라우저
- Related Files:
  - `tests/e2e/chaos-fused-boss.spec.cjs` — new
  - `tests/studio-e2e/chaos-fused-boss.spec.cjs` — new
  - `tests/battle-engine.test.cjs`, `tests/gameplay-rules.test.cjs`, `tests/battlefield-model.test.mjs`, `tests/giant-bosses.test.mjs`, `tests/studio-session.test.mjs`, 기존 `tests/e2e`/`tests/studio-e2e`의 Chaos3 assertions — 필요한 수정만
  - `.memory/decisions/2026-10-26-chaos-fused-boss.md` 및 phase/tasks/current — 검증결과 동기화
#### Details
- 데스크톱 일반 동작과 reduced portrait: fused 시작414/HP56, 실제 planShot 해로 발사하여 hp<=28 경계 유도, review 동안 이전 fused, flight/impact 단계, 세보스276/남은HP합계, obstacle정확히3·새ids, ammo소모1·입력차단, 충격피해1회, 재발사 가능 확인.
- 별도 케이스: shield/Milk/ice 경감 및 치명적shock 후 결과, 분리 후 창 최대3 실제 contact, 특수기 기존공격연출, visibility/오래된 callback 중복 방지.
- 관리자 지역chaos/round3 선택 후 실제 fused와 특수 공격, 분리 확인. 브라우저 프로필/리더보드 쓰기 없이 기존 격리 보장.
- 스크린샷 육안 검사 desktop/phone/fused/split mid-flight/impact. 페이지 오류·asset404 없음. 사용자5173 서버 유지, 자체 테스트 서버만 정리.
- 테스트 실패 시 원인 분류 후 해당 범위만 수정. 충분한 검증 뒤 불필요한 반복 실행 금지.

## Acceptance Criteria
- [x] 전체 node 테스트/build/관련 Playwright 통과
- [x] 관리자에서 혼돈3 직접 확인 가능
- [x] 기존 지역·사탕·관통·장애물 연쇄 회귀 없음
- [x] 각 Task 한국어 커밋 또는 승인 제한으로 보류한 근거와 메시지 기록

## Validation
- `npm.cmd test` — 전체 단위 테스트
- `npm.cmd run build` — 프로덕션 번들
- `npx.cmd playwright test tests/e2e/chaos-fused-boss.spec.cjs` — 실제 플레이
- `npx.cmd playwright test --config playwright.studio.config.cjs tests/studio-e2e/chaos-fused-boss.spec.cjs` — 관리자
- 기존 변경 영향을 받는 브라우저 테스트를 함께 실행하고 명령/결과 기록
- `git diff --check` — whitespace 오류 없음

## Commit Message
```text
test(혼돈): 융합 보스 일반 관리자 전투 흐름 검증

Plan: 2026-10-26-chaos-fused-boss
Phase: P01-encounter
Task: T03-integration-validation

- 체력 경계와 단일 착지 피해 및 새 장애물 회귀 검증
- 데스크톱 모바일 관리자에서 실제 발사와 분리 확인
- 기존 세 보스 동시 등장 전제를 새 전투 계약에 맞춰 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 02d2c53
- 준비된 메시지: `tmp/chaos-fused-t03-commit.txt`. 이전 자동 승인 검토의 사용량 제한을 우회하거나 Git 쓰기를 반복 시도하지 않았다. 기존7건과 신규3건을 각각 나눠 커밋해야 하므로 상태를 done으로 표시하지 않는다.

## Validation results (2026-10-26)
- `npm.cmd test`: **179/179**. 로그 `tmp/chaos-fused-unit-final.log`.
- `npm.cmd run build`: 통과. `App-Bmo0wFsZ.js`, `App-CIYn4x7K.css`, `index-CsIjh_AY.js`.
- 신규 일반 브라우저 `chaos-fused-boss.spec.cjs`: **6/6**. 실제 조준과 발사, 2초 리뷰, 포물선→충격→idle/패배, shield/Milk/ice/fatal, split 후 물리 창 명중, hidden 중복방지.
- 기존 일반 브라우저 **43/43**: enemy-response, enemy-throw-mistakes, game-flow, giant-bosses, obstacle-chain, shot-review, spear-projectile.
- 관리자 **14개 고유 테스트 통과**: 신규 융합/분리1 + 기존 play-mode12 + boss-mistakes1. 신규1은 안정화 설정에서 재실행해 같은 결과 확인.
- 표준4180 포트가 이미 사용 중이어서 검증 전용 preview4192 사용. 관리자4182는 기존 `vite.config.js`를 읽고 `tmp/chaos-fused.vite.cjs`에서 추적 파일 감시만 제외했다. 임시 Playwright config는 `tmp/chaos-fused.playwright.cjs` / `tmp/chaos-fused.studio.cjs`.
- 기존 관리자 초기 검사에서 tmp 추적 HTML이 Vite의 전체 새로고침을 일으켰다. 제품 코드를 고치지 않고 검증 서버에서 해당 경로를 제외한 뒤 관리자13개를 깨끗하게 통과했다. 영구 개발 서버 감시 정책 변경은 이번 기능 범위에 추가하지 않았다.
- `git diff --check`: exit0. `core.autocrlf=false`로 실행하면 기존 목업 CRLF가 오탐으로 보고되므로 저장소 기본 설정으로 확인했다. 사용자 목업 수정 없음.
- 아트1254×1254 RGBA. 육안: `tmp/chaos-fused-desktop.png`, `tmp/chaos-fused-phone.png`, `tmp/chaos-split-flight.png`, `tmp/chaos-split-*-landing.png`, `tmp/studio-chaos-split.png`.
- 검토 링크 `http://127.0.0.1:4182/__dev/maps` → 혼돈/3라운드/테스트 플레이. 해당 검토 서버는 유지, 자체 production preview4192는 정리한다. 기존5173 서버는 변경하지 않았다.
