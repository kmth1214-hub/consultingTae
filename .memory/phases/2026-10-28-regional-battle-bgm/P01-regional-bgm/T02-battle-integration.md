# Task: T02 게임 음악 연결과 조절 UI

## Status: done

## Goal
로컬 사용자 게임과 관리자 테스트 전투에서 지역 BGM 및 3라운드 보스 변주가 전환되고, 플레이어가 음소거·음량을 조절할 수 있다. 전투 외 화면과 숨긴 탭에서는 음악을 멈춘다.

## Decision Summary
- `BattleScreen`은 일반 사용자와 `StudioPlay`가 함께 쓰므로 음악 UI는 공통 화면에, 재생 상태 소유권은 각 진입 컴포넌트에 둔다.
- 기존 전투 배치·피해 로직은 건드리지 않는다. Azure 배포는 하지 않는다.

## Implementation

### I01. React 생명주기와 설정 저장
- Related Files:
  - `src/game/useBattleBgm.js` :: `useBattleBgm` — 브라우저 오디오 인스턴스와 설정 유지; new
  - `src/App.jsx` :: `App` — 사용자 게임의 battle 화면·area·round를 음악 훅에 전달; modify
  - `src/dev/StudioPlay.jsx` :: `StudioPlay` — 개발 지도 테스트 플레이에서 동일 훅 사용; modify
#### Details
- **Signatures & Types**:
  ```js
  export function useBattleBgm({ active, area, boss });
  // -> { volume:number, muted:boolean, state:string,
  //      setVolume(value:number):void, toggleMuted():void, resume():Promise<void> }
  ```
- **Data & Schema Fields**: localStorage 키 `cookie-expedition-bgm-v1`, JSON `{volume:number, muted:boolean}`. 값이 잘못되거나 접근이 거부되면 기본 `{volume:.35, muted:false}`. 플레이어 인스턴스는 `useRef`로 유지하고 언마운트에서 정리한다.
- **Execution Flow / Logic**:
  1. `App`에서 `session.screen === 'battle'`이면 active=true, `session.run.area`, `session.run.round === 3`을 전달한다. 전투 외 화면은 false. `StudioPlay`는 테스트 전투가 끝나면 false.
  2. 훅은 area/boss 변경 시 `setScene`, active 변경 시 `setActive`. `visibilitychange`에서 숨긴 탭을 멈추고 다시 보일 때 재개한다. 정책상 차단되면 UI의 resume 버튼으로 재시도한다.
  3. 설정 변경은 즉시 master gain 반영 후 저장. React StrictMode 재마운트에서 타이머/컨텍스트가 남지 않아야 한다.

### I02. 플레이 UI와 검증
- Related Files:
  - `src/components/BattleScreen.jsx` :: `BattleScreen` — 헤더 BGM 음소거 버튼·음량 슬라이더; modify
  - `src/styles/arena.css` :: `.battle-bgm-*` — 데스크톱·600px 모바일·전체화면 배치; modify
  - `src/game/bgmPlayer.js` :: `newTrack` — 실제 브라우저 신호 측정에 맞춰 재생 버스 음량 조정; modify
  - `tests/e2e/bgm.spec.cjs` :: `BGM smoke` — UI 설정·지역/보스 진입 확인; new
  - `tests/studio-e2e/bgm.spec.cjs` :: `studio BGM smoke` — 개발 지도 테스트 플레이 네 지역 확인; new
  - `tests/config/bgm-preview.config.cjs`, `tests/config/bgm-studio.config.cjs` :: `Playwright configs` — 독립 서버에서 종료 가능한 검증 설정; new
#### Details
- **Signatures & Types**: `BattleScreen({session, music})`; music 누락 시 기존 호출은 동작하고 컨트롤만 숨긴다. range input은 min=0,max=100,step=1,value=`Math.round(volume*100)`, accessible name `BGM 음량`. 버튼은 `BGM 음소거`/`BGM 켜기`, `aria-pressed` 사용. blocked 상태면 `BGM 재생`으로 resume.
- **Execution Flow / Logic**:
  1. 헤더의 체력·사탕·점수와 전체화면 버튼 사이에 작은 음악 조절기를 둔다. 모바일에서 숫자 정보와 버튼이 사라지지 않도록 너비·줄바꿈 조정.
  2. 헤더의 음악 조절 이벤트가 전투 조준 동작으로 전달되지 않게 한다. 재생 오류는 작은 상태 표시로 처리하고 전투를 막지 않는다.
  3. e2e는 전투 시작 후 컨트롤, 음소거·음량 설정 저장, 새로고침 복구를 확인한다. 초기 지역/라운드 주입 테스트로 네 지역과 보스 UI를 확인한다. 실제 청취 품질·OS 음량은 자동 테스트 대상이 아니므로 로컬 브라우저에서 직접 검토한다.

## Acceptance Criteria
- [ ] 네 지역 사용자 전투의 음악이 달라지고 보스 라운드는 같은 주제의 강화 변주다.
- [ ] 전투 종료·보상/야영지/홈·숨긴 탭에서 이전 곡이 흐르지 않는다.
- [ ] 음소거·음량 설정은 새로고침 후에도 유지되고 모바일 헤더에서 접근 가능하다.
- [ ] 오디오 오류가 나도 조준·발사·아이템은 작동한다.
- [ ] Azure 서비스와 외부 저작권 음원은 변경하지 않는다.

## Validation
- `node --test tests/bgm-score.test.mjs tests/bgm-player.test.mjs` — 엔진 회귀 없음
- `npm.cmd run build` — Windows PowerShell에서 통합 빌드 통과
- `node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4180 --strictPort`를 별도 세션에서 시작한 뒤 `node ./node_modules/@playwright/test/cli.js test tests/e2e/bgm.spec.cjs --config tests/config/bgm-preview.config.cjs` — 로컬 빌드 미리보기에서 컨트롤·전환·모바일 통과
- `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4181 --strictPort`를 별도 세션에서 시작한 뒤 `node ./node_modules/@playwright/test/cli.js test tests/studio-e2e/bgm.spec.cjs --config tests/config/bgm-studio.config.cjs` — 개발 지도 테스트 전투 네 지역 통과

## Commit Message
```text
feat(bgm): 전투 화면에 지역 음악과 음량 조절 연결

Plan: 2026-10-28-regional-battle-bgm
Phase: P01-regional-bgm
Task: T02-battle-integration

- 사용자 및 관리자 테스트 전투의 지역·보스 음악 동기화
- 음소거와 음량 설정을 저장하고 화면에서 조절
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 엔진 6개, 일반 브라우저 6개, 관리자 브라우저 1개, Vite 빌드 및 오디오 신호 확인
- commit: `91d025c`
