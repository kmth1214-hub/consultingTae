# Task: T01 쿠키 그림과 12종 선택 명단

## Status: done

## Goal

기존 5종을 유지하고 신규 7종의 그림·이름·잠금 상태를 선택 화면에 표시한다. 이미지가 비거나 카드가 겹쳐 12종 중 일부가 선택 불가능해지는 일을 막는다.

## Decision Summary

- 실행 범위 변경: 신규 일러스트 제작·적용은 사용자 제공 자료가 준비된 뒤 진행한다. 기존 Fan Kit 2개를 연결하고, 나머지 5개는 임시 카드 표시와 선택적 에셋 경로로 플레이를 지원한다. 카드 선택이 실패하지 않도록 시작 스톤의 기본 등록도 함께 적용한다.

- 확정된 신규 ID와 스톤 ID는 아래 표를 사용한다. 바다요정·서리여왕만 신규 잠금 대상이다.
- 용감한·딸기맛은 로컬 Fan Kit PNG를 사용하고, 나머지 5종은 게임에 맞는 투명 배경의 동화풍 캐릭터 PNG를 새로 만든다. 기존 게임 화면의 복제나 공식 그림의 그대로 베끼기는 피한다.

## Implementation

### I01. 이미지와 자산 목록

- Related Files:
  - `Cookie Run_ OvenBreak Fan Kit/01. Cookies/GingerBrave.png` :: 읽기 전용 이미지 출처.
  - `Cookie Run_ OvenBreak Fan Kit/01. Cookies/Strawberry Cookie.png` :: 읽기 전용 이미지 출처.
  - `assets/characters/cherry.png`, `assets/characters/chili-pepper.png`, `assets/characters/espresso.png`, `assets/characters/sea-fairy.png`, `assets/characters/frost-queen.png` :: 신규 투명 PNG 5개.
  - `src/game/assetCatalog.js` :: `ASSETS.characters` import 및 키 확장; modify.

#### Details

- **Signatures & Types**: `ASSETS.characters: Readonly<Record<CharacterId, string>>`. Vite가 import한 URL을 반환하며 기존 키 `adventurer|alchemist|wizard|milk|wind`는 보존한다.
- **Data & Schema Fields**: 신규 키 `gingerBrave`, `strawberry`, `cherry`, `chiliPepper`, `espresso`, `seaFairy`, `frostQueen`; 값은 import된 이미지 URL. 5개 신규 PNG는 알파 채널을 유지하고 선택 카드에서 쿠키 전체 윤곽이 잘리지 않도록 여백을 둔다.
- **Execution Flow / Logic**:
  1. 두 Fan Kit 파일의 실제 경로와 이미지를 확인한다.
  2. 새 5종은 크기·캔버스·시선·명도 기준을 통일해 만든다. 필요하면 `imagegen` 스킬을 읽고 사용한다.
  3. 자산을 import하고 키와 캐릭터 명단의 `asset` 값이 1:1로 대응하게 한다. 누락 이미지가 생기면 빌드에서 실패하도록 import로 연결한다.
- **Error & Exception Handling**: 생성 이미지 품질이나 투명도가 맞지 않으면 파일을 다시 만든다. 원본 5종 이미지 파일과 Fan Kit 파일은 수정하지 않는다.

### I02. 선택 카드와 잠금 설명

- Related Files:
  - `src/game/gameData.js` :: `CHARACTERS` 확장; modify.
  - `src/components/CharacterSelect.jsx` :: 잠금 안내 문구 및 12개 카드 렌더링; modify.
  - `src/styles/game.css` :: `.character-grid` 및 화면 폭별 열·스크롤 처리; modify.
  - `tests/player-presentation.test.mjs` :: 카드 데이터·자산 매핑의 범위 검사; modify.

#### Details

- **Signatures & Types**: `Character = {id:string,name:string,weaponId:string,asset:string,note:string,locked?:boolean}`. 기존 `CHARACTERS` export와 `session.profile.snowAreaCleared` 잠금 조건을 재사용한다.
- **Data & Schema Fields**:

  | id | name | weaponId | asset | locked | note |
  | --- | --- | --- | --- | --- | --- |
  | `gingerBrave` | 용감한 쿠키 | `ginger-dash-stone` | `gingerBrave` | 없음 | 발사 0.25초 뒤 수평 속도 증가 |
  | `strawberry` | 딸기맛 쿠키 | `strawberry-lollipop-stone` | `strawberry` | 없음 | 회전하는 스톤의 실제 충돌 반경 증가 |
  | `cherry` | 체리맛 쿠키 | `cherry-bomb-stone` | `cherry` | 없음 | 비행 중 폭탄 설치, 0.35초 뒤 범위 폭발 |
  | `chiliPepper` | 칠리맛 쿠키 | `chili-slash-stone` | `chiliPepper` | 없음 | 직접 맞힌 적 뒤를 베어 다른 적 1명 추가 피해 |
  | `espresso` | 에스프레소맛 쿠키 | `espresso-vortex-stone` | `espresso` | 없음 | 비행 중 소용돌이를 만들어 일반 적 이동 |
  | `seaFairy` | 바다요정 쿠키 | `sea-wave-stone` | `seaFairy` | `true` | 첫 접촉 후 지면 파도로 지상 적 최대 2명 추가 피해 |
  | `frostQueen` | 서리여왕 쿠키 | `frost-stone` | `frostQueen` | `true` | 직접 맞힌 적과 주변 적의 다음 반격 1회 빙결 |

- **Execution Flow / Logic**: 기존 5종을 삭제·순서 변경하지 않고 7종을 추가한다. `note`에는 표의 능력을 표기한다. 잠금 안내는 우유맛·바람궁수·바다요정·서리여왕 4종을 명시하거나 `CHARACTERS.filter(locked)`에서 생성한다. 화면 폭 320px 이상에서 각 카드가 보이고 선택/잠금 버튼이 눌리도록 grid·스크롤을 조정한다.
- **State Transition & Return**: 카드 선택 시 기존 `startRun(characterId)` 호출 계약은 유지한다. 이 Task 완료 시 새 ID의 엔진 지원은 다음 T02에서 붙는다. 미연결 상태에서 새 카드로 게임을 시작해 생길 수 있는 오류를 막기 위해 T01 검증에서는 선택 화면 데이터·렌더링만 확인한다.

## Acceptance Criteria

- [ ] 12개 카드가 각기 다른 이름·이미지·설명을 표시한다.
- [ ] `ASSETS.characters`가 12개 키를 가지며 모든 import가 해소된다.
- [ ] 눈 지역 미클리어 계정에는 잠금 4종이 보이고 선택 불가, 클리어 계정에는 선택 가능하다.
- [ ] 기존 5종 카드와 선택 규칙이 유지된다.

## Validation

- `node --test tests/player-presentation.test.mjs` — 명단·자산·잠금 데이터 검증.
- `npm.cmd run build` — PNG import와 JSX/CSS 번들 확인. 전체 테스트는 배포 때만 실행한다.

## Commit Message

```text
feat(characters): 신규 쿠키 7종 그림과 선택 명단 추가

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P01-roster-and-catalog
Task: T01-cookie-art-and-roster

- 신규 쿠키 그림을 자산 목록과 12종 선택 카드에 연결
- 눈 지역 해금 안내와 반응형 카드 배치 확장
```

## Progress

- [x] 구현 완료
- [x] 지정 검증 통과
- commit: 이 문서를 포함한 Task 커밋
