# City Panorama Visibility — Visual Acceptance

Date: 2026-10-22
Decision: prioritize the distant panorama and keep the route below.

## Captures reviewed

| Surface | Viewport | Capture | Observation |
| --- | ---: | --- | --- |
| Gameplay | 1440×900 | `tmp/wide-t03-city-overview-1440.jpg` | The central sunset skyline spans the open middle; bakery and oven frame the sides; route remains distinct below the skyline and HUD does not cover the center. |
| Gameplay | 390×844 | `tmp/wide-t03-city-overview-390.jpg` | Panorama remains visible in portrait arena, though the existing responsive arena is naturally smaller. HUD stays in its established positions. |
| Map studio | 1440×900 | `tmp/map-studio-city-overview-1440.jpg` | All five layers visible; scenic center is open and the road is retained below it. |
| Map studio after pan | 1440×900 | `tmp/map-studio-city-pan-1440.jpg` | Panned view retains skyline and route. No abrupt alpha-mask edge or blank strip; repeated panel artwork is visible at the far edge as the existing tiled panorama behavior. |

Images are raw browser captures from the app; no injected CSS or postprocessing was used. The studio panorama itself has transparent checkerboard below the registered artwork, consistent with the existing asset bounds.

## Validation

- `npm.cmd test`: 105 passed, 0 failed.
- Production browser region/layer and scene-depth suite: 26 passed.
- Map-studio browser suite: 8 passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed.

The repository's usual preview ports 4180/4181 were already occupied. Verification used isolated ports 4191/4192 and did not alter those existing services.
