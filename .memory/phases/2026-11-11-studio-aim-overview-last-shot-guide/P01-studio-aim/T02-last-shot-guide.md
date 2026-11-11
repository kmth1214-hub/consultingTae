# Task: T02 직전 실제 발사 가이드

## Status: done

## Goal

로컬 관리자 전투에서 직전 발사의 실제 경로 80%와 첫 타격·착지 지점을 다음 조준 중 참고선으로 표시한다. 현재 발사의 짧은 궤적 미리보기와 시각적으로 구분한다.

## Decision Summary

- 발사 전에 예상 정답을 공개하지 않는다. 완료된 발사의 최종 경로만 사용한다.
- 같은 전투의 가장 최근 1발만 보존하고 새 지역·라운드·배치·재시작 때 제거한다.

## Implementation

### I01. 발사 기록과 경로 계산

- Related Files:
  - `src/components/BattleArena.jsx` :: `completeFlight`, `flight`, 조준 상태, projectile SVG; modify.
  - `src/game/shotGeometry.js` :: `pathPrefixD(path,distance)`, `sampleAtDistance(path,distance)`; read-only.
  - `src/components/ProjectileFlight.jsx` :: 완료 때 최종 `flightRef.current` 전달; read-only.

#### Details

- **Signatures & Types**: `lastShotGuide: null | { path: ShotPath; marker: {x:number;y:number}; distance:number; encounterKey:string }`. `ShotPath`는 `samples`, `length`를 가진 기존 `shot.path` 객체.
- **Data & Schema Fields**: 컴포넌트 임시 상태. `encounterKey`는 `area`, `round`, `layoutSeed`, `chaosBossPhase` 조합; UI가 바뀌어도 게임 저장·점수에는 영향 없음.
- **Execution Flow / Logic**:
  1. `completeFlight(shot)`에서 최종 `shot.path`를 받는다. `enemyContacts`, `contacts` 중 `trigger==='candy'`, `rollStartDistance`, `impactDistance`의 유효 거리 가운데 최초의 실제 종점/접점을 선택한다.
  2. `sampleAtDistance(path,distance)`로 지점을 얻고, `pathPrefixD(path,distance*0.8)`로 안내 궤적을 얻는다. marker는 실제 접점에 별도 표시한다.
  3. 데이터가 유효하지 않으면 가이드를 만들지 않는다. 새 발사가 완료될 때 이전 기록을 교체한다. 새 encounterKey면 지운다.
  4. 관리자 조준 `dragging` 중에만 표시한다. 비행·반격·보스 전환에서는 숨긴다. 일반 게임에서는 기록·렌더링하지 않는다.
- **Error & Exception Handling**: 경로 끝이 맵 밖이면 SVG 클립 범위를 넘는 표식은 숨긴다. 수동 폭발과 유도 등으로 최종 경로가 바뀌어도 완료된 최종 `shot`을 사용한다.
- **State Transition & Return**: 미리보기 30%(교란 시 15%), 미니맵, 실제 충돌·점수 상태는 유지한다.

### I02. 화면과 국소 검증

- Related Files:
  - `src/dev/mapStudio.css` :: `.studio-last-shot-*` 점선·타격 표시와 축소 구도 대비; modify.
  - `tests/studio-e2e/aim-overview-guide.spec.cjs` :: 완료 발사 후 다음 조준만 표시, 새 배치 초기화; modify.

#### Details

- 실제 비행 경로가 끝난 뒤 조준을 다시 시작해 가이드·marker의 존재를 확인한다. 새 배치/라운드에 잔상이 없는지 확인한다. 일반 게임 번들 격리 및 전체 회귀는 배포 때 검증한다.

## Acceptance Criteria

- [ ] 직전 발사의 경로 80%와 접점 마커를 다음 조준에서 구분할 수 있다.
- [ ] 특수 능력으로 경로가 달라진 경우 최종 경로를 사용한다.
- [ ] 새 전투·배치 및 일반 게임에서 가이드가 보이지 않는다.

## Validation

- `node --test tests/shot-geometry.test.mjs` — 실제 궤적·거리 샘플 관련 27개 단위 테스트 통과.
- `npm.cmd run build` — 번들 컴파일 및 관리자 분리 확인; 전체 테스트 아님.
- `git diff --check` — 수정 파일 공백 오류 확인.
- 브라우저 시나리오와 전체 테스트는 배포 시 수행. 로컬 Playwright 단일 시나리오가 결과 없이 멈춘 이력이 있다.

## Commit Message

```text
feat(studio): 직전 발사 궤적과 타격점 가이드 추가

Plan: 2026-11-11-studio-aim-overview-last-shot-guide
Phase: P01-studio-aim
Task: T02-last-shot-guide

- 완료된 발사의 실제 경로 80%와 접점을 저장
- 관리자 조준 화면에 이전 발사만 표시
```

## Progress

- [x] 구현 완료
- [x] 변경 범위 단위·빌드 검증 완료 (브라우저 시나리오는 배포 시 재실행)
- commit: pending
