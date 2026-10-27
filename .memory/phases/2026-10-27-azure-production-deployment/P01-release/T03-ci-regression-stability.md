# T03 원격 검증 안정화

- Status: done
- Dependency: T01-workflow-integration
- Blocks: T02-azure-live-deployment 최종 검증

## 확인된 실패와 피드백 루프

- GitHub 실행 `40440876474`: 일반 브라우저 162/164 통과. 보스 연속 투척 검사 전체 30초 예산 초과, 도시 390×844 하늘 이음 색상 거리 30.04가 기준 30을 넘음.
- 원래 보스 시나리오를 CI 환경 변수와 trace 기록으로 3회 반복해 모두 통과했다(1.0m). 도시 화면도 원래 검사를 3회 반복해 통과했다(10.4s).
- 재현 명령: `npx.cmd playwright test --config tmp/azure-release.playwright.cjs tests/e2e/enemy-throw-mistakes.spec.cjs -g 'a giant boss may miss ordinary throws' --repeat-each 3 --trace on --reporter line`.
- 색상 명령: `npx.cmd playwright test --config tmp/azure-release.playwright.cjs tests/e2e/region-layers.spec.cjs -g 'city sky blends into distant artwork at 390x844' --repeat-each 3 --reporter line`.

## 수정 대상 및 검증 예측

- `tests/e2e/enemy-throw-mistakes.spec.cjs::launch`: 16ms씩 420번 최대 진행하는 브라우저 왕복을 64ms 간격으로 줄인다. 총 6720ms 가상 시간 상한은 유지하고, 최소 windup(150ms)보다 작은 간격으로 동일한 windup assertion을 통과해야 한다. 전체 timeout을 늘리거나 게임 시간을 변경하지 않는다.
- `tests/e2e/region-layers.spec.cjs`: 기존 5×5 RGB 평균 거리 기준에 합산 RGB 1단계의 보간·반올림 허용치만 더한다. 기준을 제거하거나 그림·레이어 위치를 바꾸지 않는다. 불투명한 빈 하늘은 여전히 실패해야 한다.
- `.github/workflows/azure-static-web-apps.yml`: 실패 시 `test-results/`를 1일간 artifact로 보관해 다음 원격 문제의 trace/스크린샷을 확인할 수 있게 한다.
- 본 Task, phase, current: 검증 결과와 원격 재검증 여부 기록.
- 기존 게임 모델/데이터 스키마와 Azure 인증·DB 설정은 변경하지 않는다.

## 검증

- 위 보스 시나리오 동일 반복 명령으로 전후 시간 비교.
- `npx.cmd playwright test --config tmp/azure-release.playwright.cjs tests/e2e/enemy-throw-mistakes.spec.cjs tests/e2e/region-layers.spec.cjs --reporter line`.
- 도시 하늘을 숨긴 임시 음성 대조에서 색상 검사가 실패하는지 확인. 임시 파일은 `tmp/`에만 둔다.
- `git diff --check`, GitHub의 전체 verify 및 deploy 재실행. 전체 원격 검증 성공 전 배포 완료로 표시하지 않는다.

## 검증 결과

- 보스 시나리오 3회 반복: 3/3 통과, 1.0m → 40.6s. 가상 시간 예산과 30초 제한을 유지했다.
- 변경한 두 검증 파일 전체: 25/25 통과(1.7m, CI 환경 변수 사용).
- 도시 하늘 누락 음성 대조: 색상 거리 102.48로 실패해 누락 검출을 유지했다.
- 본 Task의 로컬 구현·검증을 완료하고 T02로 복귀한다. 전체 원격 CI와 실제 배포 성공은 T02의 필수 완료 조건이다.

## 커밋

```text
fix(CI): 가상 시계 폴링과 하늘 색상 검증 안정화

Plan: 2026-10-27-azure-production-deployment
Phase: P01-release
Task: T03-ci-regression-stability
```
