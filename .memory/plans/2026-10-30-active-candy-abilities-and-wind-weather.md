# Plan: Active Candy Abilities and Wind Weather

## Goal
회사 계정별 눈 지역 해금과 현재 해금된 전용 스톤의 슬롯 무작위 지급을 지원한다. 네 지역의 실제 바람 궤도, 마법사·연금술사 수동 발동, 우유 보호막, 바람궁수 Q/연쇄 폭풍을 하나의 물리·피해 판정에 연결한다. 검증 후 사용자가 만든 `PlayerProfiles` Table을 사용하는 Azure Static Web Apps에 배포한다.

## Decisions
- [Confirmed design](../decisions/2026-10-30-active-candy-abilities-and-wind-weather.md)
- 계획 단계에서는 구현 코드를 수정하지 않는다. `cookie-roguelike-mockup.html` 등 기존 사용자 변경은 건드리지 않는다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 계정 프로필 API·게임 진입·슬롯 보상 | [P01](../phases/2026-10-30-active-candy-abilities-and-wind-weather/P01-account-progression/phase.md) |
| P02 | `done` | 지역 바람, 수동 전용 스톤, 우유·Q 전투 규칙 | [P02](../phases/2026-10-30-active-candy-abilities-and-wind-weather/P02-battle-abilities/phase.md) |
| P03 | `in_progress` | 전체 흐름 회귀 검증과 Azure 배포 | [P03](../phases/2026-10-30-active-candy-abilities-and-wind-weather/P03-release/phase.md) |

## Completion
- 각 Task는 지정 파일만 구현·검증 후 한국어 커밋으로 완료하고 포인터를 전진한다.
- `PlayerProfiles`는 사용자가 같은 Storage Account에 생성했다. API는 기존 연결 문자열을 재사용하며 비밀값은 저장소에 쓰지 않는다.
- `main`에 검증된 커밋을 푸시하고 GitHub Actions `verify`/`deploy` 성공과 로그인 리디렉션을 확인한다. 회사 계정 실사용 검증은 로그인 상태가 있는 경우에만 수행한다.
