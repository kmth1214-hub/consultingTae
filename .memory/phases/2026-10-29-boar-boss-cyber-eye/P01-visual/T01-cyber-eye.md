# Task: T01 숲 보스 기계 눈

## Status: done

## Goal
보스 멧돼지의 눈 한쪽에만 기계 장식을 배치해 원본 얼굴과 표정을 드러낸다.

## Decision Summary
- 초콜릿 멧돼지 PNG는 유지한다.
- 다른 지역 보스의 갑옷과 게임 판정은 유지한다.

## Implementation

### I01. 보스 오버레이
- Related Files:
  - `src/components/MonsterGroup.jsx` :: `BossArmor` — `pointy-boar` 분기의 얼굴을 가리는 투구·판금·엄니 SVG를 한쪽 기계 눈 SVG로 교체; modify.
  - `src/styles/arena.css` :: `.boss-armor` — 기존 SVG 배치 재사용; read-only.
- Signatures & Types: `BossArmor({ kind: string }): ReactElement`; 변경 없음.
- Data & Schema Fields: 새 상태나 데이터 필드 없음.
- Execution Flow / Logic: `pointy-boar` 분기에서 `viewBox="0 0 100 100"` 기준 그림의 왼쪽 눈(화면 왼쪽, 약 x=60, y=44)만 금속 테두리와 붉은 렌즈로 덮는다. 주둥이·반대쪽 눈·귀를 가리지 않는다. 다른 분기는 유지한다.
- Error Handling: 이미지 로드 실패 시 기존 `MonsterArt` 폴백을 유지한다.

### I02. 검증
- Related Files:
  - `tests/e2e/giant-bosses.spec.cjs` :: 숲 보스 기존 스모크 — 기존 검증만 실행; read-only.
- `npm run build`와 숲 보스 브라우저 스모크를 실행하고 생성된 스크린샷을 확인한다. 전투 시스템 전체 재검증은 하지 않는다.

## Acceptance Criteria
- [x] 큰 갑옷 판이 얼굴을 가리지 않는다.
- [x] 기계 눈은 한쪽 눈에만 나타나고 일반 멧돼지는 기존 그림 그대로다.
- [x] 빌드와 숲 보스 스모크 통과.

## Validation
- `npm run build`
- `npx playwright test tests/e2e/giant-bosses.spec.cjs --grep forest --config tmp/playwright-regional-verify.config.cjs`

## Commit Message
```text
feat(boss): 숲 보스 한쪽 눈을 기계 눈으로 교체

Plan: 2026-10-29-boar-boss-cyber-eye
Phase: P01-visual
Task: T01-cyber-eye

- 얼굴을 가리던 갑옷 대신 보스 전용 기계 눈 추가
- 숲 보스 화면과 빌드 확인
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: this task's local commit
