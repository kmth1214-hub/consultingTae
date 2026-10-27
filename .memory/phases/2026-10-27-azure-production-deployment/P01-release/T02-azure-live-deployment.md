# T02 Azure 설정·배포·검증

- Status: todo
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
```
