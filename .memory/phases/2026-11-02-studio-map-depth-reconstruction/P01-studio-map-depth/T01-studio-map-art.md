# Task: T01 네 지역 2.5D 맵 자산

## Status: done

## Goal

숲·눈·도시·혼돈의 중경·길·전경을 옆모습 2.5D 일러스트로 다시 제작하고, 원본 파일을 보존한 채 각 지역의 동·서 패널이 3600 월드 너비에서 이어지도록 픽셀 계약으로 검증한다. 이 Task는 화면 컴포넌트를 변경하지 않는다.

## Decision Summary

- 색감과 주요 랜드마크는 기존 지역 그림을 유지하며 길의 윗면·측면, 중경 물체의 두께, 가까운 전경의 접지를 새로 그린다. 하늘·원경은 기존 자산을 쓴다.
- 새 자산은 관리자 전용 디렉터리에 둔다. 일반 게임의 `assets/maps/*-layers`와 `src/game/assetCatalog.js`는 수정하지 않는다.

## Implementation

### I01. 지역별 투명 레이어 24개 제작

- Related Files:
  - `assets/maps/studio-depth/forest/{midground,path,foreground}-{west,east}.png` :: `forest studio panels` — 숲 전용 6개; new.
  - `assets/maps/studio-depth/snow/{midground,path,foreground}-{west,east}.png` :: `snow studio panels` — 눈 전용 6개; new.
  - `assets/maps/studio-depth/city/{midground,path,foreground}-{west,east}.png` :: `city studio panels` — 도시 전용 6개; new.
  - `assets/maps/studio-depth/chaos/{midground,path,foreground}-{west,east}.png` :: `chaos studio panels` — 혼돈 전용 6개; new.
  - `assets/maps/forest-layers/{distant,midground,path,foreground}.png`, `assets/maps/{snow,city,chaos}-layers/*.png` :: `reference artwork` — 색·랜드마크·질감 참고만; read-only.
  - `src/game/sceneCatalog.js` :: `SCENE_PROFILES` — 지역 팔레트 참고만; read-only.

#### Details

- **Signatures & Types**:
  ```ts
  type Area = 'forest' | 'snow' | 'city' | 'chaos';
  type Role = 'midground' | 'path' | 'foreground';
  type Side = 'west' | 'east';
  type AssetPath = 'assets/maps/studio-depth/{area}/{role}-{side}.png';
  // 각 파일: PNG RGBA, nativeWidth=1536, nativeHeight=1024.
  ```
- **Data & Schema Fields**:
  - 24개 파일 모두 1536×1024, 3:2 비율, 투명 채널 보존. 중경은 전체 픽셀의 최소 35%, 길은 최소 65%, 전경은 최소 72%가 투명해야 한다. 전경 상단 80%는 최소 99% 투명하게 하여 HUD·조준선·적을 가리지 않는다.
  - `path`는 원본 픽셀 y=768(높이의 0.75)에서 중앙 2~98% 폭의 최소 95%가 불투명해야 한다. 이 행은 월드 `groundY=900`에 정렬된다.
  - 월드 배치 계약: west x=-600, east x=1500, 각각 width=2700. 1536×1024 이미지의 월드 높이는 1800이고 y=-450이므로 원본 y=768이 월드 y=900에 닿는다. 패널은 월드 x=1500~2100에서 600 겹친다. 양 끝 및 겹침 구간에 빈 줄·강한 이음새가 없어야 한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 원본 네 지역의 실제 PNG를 보고 팔레트·랜드마크·도로 높이를 기록한다. 숲은 한 장의 기존 파노라마를 반복 잘라 붙이지 말고 두 신규 패널로 연속 장면을 설계한다. Snow/City/Chaos의 기존 동·서 구획과 원근을 참고한다. 비트맵을 새로 만들거나 편집할 때는 `imagegen` skill의 도구를 사용한다.
  2. Core Processing: 각 지역에 중경 2장, 길 2장, 전경 2장을 만든다. 중경은 평면 나열 대신 겹친 지형 단면과 두께가 보이는 나무·건물·구조물을 배치하되 화면 중앙의 발사·적 시야는 열린다. 길은 월드 y≈840~970의 윗면과 y≈970~1034의 측면을 그림 안에 포함하고, 실제 지면 y=900 위로 쿠키·발사대·장애물의 접촉점이 보이게 한다. 전경은 월드 y≈1010 이후의 낮은 장식과 좌우 가장자리 프레이밍으로 깊이를 만들며 투사체·몬스터를 가리지 않는다.
  3. Area composition: Forest는 청록 하늘(#72d5d3), 분홍빛 길(#deaa83), 왼쪽 쿠키 오두막·침엽수·폭포와 열린 중앙 산맥을 유지한다. Snow는 푸른 하늘(#55adfd), 설원 길(#bad4e5), 눈 덮인 오두막·침엽수·얼음 단면을 유지한다. City는 보라 노을(#8378c8), 석조 길(#927da5), 왼쪽 제과점과 중앙 열린 노을/도시 스카이라인을 유지한다. Chaos는 남보라 하늘(#212671), 보라 길(#9f8abd), 부유 수정섬·균열·수정 장식을 유지한다. 도시 중앙 노을 하늘은 열어 두고 좌우 랜드마크를 새 중경에 연결한다. 주요 랜드마크를 동일한 모양으로 반복하지 않는다.
  4. Error & Exception Handling: 생성물이 불투명한 배경을 포함하거나 1536×1024·투명도·기준선 계약을 어기면 채택하지 말고 해당 자산을 다시 제작한다. 원본 파일을 덮어써 우회하지 않는다.
  5. State Transition & Return: 24개 최종 PNG만 지정 폴더에 둔다. 게임 상태·카메라·충돌 코드 변화는 없다.

### I02. 신규 자산 매니페스트와 픽셀 검증

- Related Files:
  - `assets/maps/studio-depth/{forest,snow,city,chaos}/layers.json` :: `StudioDepthManifest` — 지역별 6자산과 배치 계약; new.
  - `scripts/verify-studio-map-art.cjs` :: `validateStudioManifest`, `verifyStudioMapArt` — 파일·알파·기준선 검증 CLI; new.
  - `scripts/verify-region-art.cjs` :: `inspectImage` — 기존 PNG 디코드/알파 측정 함수 재사용; read-only.
  - `.memory/asset-reviews/2026-11-02-studio-map-depth-art.md` :: `visual review` — 24개 이미지와 연결부 육안 확인 기록; new.

#### Details

- **Signatures & Types**:
  ```ts
  type StudioDepthManifest = {
    version: 1; area: Area; baselineRatio: 0.75;
    panels: {
      west: { x: -600; worldWidth: 2700 };
      east: { x: 1500; worldWidth: 2700 };
    };
    assets: Array<{
      layer: Role; side: Side;
      file: string; // 정확히 "{layer}-{side}.png"
      width: 1536; height: 1024; alphaMode: 'cutout';
    }>; // 정확히 6개, 모든 Role×Side 조합 1회씩
  };
  function validateStudioManifest(manifest: unknown, area: Area): StudioDepthManifest;
  function verifyStudioMapArt(areas: Area[]): Promise<void>;
  ```
- **Data & Schema Fields**:
  - 4개 `layers.json` 모두 위 스키마의 `version`, `area`, `baselineRatio`, `panels`, `assets`를 정확히 기록한다. 순서는 `midground-west/east`, `path-west/east`, `foreground-west/east`.
  - JSON에 파일 경로는 폴더 상대 이름만 저장한다. 별도의 runtime 상태·API·DB 필드는 없다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: CLI 인수는 `forest|snow|city|chaos|all` 중 하나만 허용한다. 없는 폴더, 알 수 없는 지역/레이어/side, 중복 쌍, 잘못된 파일명·치수·패널 좌표는 즉시 오류로 보고한다.
  2. Core Processing: 기존 `inspectImage(page, filename)`를 재사용해 Chrome에서 PNG 실제 디코드 치수와 알파를 측정한다. 각 파일의 실측 1536×1024와 매니페스트 값 일치, 위 I01의 투명도·기준선 기준, 24개 조합 완전성을 확인한다.
  3. Error & Exception Handling: 실패한 지역/파일/규칙을 한 줄씩 보고하고 비영(非零) 종료한다. 브라우저를 `finally`에서 닫는다. 육안 검토는 픽셀 검사로 대체하지 않는다.
  4. State Transition & Return: 성공 시 통과 개수와 총 바이트를 출력한다. 자산 검토 문서에 네 지역의 동·서 이음새, 주요 랜드마크, 투명 경계, 중심 시야를 기록한다.

## Acceptance Criteria

- [ ] 24개 새 PNG와 4개 매니페스트가 모두 존재하며 기존 자산은 그대로다.
- [ ] 길은 실제 접지 y=900에 맞고 윗면·측면이 그림 자체에서 읽힌다.
- [ ] 네 지역의 색과 랜드마크가 알아보이며, 동·서 이음새와 양 끝에 빈 틈·반복된 주요 랜드마크가 없다.
- [ ] 검증 CLI와 육안 검토 기록이 통과한다.

## Validation

- `node scripts/verify-studio-map-art.cjs all` — 24/24 디코드·치수·알파·기준선 검사 통과.
- `git diff --check` — 자산 매니페스트·검토 문서의 공백 오류 없음.
- 새 24개 PNG를 원본과 나란히 열어 색·랜드마크·연결부를 확인하고 `.memory/asset-reviews/2026-11-02-studio-map-depth-art.md`에 결과 기록 — 자동 픽셀 검사가 놓치는 구도 오류를 막는다.

## Commit Message

```text
feat(studio): 네 지역 입체 맵 일러스트와 검증 계약 추가

Plan: 2026-11-02-studio-map-depth-reconstruction
Phase: P01-studio-map-depth
Task: T01-studio-map-art

- 중경·길·전경의 동서 패널 24개와 매니페스트 제작
- 투명도·기준선·연결부 검증 추가
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `728b280`
