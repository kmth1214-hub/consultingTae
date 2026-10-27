# T01 배포 workflow 통합

- Status: done

## 수정 대상

- Git `main`: `origin/main`의 추가 workflow 커밋을 이력 보존 병합한다.
- `.github/workflows/azure-static-web-apps-calm-flower-0764f6d00.yml`: 자동 생성된 중복 배포를 제거한다.
- `.github/workflows/azure-static-web-apps.yml`: 기존 verify/deploy jobs, `dist` 정적 산출물, `api` 관리형 API 경로 및 테넌트 배포 게이트를 유지한다. 이미 GitHub에 등록된 포털 생성 Secret 이름도 fallback으로 받아 키를 복사·재발급하지 않는다.
- `docs/azure-static-web-apps.md`: 실제 리소스와 배포 설정 경로를 기록한다.
- 현재 Task, 상위 phase 및 `.memory/current.md`: 검증 결과·상태·다음 Task 동기화.
- 기존 사용자 목업 HTML 수정과 무관한 untracked 파일은 커밋에서 제외한다.

## 스키마

- Azure production environment: `ENTRA_CLIENT_ID: string`, `ENTRA_CLIENT_SECRET: secret string`, `LEADERBOARD_STORAGE_CONNECTION_STRING: secret string`, `LEADERBOARD_TABLE_NAME: string = LeaderboardRecords`.
- GitHub Actions variables: `ENTRA_TENANT_ID: UUID string`, `AZURE_DEPLOY_ENABLED: 'true' | unset`.
- GitHub Actions secret: `AZURE_STATIC_WEB_APPS_API_TOKEN: secret string` 또는 기존 `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_FLOWER_0764F6D00: secret string`.
- 비밀 값 자체는 문서·코드·로그에 기록하지 않는다.

## 검증

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run test:e2e`
- `npm.cmd run test:studio`
- `git diff --check`
- 최종 deploy workflow는 하나이며 `npm run build:azure` 및 테넌트 설정 게이트가 유지되는지 확인.

## 커밋

```text
fix(배포): Azure 자동 생성 워크플로를 기존 검증 경로로 통합

Plan: 2026-10-27-azure-production-deployment
Phase: P01-release
Task: T01-workflow-integration
```

## 검증 결과

- `origin/main`의 포털 생성 커밋 `5cba551`과 로컬 최신 게임 커밋을 충돌 없이 이력 보존 병합했다. 자동 생성된 별도 배포 파일을 제거하고 기존 테넌트 검증 workflow 하나를 유지한다.
- 기존 GitHub Secret 이름을 fallback으로 연결하여 배포 토큰을 출력하거나 복사하지 않는다.
- `npm.cmd test`: 203/203 통과.
- `npm.cmd run build` 및 실제 테넌트 ID를 지정한 `npm.cmd run build:azure`: 통과. 게임 번들은 기존 최종 버전과 동일.
- 기존 사용자 서버 4180/4181/4182를 보존하기 위해 임시 `tmp/azure-release.playwright.cjs`로 4196/4197에서 검증했다.
- 관리자 23/23 통과. 일반 164개 중 163개 통과, 검증 도중 빌드 산출물을 갱신한 순간 도시 테스트 한 건에 404가 발생했다. 산출물 갱신을 멈추고 해당 테스트만 재실행하여 1/1 통과했다. 게임 코드 변경은 필요하지 않았다.
- 이번 작업에서 시작한 임시 테스트 서버만 종료했다. 기존 사용자 서버는 유지한다.
- `git diff --check` 통과. 사용자 목업 HTML 수정, 기존 untracked 결정 문서 및 임시·캐시 파일은 제외한다.
