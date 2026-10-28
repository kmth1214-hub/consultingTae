# Task: T01 지역 원곡과 재생 엔진

## Status: done

## Goal
숲·눈·도시·혼돈의 60~75초 반복 악보와 보스 변주를 자체 합성해 브라우저에서 재생·일시정지·음량 변경할 수 있는 독립 엔진을 제공한다.

## Decision Summary
- Web Audio API로 원곡을 실시간 합성한다. 동화풍 현악·목관·종·타악 음색을 공유하고 혼돈에 불협·전자음을 추가한다.
- 32마디, 4/4, BPM 숲 112(68.57초)·눈 104(73.85초)·도시 120(64초)·혼돈 116(66.21초). 보스 변주는 같은 선율·화성을 유지하며 타악·저음·짧은 음표를 늘린다.

## Implementation

### I01. 결정적 지역 악보
- Related Files:
  - `src/game/bgmScore.js` :: `BGM_THEMES`, `buildBgmScore`, `midiFrequency` — 지역별 순수 악보 데이터와 이벤트 생성; new
  - `tests/bgm-score.test.mjs` :: `score tests` — 네 지역·보스 길이와 이벤트 차이 검증; new
#### Details
- **Signatures & Types**:
  ```js
  export const BGM_THEMES; // Record<'forest'|'snow'|'city'|'chaos', Theme>
  export function midiFrequency(midi); // MIDI integer 0..127 -> Hz
  export function buildBgmScore(area, boss = false); // -> Score
  // Score { area:string, boss:boolean, bpm:number, beatsPerBar:4, bars:32,
  //   durationSeconds:number, events:BgmEvent[] }
  // BgmEvent { beat:number, duration:number, midi:number|null,
  //   instrument:'strings'|'woodwind'|'bell'|'bass'|'kick'|'snare'|'hat'|'chaos', velocity:number }
  ```
- **Data & Schema Fields**: `Theme`은 `bpm:number`, `chords:number[8]`(MIDI 뿌리음), `chordIntervals:number[8][3]`, `motif:number[16]`(상대 반음), `leadInstrument`, `drumAccent`를 가진다. 이벤트는 비트 순 정렬, 시드·난수 없음.
- **Execution Flow / Logic**:
  1. 지역 4종 외 값과 boss 비불리언은 TypeError. `midiFrequency`는 A4=440Hz, 범위 밖 값은 RangeError.
  2. 8마디 화성 진행을 4회 반복한다. 숲 Dm/Bb/F/C/Dm/Gm/Bb/A: 짧은 목관 도주 선율·8분 현악. 눈 G/D/Em/C/G/Bm/C/D: 종·상행 목관. 도시 F/C/Dm/Bb/F/Gm/C/F: 장조 선율·행진 타악. 혼돈 Em/C/F#dim/B/Em/Gm/F#dim/B: 반음·불규칙 강세·전자음.
  3. 베이스(1·3박), 화음 패드, 선율, 아르페지오, 킥·스네어·하이햇을 배치한다. 8마디 단위로 악기 밀도·선율 옥타브를 조금 바꾼다. 모든 종료 비트는 128 이하여야 한다.
  4. boss=true면 같은 BPM·화성·길이와 선율 이벤트를 공유하고 8분/16분 타악·저음 강세를 추가한다.

### I02. Web Audio 합성기와 재생 상태
- Related Files:
  - `src/game/bgmSynth.js` :: `scheduleBgmEvent` — 음색별 Oscillator/Noise·Gain 포락선; new
  - `src/game/bgmPlayer.js` :: `createBgmPlayer` — 0.1초 타이머·0.35초 선행 스케줄; new
  - `tests/bgm-player.test.mjs` :: `player tests` — 가짜 오디오 시계·타이머로 전환/중지/오류 검증; new
#### Details
- **Signatures & Types**:
  ```js
  export function scheduleBgmEvent(context, destination, event, when, secondsPerBeat); // -> void
  export function createBgmPlayer({ contextFactory, setTimer, clearTimer, scheduleEvent } = {});
  // -> { setScene(area, boss), setActive(active), setVolume(value),
  //      setMuted(muted), resume(), getStatus(), destroy() }
  // getStatus() -> { area, boss, active, volume, muted, state:'idle'|'playing'|'blocked'|'unavailable' }
  ```
- **Data & Schema Fields**: `volume`은 0..1 실수(기본 .35), `muted:boolean` 기본 false. 기본 contextFactory는 `AudioContext` 또는 `webkitAudioContext`, 둘 다 없으면 unavailable. 타이머/스케줄 함수는 테스트 주입 가능.
- **Execution Flow / Logic**:
  1. `event.duration`은 박 단위이며 `secondsPerBeat=60/bpm`으로 실제 초를 구한다. 현악=완만한 톱니파와 저역 필터, 목관=정현/삼각파, 종=감쇠 정현 배음, 베이스=삼각파, 혼돈=약한 detune, 타악=짧은 잡음/저주파로 표현한다. gain은 시작·끝 0으로 클릭 소음을 막고 최대 레벨을 제한한다.
  2. AudioContext는 실제 재생 시 지연 생성한다. `setScene`은 지역/보스가 달라질 때만 악보 교체·이전 트랙 빠른 감쇠·타이머 재설정; 동일 값은 재시작 금지.
  3. `setActive(false)`는 타이머 중지와 context suspend. `setActive(true)`·`resume()`은 context resume 후 선행 예약. Promise 거부는 blocked 상태로 기록하되 throw하지 않는다.
  4. 타이머는 현재 시각보다 0.35초까지만 예약하고 128박 끝에서 반복한다. 지난 이벤트 중복 없음. `destroy()`는 타이머와 context를 한 번만 정리한다.
  5. master gain으로 음량·음소거를 부드럽게 바꾼다. 잘못된 지역/타입은 TypeError, 범위 밖 음량은 RangeError. 오디오 미지원·재생 거부는 게임 진행을 막지 않는다.
- **Tests**: 4곡 60~75초·정렬·범위·음정, normal/boss 선율 동일·타악 증가, 네 테마 모티프 구분. 가짜 컨텍스트로 시작/정지/중복 scene/보스 전환/음량/차단/파괴 확인.

## Acceptance Criteria
- [ ] 네 지역과 보스 변주가 서로 구분되고 자연스러운 60~75초 길이다.
- [ ] 브라우저 정책·오디오 미지원·재생 오류가 게임을 중단하지 않는다.
- [ ] 외부 음원·추가 패키지가 필요 없다.

## Validation
- `node --test tests/bgm-score.test.mjs tests/bgm-player.test.mjs` — 악보·재생 상태 테스트 통과
- `npm.cmd run build` — Windows PowerShell의 npm.ps1 실행 정책을 우회해 ESM/Vite 빌드 통과

## Commit Message
```text
feat(bgm): 네 지역 원곡과 브라우저 재생 엔진 추가

Plan: 2026-10-28-regional-battle-bgm
Phase: P01-regional-bgm
Task: T01-scores-and-player

- 지역별 32마디 전투곡과 보스 변주 작곡
- Web Audio 합성과 반복 재생 상태 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 단위 테스트 6개, Vite 빌드
- commit: `7a45d84`
