# T04 회사 로그인 표시 이름 claim 수정

- Status: done
- Dependency: T03-ci-regression-stability
- Blocks: T02-azure-live-deployment 리더보드 실검증

## 발견한 결함

- Azure 배포와 로그인은 성공했지만 실제 회사 계정으로 `/api/leaderboard`를 열면 401을 반환한다.
- `/.auth/me`에서 `userDetails`는 이메일이며, Entra의 `name` claim은 사람 이름이다. 현재 `config/staticwebapp.config.template.json`의 `auth.identityProviders.azureActiveDirectory.userDetailsClaim`은 이메일로 해석되는 별도 이름 URI를 선택한다.
- `api/src/leaderboard/principal.js::resolvePrincipal`은 이메일을 공개 순위표에 노출하지 않도록 거부한다. Azure Functions의 `x-ms-client-principal`에는 상세 claims가 없으므로, 이름 선택은 인증 설정에서 바로잡는다.

## 수정 대상 및 스키마

- `config/staticwebapp.config.template.json`의 `auth.identityProviders.azureActiveDirectory.userDetailsClaim`: string `name`으로 바꾼다. 기존 단일 테넌트 issuer, 클라이언트 설정 이름, 인증 경로 정책은 유지한다.
- `tests/api/swa-auth-config.test.cjs`: 실배포에서 관찰한 구조를 개인 정보 없는 합성 claims(`name`=표시 이름, URI name=이메일)로 재현하고 선택한 claim이 비이메일 이름인지 검사한다.
- `scripts/write-swa-config.mjs`: Azure 산출물 생성 시 같은 claim 설정이 유지되는지 검증한다.
- `.memory/current.md`, 본 Task, `phase.md`, 계획 파일과 진단 기록을 갱신한다.
- 기존 Table Storage 레코드 스키마와 `resolvePrincipal`의 이메일 거부 정책은 바꾸지 않는다.

## 검증

- 수정 전 합성 Entra claim 재현 테스트는 401로 실패했고, 수정 후 동일 테스트가 200으로 통과했다.
- `npm.cmd test`: 204/204 통과. Azure 빌드 산출물의 `userDetailsClaim=name` 확인. 실배포 재검증은 T02에서 수행한다.

- `node --test tests/api/swa-auth-config.test.cjs`: 수정 전 실제 설정에서 실패, 수정 후 통과.
- `npm.cmd test`: 전체 단위·API 검사.
- `ENTRA_TENANT_ID=<회사 테넌트 UUID> npm run build:azure`에 해당하는 PowerShell 환경 변수 빌드 후 `dist/staticwebapp.config.json`의 `userDetailsClaim=name` 확인.
- `git diff --check` 및 GitHub Actions 전체 verify/deploy 성공.
- 배포 후 새 로그인 세션의 `/.auth/me`에서 비이메일 표시 이름을 확인하고 `/api/leaderboard`가 200으로 빈 순위표 또는 기록을 반환하는지 검증한다.

## 커밋

```text
fix(인증): 회사 이름 claim을 리더보드 표시 이름으로 사용

Plan: 2026-10-27-azure-production-deployment
Phase: P01-release
Task: T04-entra-display-name-claim
```
