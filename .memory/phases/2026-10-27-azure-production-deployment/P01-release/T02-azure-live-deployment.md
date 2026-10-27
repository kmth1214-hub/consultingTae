# T02 Azure 설정·배포·검증

- Status: done
- Dependency: T01-workflow-integration

## 대상

- Azure `grill-me-edu/swa-cookie-expedition`: Standard, production 환경 변수, 배포 토큰.
- Azure `grill-me-edu/stcookieexpedition26/LeaderboardRecords`: 기존 Table 사용.
- Entra `cookie-expedition-login`: 실제 사이트 도메인의 Web callback, 단일 테넌트, 기존 client secret 설정 확인.
- GitHub `kmth1214-hub/consultingTae`: Actions 변수·배포 secret을 연결하고 테스트 완료 main을 push한다.
- `docs/azure-static-web-apps.md`, 현재 Task/phase/current: 실제 확인 결과와 URL을 기록한다.

## 데이터 및 필드

- T01의 Azure/GitHub 설정 스키마를 그대로 사용한다.
- Table 레코드는 기존 `GLOBAL` partition과 사용자별 최고 기록 스키마를 유지한다.
- 실제 비밀은 출력·파일 저장 없이 Azure/GitHub 설정 사이에서만 다룬다.

## 검증

- GitHub Actions의 verify 및 deploy 성공 여부 확인.
- 배포된 게임·정적 자산·API의 익명 접근은 회사 로그인으로 이동.
- `/.auth/me`와 실제 로그인 후 게임 로딩·리더보드 GET 동작 확인.
- 가능한 경우 사용자 실제 플레이 결과 저장 후 재조회로 영속화 확인. 테스트용 가짜 기록을 회사 기록판에 삽입하지 않는다.
- 다른 테넌트 로그인 검증에 사용 가능한 계정이 없으면 미검증으로 명시한다.
- `git status --short`, `git diff --check` 및 배포 링크 기록.

## 커밋

```text
docs(배포): Azure 회사 계정 배포와 운영 검증 기록

Plan: 2026-10-27-azure-production-deployment
Phase: P01-release
Task: T02-azure-live-deployment

[skip ci]
```

## 현재 확인 상태

- T01: `62725d1` (원격 포털 생성 커밋과 게임 최신 이력 병합 포함).
- 실제 사이트: `https://calm-flower-0764f6d00.3.azurestaticapps.net`.
- 기존 단일 테넌트 앱과 Web callback을 확인했다. 로그인용 비밀 생성 후 SWA에 연결했다. 비밀 만료일은 2027-04-25.
- Entra ID 토큰 발급 설정을 켜고 저장했다. 액세스 토큰 및 퍼블릭 클라이언트 흐름은 추가로 허용하지 않았다.
- SWA 프로덕션에 네 환경 변수의 저장 완료(적용 비활성, 네 이름 존재)를 확인했다.
- Table `LeaderboardRecords` 존재를 확인하고, 노출되지 않은 key2 연결 문자열을 SWA에 저장했다.
- key1 확인 중 값이 도구 출력에 포함되었다. 사용자의 명시적 교체 승인 후 2026-10-27에 key1을 재생성해 기존 값을 무효화했다. key2는 그대로 유지하며 API 연결에 사용한다. 비밀 값은 파일·커밋에 저장하지 않았다.
- GitHub의 기존 Azure 포털 생성 배포 Secret을 재사용한다. `ENTRA_TENANT_ID` 및 `AZURE_DEPLOY_ENABLED=true` 저장 완료.
- T03 `6f840fd` push 후 전체 재검증 실행: https://github.com/kmth1214-hub/consultingTae/actions/runs/40443808608 .
- 위 실행의 전체 verify와 Azure deploy가 모두 성공했다. 익명 게임/API/정적 파일은 302로 `/.auth/login/aad`로 이동했고, 실제 회사 계정 로그인 후 게임 첫 화면이 로드됐다.
- 인증된 `/api/leaderboard`가 401을 반환했다. `/.auth/me`의 `userDetails`가 이메일이어서 API 표시 이름 정책에 걸린다. T04에서 Entra의 실제 `name` claim 선택을 바로잡은 후 리더보드를 재검증한다.
- T04 `71729df` push 후 https://github.com/kmth1214-hub/consultingTae/actions/runs/40446570436 에서 전체 verify 및 Azure deploy가 성공했다. 새 배포의 익명 게임·API·정적 파일·개발 전용 경로는 모두 302로 회사 로그인으로 이동한다.
- 기존 로그인 세션은 배포 전 표시 이름을 보관하므로 새 세션으로 재인증한 뒤 리더보드 조회를 검증한다.
- 재로그인한 실제 회사 계정의 `/.auth/me`에서 `identityProvider=aad`, `authenticated` 역할과 비이메일 표시 이름을 확인했다. `/api/leaderboard`는 `{"entries":[],"personalBest":null}`을 반환했고, 게임 리더보드 화면은 오류 없이 ‘아직 등록된 기록이 없습니다’로 표시됐다.
- 사용자 실제 플레이 결과가 아직 없어 기록 POST와 영속화는 검증하지 않았다. 다른 테넌트 계정도 제공되지 않아 로그인 거부 실험은 미검증이다. 단일 테넌트 Entra issuer 설정과 익명 차단은 유지한다.
