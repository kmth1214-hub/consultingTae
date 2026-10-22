import React, { useCallback, useEffect, useState } from 'react';
import { CHARACTERS } from '../game/gameData.js';
import { ASSETS } from '../game/assetCatalog.js';
import { getLeaderboard } from '../game/leaderboardClient.js';
import AssetImage from './AssetImage.jsx';

function cookieDetails(cookieId) {
  const cookie = CHARACTERS.find(item => item.id === cookieId);
  return cookie || { name: '알 수 없는 쿠키', asset: null };
}

function CookieCell({ cookieId }) {
  const cookie = cookieDetails(cookieId);
  return <span className="leaderboard-cookie">
    {cookie.asset && <AssetImage className="leaderboard-cookie-art" src={ASSETS.characters[cookie.asset]} alt="" />}
    <span>{cookie.name}</span>
  </span>;
}

export default function LeaderboardScreen({ session }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', board: null, error: null });
  const load = useCallback(async signal => {
    setState({ status: 'loading', board: null, error: null });
    try {
      const board = await getLeaderboard({ signal });
      if (!signal.aborted) setState({ status: board.entries.length ? 'loaded' : 'empty', board, error: null });
    } catch (error) {
      if (!signal.aborted) setState({ status: 'error', board: null, error });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [attempt, load]);

  return <section className="screen-shell compact-screen leaderboard-screen" aria-labelledby="leaderboard-title">
    <p className="eyebrow">COOKIE EXPEDITION</p>
    <h1 id="leaderboard-title">회사 리더보드</h1>
    <p className="screen-intro">모험가들의 최고 기록을 확인해보세요.</p>
    {state.status === 'loading' && <p className="leaderboard-message" role="status">순위를 불러오는 중…</p>}
    {state.status === 'error' && <div className="leaderboard-message leaderboard-message--error" role="alert">
      <p>{state.error?.status === 401 ? '회사 계정으로 로그인한 뒤 다시 시도해주세요.' : '리더보드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'}</p>
      <button className="secondary-button" onClick={() => setAttempt(value => value + 1)}>다시 시도</button>
    </div>}
    {state.status === 'empty' && <p className="leaderboard-message">아직 등록된 기록이 없습니다. 첫 기록에 도전해보세요!</p>}
    {state.status === 'loaded' && <>
      <div className="leaderboard-table-wrap">
        <table className="leaderboard-table">
          <caption className="sr-only">회사 리더보드 상위 10위</caption>
          <thead><tr><th scope="col">순위</th><th scope="col">쿠키</th><th scope="col">이름</th><th scope="col">점수</th></tr></thead>
          <tbody>{state.board.entries.map(entry => <tr key={`${entry.rank}-${entry.cookieId}`}>
            <th scope="row">{entry.rank}</th>
            <td><CookieCell cookieId={entry.cookieId} /></td>
            <td>{entry.displayName}</td>
            <td className="leaderboard-score">{entry.score.toLocaleString()}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {state.board.personalBest && <section className="personal-best" aria-labelledby="personal-best-title">
        <div><p className="eyebrow">내 기록</p><h2 id="personal-best-title">내 최고 기록</h2></div>
        <strong>#{state.board.personalBest.rank}</strong>
        <CookieCell cookieId={state.board.personalBest.cookieId} />
        <span className="leaderboard-score">{state.board.personalBest.score.toLocaleString()}점</span>
      </section>}
    </>}
    <div className="button-row centered leaderboard-actions">
      <button className="secondary-button" onClick={session.closeLeaderboard}>돌아가기</button>
    </div>
  </section>;
}
