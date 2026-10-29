# Decisions: BGM Release Gate

- Date: 2026-10-29
- Status: Confirmed for the release gate; Azure deployment timing is pending user choice.

## D01. Music in the deployed game
- **Chosen by user**: 이번 Azure 배포판에서는 새 BGM을 제외한다.
- **Rationale**: 현재 합성 음색은 로컬에서 더 검토할 수 있고, 배포판의 전투에는 음악을 노출하지 않는다.

## D02. Local review remains available
- **Inferred from request and prior decision**: 개발 서버의 사용자 게임 및 관리자 테스트 플레이에서는 BGM을 계속 들어볼 수 있게 둔다. 음악 제작 결과·커밋은 삭제하지 않는다.
- **Rationale**: 이후 음색을 개선하거나 배포할 때 다시 처음부터 만들 필요가 없다.

## D03. Explicit production gate
- **Inferred from code**: Vite의 `import.meta.env.DEV`는 로컬 개발에서만 true다. production build의 BGM은 `VITE_ENABLE_BGM=true`를 명시한 경우에만 켠다. Azure workflow는 현재 배포에서 `VITE_ENABLE_BGM=false`를 명시한다.
- **Rationale**: 로컬 게임과 Azure 배포의 동작을 안전하게 분리하고, 이후 사용자가 승인하면 빌드 설정 한 곳에서 켤 수 있다.

## D04. Existing release content
- **Verified from Git**: `main`은 `origin/main`보다 20개 커밋 앞서 있으며, 그 대부분은 개발 전용 관리자 시범판이다. 새 음악을 끄면 일반 플레이 화면의 변화는 크지 않다. 사용자 게임의 몬스터 위치 개선은 아직 구현되지 않았다.
- **Boundary**: 배포 시점(현재 상태를 먼저 배포할지, 몬스터 배치 개선 후 배포할지)은 사용자에게 별도로 물었다. 이 결정 문서 자체는 배포를 승인하지 않는다.
