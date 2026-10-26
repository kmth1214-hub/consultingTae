import React, { useState, useSyncExternalStore } from 'react';
import { createStudioSession } from './createStudioSession.js';
import { CHARACTERS, REGIONS } from '../game/gameData.js';
import BattleScreen from '../components/BattleScreen.jsx';
import Toast from '../components/Toast.jsx';
import '../styles/game.css';
import '../styles/arena.css';

export default function StudioPlay({ config, onRestart, onExit }) {
  const [store] = useState(() => createStudioSession(config));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const session = { ...snapshot, ...store.actions };
  const [draft, setDraft] = useState(config);
  const select = patch => setDraft(current => ({ ...current, ...patch }));
  const finished = snapshot.screen !== 'battle'
    || Boolean(snapshot.run.terminal && !snapshot.shotReview && !snapshot.enemyResponse && !snapshot.bossTransition);
  return <main className="studio-play" data-dev-tool="studio-battle-play" data-layout-seed={config.seed}>
    <header className="studio-play-toolbar">
      <div className="studio-play-heading"><div><strong>관리자 테스트 플레이</strong>
        <p>한 전투만 테스트합니다. 해금·순위 기록은 저장하지 않습니다.</p></div>
        <button type="button" onClick={onExit}>지도 검토로 돌아가기</button></div>
      <form className="studio-play-options" aria-label="테스트 전투 설정" onSubmit={event => { event.preventDefault(); onRestart(draft, true); }}>
        <label>지역<select aria-label="플레이 지역" value={draft.area} onChange={event => select({ area: event.target.value })}>
          {Object.entries(REGIONS).map(([key, region]) => <option key={key} value={key}>{region.name} 지역</option>)}
        </select></label>
        <label>라운드<select aria-label="플레이 라운드" value={draft.round} onChange={event => select({ round: Number(event.target.value), bossSpecial: false })}>
          {[1, 2, 3].map(round => <option key={round} value={round}>{round}라운드{round === 3 ? ' · 보스' : ''}</option>)}
        </select></label>
        <label>쿠키<select aria-label="플레이 쿠키" value={draft.characterId} onChange={event => select({ characterId: event.target.value })}>
          {CHARACTERS.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select></label>
        <label className="studio-play-special"><input type="checkbox" checked={draft.bossSpecial} disabled={draft.round !== 3}
          onChange={event => select({ bossSpecial: event.target.checked })} />보스 특수 공격부터 확인</label>
        <button type="submit" className="studio-play-primary">선택한 전투 시작</button>
        <button type="button" onClick={() => onRestart(config, false)}>다시 시작</button>
        <button type="button" onClick={() => onRestart(config, true)}>새 배치로 시작</button>
      </form>
      <p className="studio-play-condition">{REGIONS[config.area].name} {config.round}라운드 · {CHARACTERS.find(c => c.id === config.characterId).name}
        {' · '}소모품 각 3개 · 배치 {config.seed}{config.round === 3 && config.bossSpecial ? ' · 다음 보스 공격은 특수 공격' : ''}</p>
    </header>
    <div className="studio-play-game">
      {!finished ? <BattleScreen session={session} /> : <section className="studio-play-result" role="status">
        <h1>{snapshot.run.terminal === 'defeat' ? '테스트 전투 종료' : '테스트 전투 완료'}</h1>
        <p>{REGIONS[config.area].name} {config.round}라운드 · 점수 {snapshot.run.bonusMode ? snapshot.run.bonusScore : snapshot.run.score}</p>
        <p>다른 전투를 선택하거나 다시 시작해서 계속 확인하세요.</p>
        <button type="button" onClick={() => onRestart(config, false)}>같은 배치 다시 플레이</button>
      </section>}
    </div>
    <Toast notification={snapshot.notification} onDismiss={store.actions.dismissNotification} />
  </main>;
}
