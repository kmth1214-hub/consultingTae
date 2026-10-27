# Azure 회사 계정 실배포

- Decision: [결정](../decisions/2026-10-27-azure-production-deployment.md)
- Phase: [P01-release](../phases/2026-10-27-azure-production-deployment/P01-release/phase.md)
- T01: 원격 자동 생성 workflow 이력을 보존하여 병합하고 배포 경로를 통합한다. 최신 게임 소스의 테스트·빌드를 검증한 뒤 한국어 커밋한다.
- T02: 기존 Azure/Entra 리소스와 GitHub 설정을 연결하고 main을 push한다. Actions 배포, 익명 로그인 이동, 인증된 게임 및 리더보드 동작을 확인하고 기록한다.
- 새 DB/컴퓨팅 리소스 및 게임 기능은 추가하지 않는다.
