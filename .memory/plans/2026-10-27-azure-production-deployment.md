# Azure 회사 계정 실배포

- Decision: [결정](../decisions/2026-10-27-azure-production-deployment.md)
- Phase: [P01-release](../phases/2026-10-27-azure-production-deployment/P01-release/phase.md)
- T01: 원격 자동 생성 workflow 이력을 보존하여 병합하고 배포 경로를 통합한다. 최신 게임 소스의 테스트·빌드를 검증한 뒤 한국어 커밋한다.
- T02: 기존 Azure/Entra 리소스와 GitHub 설정을 연결하고 main을 push한다. Actions 배포, 익명 로그인 이동, 인증된 게임 및 리더보드 동작을 확인하고 기록한다.
- T03(추가): 첫 원격 검증에서 발견한 가상 시계 왕복 비용과 8비트 색상 보간 차이를 안정화하고 전체 CI를 다시 확인한다. 실행 순서는 T01 → T02 설정 연결 → T03 검증 보완 → T02 최종 배포 검증이다.
- T04(추가): 실배포 로그인에서 발견한 Entra 표시 이름 claim 불일치를 바로잡아 회사 계정의 리더보드 401을 해결한다. T02 완료 전에 검증한다.
- 새 DB/컴퓨팅 리소스 및 게임 기능은 추가하지 않는다.
