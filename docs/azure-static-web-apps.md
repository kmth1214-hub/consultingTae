# Azure Static Web Apps 배포 안내

이 프로젝트는 Vite 정적 사이트와 `api/`의 Azure Functions 리더보드 API를 Azure Static Web Apps에 함께 배포합니다. 배포 사이트는 Microsoft Entra 로그인을 요구하고, 지정한 회사 테넌트의 계정만 허용하도록 구성합니다.

## 리소스 생성 대상

기존 리소스 그룹 **`grill-me-edu`**를 사용합니다. 아래 구성은 2026-10-27에 생성 상태를 확인했습니다. 이후 재구축할 때도 같은 구성을 기준으로 합니다.

| 항목 | 확인된 이름 | 생성 위치 및 설정 |
| --- | --- | --- |
| Static Web App | `swa-cookie-expedition` | 리소스 그룹 `grill-me-edu`, Standard 플랜 |
| Storage Account | `stcookieexpedition26` | 리소스 그룹 `grill-me-edu`, 일반용 v2·Standard·LRS |
| Table | `LeaderboardRecords` | 위 Storage Account 내부에 생성 |
| Entra 앱 등록 | `cookie-expedition-login` | 회사 Entra 디렉터리의 앱 등록에서 생성 |

Storage Account 이름은 전역에서 고유해야 하므로 이미 사용 중이면 숫자 접미사를 바꿉니다. Entra 앱 등록은 리소스 그룹에 포함되는 리소스가 아니라 회사 디렉터리에서 관리합니다. 현재 구현에는 Cosmos DB와 별도 Function App이 필요하지 않습니다.

포털에서 먼저 `grill-me-edu` → **만들기** → **스토리지 계정**을 선택합니다. 생성 후 해당 계정의 **데이터 스토리지 → 테이블**에서 `LeaderboardRecords`를 생성합니다. 테이블 컬럼을 미리 정의할 필요는 없습니다. 다음으로 같은 리소스 그룹에 Static Web App을 만들고, 발급된 사이트 주소를 이용해 아래 Entra 리디렉션 URI를 등록합니다.

## 필요한 Azure/GitHub 설정

1. Azure의 리소스 그룹 `grill-me-edu`에 프로젝트용 **Standard** Static Web App을 만듭니다. 생성 화면의 배포 원본은 **기타(Other)**를 선택합니다. 저장소 `kmth1214-hub/consultingTae`에는 이미 `.github/workflows/azure-static-web-apps.yml`이 있으므로, 이후 배포 토큰으로 해당 workflow와 `main` 브랜치를 연결합니다. 커스텀 Entra 인증은 Standard 플랜이 필요합니다.
2. 같은 리소스 그룹의 Storage Account에 `LeaderboardRecords` Table을 준비합니다. 연결 문자열을 Static Web App의 API 환경 변수 `LEADERBOARD_STORAGE_CONNECTION_STRING`에 저장합니다. 필요하면 `LEADERBOARD_TABLE_NAME`도 지정합니다.
3. 회사 테넌트에서 단일 조직 계정용 Entra 앱 등록을 만들고, 지원 계정 유형을 이 조직 디렉터리의 계정으로 제한합니다. 웹 리디렉션 URI를 `https://<STATIC_WEB_APP_HOST>/.auth/login/aad/callback`으로 등록합니다. 앱의 **Authentication → 설정 → 암시적 허용 및 하이브리드 흐름**에서 **ID 토큰**을 선택하고 저장합니다. 현재 SWA Entra 로그인에 필요한 설정이며, 액세스 토큰과 퍼블릭 클라이언트 흐름은 추가로 활성화하지 않습니다.
4. Static Web App의 환경 변수에 `ENTRA_CLIENT_ID`와 `ENTRA_CLIENT_SECRET`을 등록합니다. 비밀은 Azure 환경 변수에만 저장합니다. 회사 계정으로 로그인하여 `/.auth/me`의 이름 claim이 표시 이름으로 채워지는지 확인합니다.
5. GitHub 저장소 **Settings → Secrets and variables → Actions**에 다음 값을 등록합니다.

   - Repository variable `ENTRA_TENANT_ID`: 회사 Entra 테넌트 UUID.
   - Repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`: 해당 Static Web App의 배포 토큰. 현재 사이트는 Azure가 이미 등록한 `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_FLOWER_0764F6D00`도 지원하므로 기존 Secret을 그대로 사용할 수 있습니다.
   - Repository variable `AZURE_DEPLOY_ENABLED`: Azure 리소스, Entra 설정, Table Storage 설정을 모두 마친 뒤 문자열 `true`로 설정합니다. 이 값을 비워두면 workflow는 검증만 하고 배포하지 않습니다.

6. `main`에 변경 사항을 push하거나 Actions에서 `Azure Static Web Apps` workflow를 수동 실행합니다. `verify` 작업이 테스트와 빌드를 통과한 후에만 배포 작업을 시작합니다.

## 확인된 리소스 정보 (2026-10-27)

- Static Web App: `swa-cookie-expedition`, Standard, 리소스 그룹 `grill-me-edu`.
- 사이트 주소: `https://calm-flower-0764f6d00.3.azurestaticapps.net`.
- 스토리지 및 테이블: `stcookieexpedition26` / `LeaderboardRecords` 존재 확인.
- 로그인 앱: `cookie-expedition-login`, 단일 테넌트, 실제 사이트의 Web callback 등록 확인.
- 로그인용 클라이언트 비밀 만료일: **2027-04-25**. 만료 전에 Entra에서 새 값을 생성하고 Azure의 `ENTRA_CLIENT_SECRET`을 갱신합니다.
- API는 key2 연결 문자열을 사용합니다. 확인 중 출력된 기존 key1은 사용자 승인 후 2026-10-27에 교체해 무효화했습니다.
- Azure 포털에서 자동으로 생성한 별도 workflow는 기존 검증 workflow로 통합합니다. 배포 확인은 저장소의 `Azure Static Web Apps` Actions 실행을 기준으로 합니다.
- 인증 설정은 Entra `name` claim을 사용자 표시 이름으로 선택합니다. 기존 세션에는 이전 표시 이름이 남을 수 있어 설정 변경 후 다시 로그인해야 합니다. 리더보드에는 이메일 주소를 표시하지 않습니다.
- 2026-10-27의 [배포 실행](https://github.com/kmth1214-hub/consultingTae/actions/runs/40446570436)에서 단위·API, 본편·관리자 브라우저 검증과 Azure 업로드가 성공했습니다. 새 배포에서 익명 게임·API·정적 파일 요청은 회사 로그인으로 이동하는 것을 확인했습니다. 실제 회사 계정의 재로그인 후 비이메일 표시 이름과 리더보드 API의 정상 빈 결과를 확인했고, 게임 화면도 빈 순위표를 표시했습니다. 실제 플레이 기록 저장과 다른 테넌트 계정의 거부는 아직 검증하지 않았습니다.

## 운영 시 갱신할 설정

- GitHub `main`에 push하면 단위·API, 게임 브라우저, 맵 스튜디오 검증을 통과한 산출물을 배포합니다. 실제 사이트는 위의 Azure 주소를 사용합니다.
- `ENTRA_CLIENT_SECRET` 만료 전(2027-04-25)에 새 비밀을 생성해 SWA production 환경 변수에 갱신합니다. GitHub나 React 환경 변수에는 넣지 않습니다.
- Storage 키를 교체할 때 현재 API가 쓰는 키와 다른 키부터 교체하고, 새 연결 문자열을 저장한 뒤 실제 리더보드 조회를 확인합니다.
- 맵 스튜디오 `/__dev/maps`는 개발 서버 전용입니다. Azure 배포에는 사용자 게임과 리더보드가 포함됩니다.

### 현재 배포의 BGM 상태

- Azure workflow의 `VITE_ENABLE_BGM=true` 설정으로 사용자 게임에 숲·눈·도시·혼돈 BGM과 음량·음소거 UI를 포함합니다. 브라우저가 자동 재생을 막으면 게임 화면에서 재생 버튼으로 시작할 수 있습니다.
- 배포 전 검증 작업은 이 설정으로 브라우저 테스트와 정적 빌드를 실행합니다. 음악은 브라우저에서 생성하므로 별도의 오디오 파일이나 Azure 저장소가 필요하지 않습니다.

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
