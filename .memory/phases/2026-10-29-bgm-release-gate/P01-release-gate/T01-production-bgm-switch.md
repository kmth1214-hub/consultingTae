# Task: T01 Azure 배포에서 BGM 제외

## Status: done

## Goal
로컬 개발 게임과 맵 스튜디오의 음악 검토 기능을 유지하면서 Azure에 올리는 사용자 게임에서는 음악 재생과 음량 UI가 나타나지 않게 한다.

## Decision Summary
- 기본 production 빌드는 BGM을 끄고, 로컬 개발 서버는 켠다. 별도 음악 시범 production 빌드만 `VITE_ENABLE_BGM=true`로 켠다.
- 이 Task는 배포 산출물 준비까지다. GitHub push 시점은 사용자에게 제시한 현재 배포/몬스터 배치 개선 후 배포 선택을 따른다.

## Implementation

### I01. 사용자 게임 음악 게이트

- Related Files:
  - `src/App.jsx` :: `App`, `MusicScreen` — 사용자 게임의 음악 훅 마운트를 환경에 따라 결정; modify
  - `src/game/useBattleBgm.js` :: `useBattleBgm` — 읽기 전용, 비활성 빌드에서 호출하지 않을 훅; read-only
  - `src/components/BattleScreen.jsx` :: `BattleScreen` — 읽기 전용, `music`가 없으면 기존 조절 UI를 렌더링하지 않음; read-only

#### Details
- **Signatures & Types**:
  ```js
  const BGM_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_BGM === 'true';
  function MusicScreen({ session, Screen }) { /* returns React element */ }
  export default function App() { /* returns React element */ }
  ```
- **Data & Schema Fields**:
  - `session`: `useGameSession()`이 반환하는 기존 게임 세션 객체. `screen: string`, `run?: { area: string, round: number }` 필드를 음악 훅에 전달한다.
  - `music`: `useBattleBgm()` 반환 객체 또는 미전달(`undefined`). 저장 데이터 형식은 기존 `cookie-expedition-bgm-v1` 그대로이며 production 비활성화 시 읽거나 쓰지 않는다.
- **Execution Flow / Logic**:
  1. `App`은 항상 `useGameSession`, 화면 선택, 포커스 관리, `Toast` 렌더링을 기존처럼 수행한다.
  2. 상수 `BGM_ENABLED`가 참일 때만 `MusicScreen` 자식 컴포넌트를 렌더링한다. `MusicScreen`이 `useBattleBgm({ active: session.screen === 'battle', area: session.run?.area, boss: session.run?.round === 3 })`를 호출하고 `<Screen session={session} music={music} />`를 반환한다.
  3. 거짓이면 `<Screen session={session} />`를 렌더링한다. `App` 안에서 훅을 조건부 호출하지 않는다(React Hook 순서 보호).
  4. 비활성 빌드에서 음악 훅의 `AudioContext` 초기화, localStorage 접근, UI 삽입이 발생하지 않아야 한다. 기존 화면 오류 처리 경로는 유지한다.

### I02. Azure 빌드 설정과 검증

- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: `jobs.verify.env.VITE_ENABLE_BGM` — 업로드 산출물에서 음악을 명시적으로 끔; modify
  - `tests/e2e/bgm.spec.cjs` :: `test` — 비활성 production 검증을 추가하고 기존 음악 양성 테스트를 시범 빌드에서만 실행; modify
  - `docs/azure-static-web-apps.md` :: `BGM 배포 상태` — Azure에서는 음향 제외, 로컬 검토 방법 기록; modify

#### Details
- **Signatures & Types**:
  ```js
  const musicPreview = process.env.VITE_ENABLE_BGM === 'true'; // boolean
  ```
- **Data & Schema Fields**:
  - GitHub Actions verify job env `VITE_ENABLE_BGM: 'false'` (string). `build:azure`와 브라우저 테스트가 같은 설정을 사용한다.
- **Execution Flow / Logic**:
  1. 기존 음악 컨트롤 양성 테스트 6개는 `VITE_ENABLE_BGM=true` 시범 빌드에서만 실행한다.
  2. 기본 production 빌드 테스트는 전투 시작 후 음악 컨트롤 부재, 음악 저장값 미생성, 전투 맵 정상 표시를 확인한다.
  3. 관리자 스튜디오는 개발 서버 전용으로 계속 음악을 사용한다. Azure 배포에서 관리자 경로가 노출되지 않는 기존 설정을 유지한다.
  4. 문서에는 Azure 비활성 설정과 나중에 음악을 켜려면 검토 후 플래그 및 검증을 변경해야 함을 적는다. 자격 증명은 출력하거나 문서화하지 않는다.

## Acceptance Criteria
- [ ] 로컬 개발 서버의 사용자 게임과 관리자 스튜디오에서 음악이 작동한다.
- [ ] 기본 production 빌드의 사용자 게임에서는 음악 UI와 재생이 없다.
- [ ] GitHub Actions Azure 업로드 빌드는 음악 비활성화를 명시한다.
- [ ] 기본 production 브라우저 테스트, 음악 시범 빌드 브라우저 테스트, 단위 테스트 및 빌드가 통과한다.

## Validation
- `npm.cmd test` — 단위 및 API 테스트 통과.
- `npm.cmd run build` — 기본 production 빌드 통과.
- `node ./node_modules/@playwright/test/cli.js test tests/e2e/bgm.spec.cjs --config tests/config/bgm-preview.config.cjs` — 포트 4180의 별도 Vite preview에서 음악 제외 확인.
- `$env:VITE_ENABLE_BGM='true'; npm.cmd run build; node ./node_modules/@playwright/test/cli.js test tests/e2e/bgm.spec.cjs --config tests/config/bgm-preview.config.cjs` — 음악 시범 빌드의 기존 6개 테스트 통과. 이후 환경 변수를 제거하고 기본 빌드를 다시 생성한다.

## Commit Message
```text
fix(release): Azure 배포에서 검토 중인 전투 음악 제외

Plan: 2026-10-29-bgm-release-gate
Phase: P01-release-gate
Task: T01-production-bgm-switch

- 로컬 음악 시범 기능은 유지하고 프로덕션 빌드에서는 음악 훅과 UI 비활성화
- Azure 빌드 플래그와 양쪽 브라우저 검증 문서화
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd test`: 244/244, 기본 production 브라우저: 1/1, 음악 시범 브라우저: 6/6, 두 빌드 성공)
- commit: `201653b`
