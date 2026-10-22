import React, { useEffect, useState } from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import { REGIONS } from '../game/gameData.js';
import { submitMainRunRecord } from '../game/leaderboardClient.js';
import AssetImage from './AssetImage.jsx';

export default function RunResults({ session }) {
  const { summary, run, outcome, selectedCharacter } = session;
  const bonus = session.screen === 'bonus-results';
  const seconds = Math.floor(summary.durationMs / 1000);
  const [recordStatus, setRecordStatus] = useState('saving');
  useEffect(() => {
    if (bonus) return undefined;
    const controller = new AbortController();
    let active = true;
    setRecordStatus('saving');
    submitMainRunRecord({ summary, selectedCharacterId: selectedCharacter.id, signal: controller.signal })
      .then(result => { if (active) setRecordStatus(result.saved ? 'saved' : 'kept'); })
      .catch(error => { if (active && error.name !== 'AbortError') setRecordStatus('failed'); });
    return () => { active = false; controller.abort(); };
  }, [bonus, summary, selectedCharacter.id]);
  return <section className="screen-shell compact-screen results-screen" aria-labelledby="results-title">
    <p className="eyebrow">{bonus ? '혼돈의 원정' : '쿠키 원정 기록'}</p>
    <h1 id="results-title">{outcome === 'defeat' ? '다음엔 조금 더 멀리' : bonus ? '혼돈까지 정복!' : '오븐 밖, 끝까지!'}</h1>
    <AssetImage className="result-cookie" src={ASSETS.characters[selectedCharacter.asset]} />
    <p className="screen-intro">{selectedCharacter.name}와 함께한 여정</p>
    <dl className="result-stats">
      <div><dt>{bonus ? '본편 최종 점수' : '최종 점수'}</dt><dd>{summary.finalScore.toLocaleString()}</dd></div>
      {bonus && <div><dt>보너스 점수</dt><dd>{summary.bonusScore.toLocaleString()}</dd></div>}
      <div><dt>도달 지역</dt><dd>{REGIONS[summary.furthestArea].name} · {summary.round} 라운드</dd></div>
      <div><dt>플레이 시간</dt><dd>{Math.floor(seconds / 60)}분 {seconds % 60}초</dd></div>
    </dl>
    <p className="muted footnote">본편 점수 {summary.score} + 미사용 소모품 {summary.unusedConsumablePoints}점{bonus ? ' · 본편 기록은 보너스에서 유지됩니다.' : ''}</p>
    {!bonus && <p className={`record-save-status record-save-status--${recordStatus}`} role="status" aria-live="polite">
      {recordStatus === 'saving' && '최고 기록 저장 중…'}
      {recordStatus === 'saved' && '리더보드에 최고 기록을 저장했습니다.'}
      {recordStatus === 'kept' && '기존 최고 기록을 유지했습니다.'}
      {recordStatus === 'failed' && '기록을 저장하지 못했습니다. 게임 결과와 다음 플레이는 계속할 수 있습니다.'}
    </p>}
    <div className="button-row centered">
      {!bonus && <button className="secondary-button" onClick={session.openLeaderboard}>리더보드 보기</button>}
      {!bonus && outcome === 'clear' && <button className="primary-button" onClick={session.enterBonusRoute}>혼돈 지역 도전 →</button>}
      <button className="secondary-button" onClick={session.startCharacterSelect}>새 원정 시작</button>
    </div>
    {!bonus && outcome === 'clear' && <p className="muted footnote">남은 체력·아이템·무기로 세 번 더 도전합니다. 보너스 점수는 별도로 기록돼요.</p>}
    {outcome === 'defeat' && <p className="muted footnote">{run.playerHp <= 0 ? '체력을 모두 소모했어요.' : '사탕을 모두 사용했어요.'} 보상에서 사탕을 합성하고, 소모품을 활용해 보세요.</p>}
  </section>;
}
