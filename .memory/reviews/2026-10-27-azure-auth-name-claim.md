# Azure 실배포 리더보드 401 진단

- 전체 GitHub Actions verify 및 deploy: https://github.com/kmth1214-hub/consultingTae/actions/runs/40443808608 성공.
- 익명 게임, API, 정적 파일은 모두 회사 로그인으로 이동한다. 실제 회사 계정 로그인 후 게임 메뉴가 표시된다.
- 인증된 `/api/leaderboard`는 401과 승인된 회사 계정으로 로그인하라는 API 메시지를 반환한다.
- `/.auth/me`의 `identityProvider=aad`, `authenticated` 역할 및 단일 테넌트 issuer를 확인했다. `userDetails`는 이메일이며, 개인 정보 없는 구조 요약으로 보면 Entra의 `name` claim은 사람 이름이고 URI 형식 name claim은 이메일이다.
- 현재 `userDetailsClaim`이 URI 형식을 선택해 서버의 이메일 표시 금지 정책과 충돌한다.
- Microsoft 문서: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information (API 전달 헤더에는 claims 배열이 없음), https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom (Entra v1의 `userDetailsClaim`).
- 예상: `userDetailsClaim=name`으로 바꾸고 새 로그인 세션을 만들면 `userDetails`가 비이메일 이름이 되어 API가 200을 반환한다. 실패하면 다음 가능성은 API의 역할/공급자 값 불일치, 배포 설정 반영 지연 순으로 확인한다.
- 합성 Entra claim을 실제 SWA 설정 선택값과 리더보드 핸들러에 연결한 재현 테스트를 추가했다. 수정 전 401로 실패, `userDetailsClaim=name` 수정 후 200으로 통과했다.
- Azure 설정 생성 스크립트에서도 claim 선택을 검증하도록 했다. 전체 204개 테스트와 Azure 빌드가 통과했고, 산출물에서 `userDetailsClaim=name`을 확인했다. 실제 배포·인증 재검증은 T02에서 수행한다.
