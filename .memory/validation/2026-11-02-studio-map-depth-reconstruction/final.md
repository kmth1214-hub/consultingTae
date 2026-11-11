# 관리자 맵 2.5D 로컬 검증

- Date: 2026-11-11
- Scope: 로컬 관리자 미리보기·테스트 플레이, 배포 번들 격리.
- `node scripts/verify-studio-map-art.cjs all`: 24개 레이어 자산 통과.
- `npm.cmd test`: 294개 단위/API 검사 통과.
- `npm.cmd run build`: 성공.
- `node scripts/verify-studio-build.cjs`: 배포 번들에 관리자 렌더러 표시자 없음.
- 관리자 대상 브라우저 검사 6개(숲·눈·도시·혼돈 일치, 비교 유지, 모바일 감소 동작)는 각 테스트 완료 출력 확인. Windows Playwright 실행기가 종료되지 않아 프로세스를 중단했고 최종 요약/exit code는 확인하지 못함.
- 사용자 요청에 따라 전체 관리자/일반 게임 브라우저 회귀와 수동 전 지역 시각 검토는 배포 단계로 이월.

## 남은 배포 검증

- `npm.cmd run test:studio -- --reporter=line`
- `npm.cmd run test:e2e -- --reporter=line`
- 숲·눈·도시·혼돈의 서쪽/중앙/동쪽, 원본 비교, 좁은 화면의 실제 캡처 확인.
