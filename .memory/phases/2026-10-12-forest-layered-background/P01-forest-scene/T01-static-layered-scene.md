# Task: T01 Static Layered Forest Scene

## Status: done

## Goal
`cookie-roguelike-mockup.html`의 숲 전투를 독립 PNG 레이어와 수평 흙길로 구성하여 움직임 없이도 앞뒤 거리를 식별할 수 있게 한다.

## Decision Summary
- 숲만 옆에서 보는 무대로 재구성한다. 녹색 중심의 동화풍 나무·과자집·폭포 모티프를 유지한다.
- 원본 PNG는 보존한다. 새 그림은 투명 레이어로 제작하고 전투 배우 및 좌표를 변경하지 않는다.

## Implementation

### I01. Layer artwork
- Related Files:
  - `assets/maps/forest_theme.png` :: 원본 참고 이미지; read-only.
  - `assets/maps/forest-layers/distant.png` :: 하늘·먼 산·먼 숲; new.
  - `assets/maps/forest-layers/midground.png` :: 중간 나무·과자집·폭포; new.
  - `assets/maps/forest-layers/foreground.png` :: 가장자리 풀·가지; new.
  - `.memory/validation/2026-10-12-forest-layered-background/assets.md` :: 실제 이미지 크기·제작 프롬프트·검사 결과; new documentation.

#### Details
- **Signatures & Types**: 런타임 함수 없음. 출력은 PNG bitmap asset.
- **Data & Schema Fields**: 공통 3:2 캔버스, 권장 1536×1024. 생성기가 다른 크기를 출력하면 세 파일의 동일 비율·구성을 확인하고 실제 크기를 assets.md에 기록한다. `distant.png`는 불투명, 나머지는 실제 alpha channel을 가진 투명 이미지. 이미지 안에 텍스트·테마 배지·캐릭터·UI·체커보드·합성된 플레이 도로를 넣지 않는다.
- **Execution Flow / Logic**:
  1. 이미지 제작 단계에서 imagegen 스킬을 읽고 사용자에게 적용 사실을 알린다. 원본을 `view_image`로 확인한다. 이미지를 직접 편집/생성할 때 image generation tool을 사용하며 Python으로 그림을 대체 제작하지 않는다.
  2. 원본을 스타일 참고로 삼되 측면 시점으로 새 구성한다. 동일 팔레트·광원·수평선으로 세 이미지를 각각 제작한다. 배경 생성은 불투명, 중경·전경은 `transparent_background:true`를 지정한다.
  3. 먼 풍경: 밝은 녹청색 하늘, 겹치는 먼 산과 저대비 숲. 중경: 조금 더 진한 나무와 작은 과자집, 오른쪽 위/중간에 폭포; 중앙·하단은 비워 전투 가독성 확보. 폭포 위치는 캔버스 x=78~84%, y=26~52%의 장식 구역에 맞춘다. 전경: 좌우 바깥 12%와 하단 8%에 짙은 잎과 가지. 중앙 x=12~88%, y=15~92%는 투명하여 배우를 가리지 않게 한다.
  4. 생성 결과의 시점·팔레트·alpha·중앙 여백을 직접 검사하고 미달 시 재생성한다. 모든 에셋은 최종 위 경로에 복사한다. 원본을 덮어쓰지 않는다. 실패 시 기존 숲 배경을 먼저 지우지 말고 작업을 미완료로 기록한다.

### I02. Static scene integration and dirt road
- Related Files:
  - `cookie-roguelike-mockup.html` :: `.arena-world`, `#arenaWorld`, `#areaRoad`, `.area-depth-layer`, forest selectors, `setArenaArea`, `AREA_BACKGROUNDS`; modify only forest presentation/integration.

#### Details
- **Signatures & Types**:
  - `setArenaArea(area: string): boolean` 기존 계약 유지.
  - 새 DOM: `#forestScenery.forest-scenery`와 `[data-forest-layer="distant"|"midground"|"foreground"]` 세 요소. 모든 장식 `aria-hidden="true"`, `pointer-events:none`.
- **Data & Schema Fields**: `data-forest-layer`는 위 세 문자열만 허용, 각 요소 `data-parallax`는 다음 Task에서 distant=0.18, midground=0.50, foreground=1.08로 사용. null 없는 고정 DOM. 서버/API 스키마 없음.
- **Execution Flow / Logic**:
  1. `#forestScenery`를 `#arenaWorld` 첫 자식에 넣는다. 원래 world의 160% 크기·transform-origin·카메라 transform·배우의 offset 좌표를 유지한다.
  2. 컨테이너 absolute inset:0, z-index:0; 레이어 absolute inset:-40%, background-size:100% 100%, background-repeat:no-repeat, transform-origin:50% 50%. 세 이미지의 동일 구도를 활용한다. 내부 순서 distant, midground, foreground. 큰 overscan은 카메라 이동 시 틈을 예방하며 배우 위에 새 stacking context를 만들지 않는다.
  3. 기본적으로 `.forest-scenery`는 display:none. `#arena[data-area="forest"][data-forest-ready="true"] .forest-scenery`에만 표시한다. 이 경우에만 world의 배경 이미지를 제거하고 숲 배경색을 둔다. `AREA_BACKGROUNDS` 네 경로는 그대로 보존하여 fallback과 다른 지역에 사용한다.
  4. 새 함수 `prepareForestScenery(): Promise<boolean>`를 만든다. 세 파일을 `Image`로 preload, 모두 load 시 `arena.dataset.forestReady='true'`; 하나라도 error면 false로 설정하고 기존 PNG와 도로가 보이도록 유지. 성공/실패 후 항상 boolean으로 settle. 호출은 초기 setup 시 한 번이며 DOM이 없으면 false. 다른 지역에서 준비가 끝나도 forest selector로만 화면 변경. 초기화 시 `setArenaArea` 기존 기능에 영향 없이 호출한다.
  5. 성공한 숲에서만 기존 `.area-depth-layer`와 기존 SVG road의 기존 도형을 숨긴다. `#areaRoad`를 통째로 숨기지 않고 신규 `g.forest-road`를 추가하여 기존 viewBox `0 0 1000 600`과 preserveAspectRatio=none 유지. 기존 도형·gradient와 다른 지역 selector는 보존한다. forest road 기본 display:none, 준비된 숲에서만 표시한다.
  6. 흙길은 기존 도로의 x=90~910, y=405~537 영역에 맞춰 수평·연속형으로 그린다. 상단 흙 #bd8d58, 단면 #79523b, 아래 음영 #49392d, 가장자리 풀 #638451. 잔풀은 상단 가장자리에 짧은 장식으로만 배치한다. 배우의 위치를 바꾸거나 지형 충돌을 추가하지 않는다.
  7. 기존 `.launch-pad` z3, trajectory z3, monsters z4, projectile z6, caption z6를 보존한다. 레이어 구조와 static scene만 추가하고 camera/aim/shot 함수는 변경하지 않는다.
  8. 이미지 실패 시 새로운 흙길·레이어 모두 비활성화하고 기존 숲 장면으로 복원한다. CSS rule은 forest 및 ready로 한정하여 snow/city/chaos에 새 요소가 보이지 않게 한다.

## Acceptance Criteria
- [x] 세 그림이 실제 별도 PNG이며 중경·전경에 투명 여백이 있다.
- [x] 숲은 옆에서 보는 깊이 있는 무대와 연속 수평 흙길로 보인다.
- [x] 적·발사대·조준선은 가려지지 않고 world 좌표는 보존된다.
- [x] 이미지 오류 시 기존 숲으로 복귀하며 나머지 지역·bonus는 기존 화면을 유지한다.

## Validation
- Windows PowerShell execution: use `node .memory/validation/2026-10-12-forest-layered-background/check-static.cjs` for the PNG/script checks below. The equivalent `node -e` commands lose embedded quotes under the installed legacy PowerShell native argument marshalling. The saved validator avoids that shell issue and additionally confirms protected camera/aim/area functions were not changed.
- `node -e 'const fs=require("fs"); for(const n of ["distant","midground","foreground"]){const b=fs.readFileSync("assets/maps/forest-layers/"+n+".png"); if(b.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")throw Error(n); console.log(n,b.readUInt32BE(16),b.readUInt32BE(20),b[25]);}'` — PNG 크기와 color type 출력. 중경/전경 color type 4 또는 6 및 실제 투명 픽셀은 이미지 시각 검사로 확인.
- `node -e 'const fs=require("fs"),vm=require("vm"); const h=fs.readFileSync("cookie-roguelike-mockup.html","utf8"); for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]); console.log("inline scripts OK");'` — 문법 오류 없음.
- `git diff --check` — whitespace 오류 없음.
- `npx --yes http-server . -a 127.0.0.1 -p 4173 -c-1` — 브라우저에서 `http://127.0.0.1:4173/cookie-roguelike-mockup.html` 열기. 숲의 전체 장면과 카메라 두 클로즈업, `setArenaArea('snow'|'city'|'chaos')` 각각 검사. 이미지 요청 하나를 차단한 뒤 reload하여 fallback 확인. 캡처와 검사 결과를 assets.md에 기록.

## Commit Message
```text
feat(forest): build layered side-view scenery and dirt road

Plan: 2026-10-12-forest-layered-background
Phase: P01-forest-scene
Task: T01-static-layered-scene

- Add independent forest scenery artwork with transparent decoration
- Preserve combat coordinates and other area backgrounds
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — PNG/alpha, syntax, diff, real Chrome full/focus/other-area/image-error checks. Evidence: `.memory/validation/2026-10-12-forest-layered-background/assets.md`.
- commit: pending

## Implementation Notes
- Transparent midground/foreground use centered background-size55.555556% inside the180% overscan box to keep their edge motifs visible; opaque distant uses100%.
- Ready forest world overflow is visible so overscan covers existing camera framing, while outer arena still clips. Feathered masks avoid hard transparent artwork bounds in focus shots.
- These narrowly scoped layout corrections preserve the intended composition and all actor/camera/aim coordinates. T02/T03 must retain the sizing distinction and use world-normalized waterfall coordinates; see assets.md.
