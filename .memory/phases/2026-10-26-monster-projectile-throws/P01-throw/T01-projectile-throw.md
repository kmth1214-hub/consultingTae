# Task: T01 몬스터 포물선 투척

## Status: done

## Goal
일반 투사체 공격이 탄을 준비→놓기→상승→낙하→쿠키 피격으로 보인다.

## Decision Summary
- 게임 계산을 바꾸지 않고 기존 반격 시계에 표시만 연결한다. 준비340/보스특수480, 이동520~1100, 피격520ms 유지.
- 일반 탄은 높은 포물선, 돌진/보스 숨결/과열은 기존 별도 종류다.

## Implementation
### I01. 단일 경로 모델
- Related Files: 신규 `src/game/enemyProjectileMotion.js` :: `createEnemyProjectileArc`, `sampleEnemyProjectile`, `enemyTrailD`
#### Details
- Types: `Arc={source:{x:number,y:number},target:{x:number,y:number},control:{x:number,y:number},height:number,d:string}`. create는 source/target/height의 유한값 검증, height>=0, 무효값 TypeError.
- 일반 height=`clamp(abs(dx)*.12+150,200,440)`; control.y=middle.y-2*height. sample(p)의 y는 선형보간-4*height*p*(1-p), x는 선형보간, tangent angle은 dx/dy미분. p는0..1로 clamp. full d는 M Q.
- enemyTrailD(arc,p,span=.16)는 max(0,p-span)부터p까지 동일 포물선의 부분 quadratic이다. 처음은 빈 d. 샘플은 입력 불변, NaN 거부.
### I02. 렌더링과 발사 동작
- Related Files: `src/components/EnemyResponse.jsx` :: attackStyle/EnemyResponse/tick; `src/components/MonsterGroup.jsx` :: MonsterGroup; 신규 `src/components/EnemyProjectileArt.jsx` :: EnemyProjectileArt; `src/styles/arena.css` :: enemy motion; modify|new
- attackStyle 일반에 `thrown:true,ammo:'jelly'|'ice'|'energy'|'snow'` 추가. 특수/근접에는 없음.
- 일반 source는 attacker.x-size*.25, y-size*.65(몬스터 로컬25%,35%), target은 layout.player.impact. 같은 경로로 위치·각도·지나온 잔상 갱신. 외부 transform은 translate만 유지, 내부 glyph rotate로 기울기 표현. full 경로는 data-trajectory로 관찰 가능.
- EnemyProjectileArt는 jelly 타원/ice 결정/energy 고리/snow 얼룩 원형을 공통 SVG contents로 제공. MonsterGroup의 준비 탄과 실제 탄이 같은 그림이다. 손에 든 탄은 scale(100/enemy.size)로 실제 발사 탄과 월드 크기를 일치시킨다. 좌표는, 소켓(25,35).
- 눈사람/로봇은 어깨(66,64)에서 손(25,35)까지 팔을 그리고, 준비 중 뒤로 들었다가 마지막에 소켓으로 내민다. 뱀/얼음은 팔 없이 탄 응축. 준비 탄은 windup에만 표시, travel 시작에 실제 투사체로 교체. body는 준비 중 후방 기울기→발사 직전 전방 기울기→travel 복귀. 팔/탄 그림은 aria-hidden, 포인터 방해 없음.
- reduced-motion은 기존 짧은 시계/고정 카메라/피격 결과 유지, 추가 팔/탄/body CSS 애니메이션 비활성화. 보스 숨결 직선/과열 낮은 곡선과 근접 돌진 유지.
### I03. 검증
- Related Files: 신규 `tests/enemy-projectile-motion.test.mjs`, 신규 `tests/e2e/monster-throw.spec.cjs`, `tests/e2e/enemy-response.spec.cjs`; new|modify
- 단위: 시작/끝/중앙높이, 정확한 부분곡선과 접선, 역방향/수직/경계/NaN/입력불변.
- E2E: 네 일반 원거리종을 실제 반격으로 진입. 고정시계 windup 준비탄/팔 여부, travel에서 준비탄 사라지고 높은 상승/하강 경로, 피격 직전 HP유지→충돌시HP감소, 중복없음. 모바일 reduced motion/쉴드/기존보스특수 확인.
- 기존 enemy-response 테스트의 고정 control.y-150 가정을 높은 포물선 규칙으로 갱신하고, 잔상은 full data-trajectory와 같은 궤적을 사용하는지 검사한다.

## Acceptance Criteria
- [x] 준비 탄과 발사 동작 후 높은 포물선으로 쿠키에게 도달한다.
- [x] 보스특수/근접/쉴드/HP 시점과 턴 및 reduced motion 회귀 통과.

## Validation
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test monster-throw.spec.cjs enemy-response.spec.cjs shot-review.spec.cjs --config tmp/throw-playwright.config.cjs --workers=2 --timeout=60000` (자체preview4192, 종료 후 자체프로세스/config 정리)
- 일반 투척 준비/상승/하강 스크린샷 확인.

## Commit Message
```text
feat(몬스터): 포물선 투사체와 탄을 던지는 발사 동작 추가

Plan: 2026-10-26-monster-projectile-throws
Phase: P01-throw
Task: T01-projectile-throw

- 몬스터 준비 탄과 발사 소켓 및 투척 동작 연결
- 같은 포물선으로 투사체 위치와 잔상 계산
- 기존 반격 피해와 특수 공격 및 쉴드 동기화 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- validation: 단위 140/140, production build 통과. E2E 28개 범위 통과(반격·리뷰·투척20 + 접근성8, 최종 수정 후 투척5/접근성8 재검증).

## 검증 및 구현 메모
- 일반 공격 안내가 포물선 최고점의 탄을 가리던 기존 배치를 함께 수정했다. 데스크톱 상단, 모바일/낮은 가로 화면 좌측 하단으로 이동하고 최고점 투사체와 안내의 비겹침을 검사했다.
- 원래 투사체는 sine 곡선, 안내는 quadratic으로 서로 달랐다. 단일 Arc 모델과 그 부분 곡선으로 이동/잔상을 일치시켰다.
- 시각 피드백만 변경했다. 반격 단계와 피해/RNG/쉴드 계산은 기존 엔진이 담당한다. reduced motion에서는 새 CSS 애니메이션을 끈다.
- 준비/최고점 이미지를 직접 확인했다. 추가 발견 사항 없음.
