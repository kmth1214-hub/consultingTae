# Diagnosis: Shot Resolution Integrity

- Date: 2026-10-26
- Request: 등급 피해 조정 이후, 비접촉 처치·한 발 두 반격·잘못된 스테이지 전환을 전체적으로 진단/수정.
- Product scope: 현재 React 게임과 관리자 실제 플레이. 사용자 목업 및 out.json은 변경하지 않음.

## Feedback loops and minimisation
1. `node tmp/remote-hit-probe.mjs`: red. 실제 눈1/seed0, 장애물 모두 파괴, 7.5°/.95 발사. candy endpoint x907.910,y813.178인데 collider x1330,y852.16,r38.64인 두 번째 적도 피해4를 받아 죽었다. 반복 탐색을 고정 fixture의 영구 geometry→engine 테스트로 축소했다. 첫 두 적만 생존시키면 잘못된 round-clear도 재현된다.
2. `node tmp/duplicate-shot-probe.mjs`: red 두 번. 동일 물리miss 완료를 리뷰·반격 종료 뒤 재전달하면 accepted:true, secondCounter:true, HP95→90, ammo8→7. 최소 세션 호출로 줄였다. 새 계약에서는 동일 실제 발사를 beginShot로 예약한 후 재전달하여 accepted:false, secondCounter:false, HP95 유지 green.
3. `node tmp/shot-integrity-probe.mjs`: 지역별 geometry+session 경계 검사, 최종 failures:[] green. 원래 probe들은 검증 후 삭제하고 아래 영구 테스트로 대체한다.

## Ranked hypotheses shown before adaptive probes
1. 이전 발사 완료가 새 행동으로 수락됨: 지연 완료를 재전달하면 같은 턴 뒤 추가 탄약/피해가 생길 것.
2. 피해가 실제 경로 종료 지점 뒤로 전달됨: 일반 사탕의 hitIds에 impactDistance 이후 적이 포함될 것.
3. 화면/충돌 좌표 불일치: 표시점과 확정 collider 위치가 같은 세계좌표로 대응하지 않을 것.
4. 결과 확인·반격 완료 재진입: stale/null callback이 라우팅이나 RNG를 추가 실행할 것.

## Findings and fixes
- **Confirmed #2**: planShot의 장애물 없는 branch가 impactDistance는 첫 적으로 잘랐지만 resolvedHits는 전체 경로의 후보를 반환했다. 일반은 실제 첫 접촉1, 창만 최대3. engine에서도 물리 shotMeta의 직접 피해를 Wind 선택 이후 첫1로 제한한다. Wind override 뒤 두 번째 물리 대상이 다시 끼어드는 추가 red 회귀도 green으로 수정했다.
- **Confirmed boundary weakness #1**: 세션이 UI가 보낸 hitIds/shotMeta를 신뢰했고 발사 식별자가 없었다. 이제 beginShot가 현재 상태로 경로를 계산하고 private pendingShot에 저장, 복사본을 화면에 반환한다. fireShot은 shotId+encounterId를 검증하고 저장된 결과로 한 번만 처리한다. 예약 없는 물리 metadata는 거부한다.
- **Confirmed #4**: `completeEnemyResponse(undefined)` / 보스 관련 null 완료에서 optional chaining의 undefined 비교가 통과할 수 있었다. 활성 전환 객체가 없으면 즉시 반환하도록 수정했다. 보상 화면에서 무인자 callback이 보상을 다시 추첨하지 않는 검사도 추가했다.
- **#3 not reproduced**: 실제 planner의 첫 충돌 좌표와 시각 끝점은 같았고, 잘못된 것은 뒤 적까지 포함한 후보 목록이었다. canonical flight 공유로 화면과 판정이 다른 solution을 쓰지 않게 했다.
- **Limit**: 실제 사용자의 브라우저에서 두 번째 완료 신호가 발생한 구체적인 장치/이벤트 순서는 입증하지 못했다. 중복 신호가 들어왔을 때 두 번 반격하는 세션 결함은 확정 재현/차단했다. 브라우저의 최대 파워miss, duplicate pointer-up, resize/hidden 취소, 라운드 진입에서 추가 반격이 없는지 별도로 검증했다.

## Preserve intended effects
- 숲 물체의 실제 적 충돌3, 도시/혼돈 광역 피해, 바람궁수 실제 유도, 창의 실제 관통은 일반 직접 명중과 구분해 유지한다.
- 등급 C0~4/B1·2·3·5·6/A2·4·6·8·10, 불공/능력/점수/회복/쉴드/보스 분리 규칙 유지.
- metadata 없는 abstract controller 호출은 순수 테스트/내부 추상 행동 seam으로 유지하지만 pending 물리 발사 중에는 거부한다. 새로운 실제 UI 기능은 반드시 beginShot→fireShot(token) 또는 cancelShot(token)을 사용해야 한다.

## Regression seams
- `tests/shot-hit-integrity.test.mjs`: 실제 endpoint 뒤 NPC 생존/잘못된 클리어 방지, 창/물리 Wind 경계.
- `tests/shot-resolution.test.mjs`: 동일miss 완료 두 번, stale/cancel/새 발사/새run/새round, 입력 복사본 변조, null completion/RNG, 실제 연쇄.
- `tests/e2e/shot-integrity.spec.cjs`: 실제 렌더링·마우스·시간 흐름으로 원격 피해와 단계 진행, 네 지역 먼miss의 단일반격, resize/hidden/중복pointer-up.
- 기존 metadata를 직접 조립해 session에 주입하던 positive 검사는 실제 beginShot의 planner 결과를 사용하도록 이관했다. 기존 순수 engine의 합성 fixture 검사는 유지한다.
- 기존 geometry 단위 검사가 `near,middle` 동시 피해를 정상으로 기대하던 점을 고쳐 거짓 확신을 제거했다.
- 기존 짧은 피격연출(520ms)을 실시간 연속 조회하던 browser 검사는 병렬 실행 시 지나간 DOM을 검사할 수 있어 fake clock으로 정확한 impact 단계에서 검사하도록 보완했다.
- fastCombat은 화면 흐름용 추상 fixture임을 명시해 물리metadata 없이 엔진에 전달한다. 실제 플레이 테스트는 해당 fixture를 사용하지 않는다.

## Prevention
피해 후보 목록만 검증하면 그림과 전투가 달라도 통과한다. 실제 경로의 종료점·생존 적·round-clear·반격 횟수를 한 경계 테스트에서 함께 확인해야 한다. 세션이 발사를 소유하도록 바꿔 이후 화면 콜백은 결과 확정 권한 대신 예약 id만 전달한다. 더 큰 구조 변경은 이번 수정에 추가하지 않았다.

## Validation
전체 unit195, 일반 브라우저58/관리자13 고유 테스트, final build 통과. 재실행은 변경된 테스트/fixture 또는 최종 엔진 경계에 한해 수행했다. [DEBUG-...] 임시 로그 없음. 원본 재현은 green 확인 후 영구 테스트로 대체. 명령과 결과는 T02 청사진에 기록.
