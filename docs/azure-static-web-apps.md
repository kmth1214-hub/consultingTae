# Azure Static Web Apps 배포 안내

이 프로젝트는 Vite 정적 사이트와 `api/`의 Azure Functions 리더보드 API를 Azure Static Web Apps에 함께 배포합니다. 배포 사이트는 Microsoft Entra 로그인을 요구하고, 지정한 회사 테넌트의 계정만 허용하도록 구성합니다.

## 필요한 Azure/GitHub 설정

1. Azure에서 프로젝트용 **Standard** Static Web App을 준비하고 GitHub 저장소 `kmth1214-hub/consultingTae`, 배포 브랜치 `main`을 연결합니다. 커스텀 Entra 인증은 Standard 플랜이 필요합니다.
2. 같은 Azure 구독에 Storage Account와 `LeaderboardRecords` Table을 만듭니다. 연결 문자열을 Static Web App의 API 환경 변수 `LEADERBOARD_STORAGE_CONNECTION_STRING`에 저장합니다. 필요하면 `LEADERBOARD_TABLE_NAME`도 지정합니다.
3. 회사 테넌트에서 단일 조직 계정용 Entra 앱 등록을 만들고, 지원 계정 유형을 이 조직 디렉터리의 계정으로 제한합니다. 웹 리디렉션 URI를 `https://<STATIC_WEB_APP_HOST>/.auth/login/aad/callback`으로 등록합니다.
4. Static Web App의 환경 변수에 `ENTRA_CLIENT_ID`와 `ENTRA_CLIENT_SECRET`을 등록합니다. 비밀은 Azure 환경 변수에만 저장합니다. 회사 계정으로 로그인하여 `/.auth/me`의 이름 claim이 표시 이름으로 채워지는지 확인합니다.
5. GitHub 저장소 **Settings → Secrets and variables → Actions**에 다음 값을 등록합니다.

   - Repository variable `ENTRA_TENANT_ID`: 회사 Entra 테넌트 UUID.
   - Repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`: 해당 Static Web App의 배포 토큰.
   - Repository variable `AZURE_DEPLOY_ENABLED`: Azure 리소스, Entra 설정, Table Storage 설정을 모두 마친 뒤 문자열 `true`로 설정합니다. 이 값을 비워두면 workflow는 검증만 하고 배포하지 않습니다.

6. `main`에 변경 사항을 push하거나 Actions에서 `Azure Static Web Apps` workflow를 수동 실행합니다. `verify` 작업이 테스트와 빌드를 통과한 후에만 배포 작업을 시작합니다.

## 접근 제어 확인

`dist/staticwebapp.config.json`은 빌드 때 테넌트 ID를 주입합니다. `/api/*`와 `/*` 경로는 `authenticated` 역할을 요구하고, 익명 요청은 Entra 로그인을 시작합니다. `/.auth/*`와 `/assets/*`는 SPA fallback에서 제외합니다. Azure의 기본 Entra 공급자는 다른 테넌트도 받을 수 있으므로 생성된 테넌트 전용 custom issuer를 유지해야 합니다.

실제 배포 뒤 다음을 점검합니다.

- 로그아웃 상태에서 게임 경로와 정적 자산을 요청하면 회사 계정 로그인으로 이동하는지 확인합니다.
- 회사 테넌트 계정은 게임과 `/api/leaderboard`에 접근할 수 있는지 확인합니다.
- 다른 테넌트 계정은 로그인/앱 접근이 거부되는지 확인합니다.
- Azure API 환경 변수에 Table Storage 연결 문자열이 있고, 기록판 읽기·쓰기가 동작하는지 확인합니다.
- GitHub Actions에서 `verify`와 `deploy`가 모두 성공했는지 확인합니다. 되돌릴 때는 이전 정상 버전의 변경 사항을 다시 push해 workflow를 실행합니다.

## 비밀 관리

테넌트 ID와 앱의 client ID는 secret이 아니지만 배포 설정으로만 사용합니다. Entra client secret, Static Web App deployment token, Storage connection string은 커밋, 이슈, 로그, 채팅에 넣지 않습니다. 이미 노출된 자격 증명은 Azure에서 폐기·회전한 뒤 새 값으로 설정합니다.
