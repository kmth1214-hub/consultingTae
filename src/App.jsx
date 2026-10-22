import React, { useEffect, useRef } from 'react';
import { useGameSession } from './game/useGameSession.js';
import GameHome from './components/GameHome.jsx';
import CharacterSelect from './components/CharacterSelect.jsx';
import BattleScreen from './components/BattleScreen.jsx';
import RewardScreen from './components/RewardScreen.jsx';
import CampScreen from './components/CampScreen.jsx';
import RunResults from './components/RunResults.jsx';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import Toast from './components/Toast.jsx';
import './styles/game.css';
import './styles/arena.css';

export default function App() {
  const session = useGameSession();
  const main = useRef(null);
  useEffect(() => { main.current?.focus({ preventScroll: true }); }, [session.screen]);
  const screens = { home: GameHome, characters: CharacterSelect, battle: BattleScreen,
    reward: RewardScreen, camp: CampScreen, 'main-results': RunResults, 'bonus-results': RunResults, leaderboard: LeaderboardScreen };
  const Screen = screens[session.screen];
  return <div className={`app app--${session.screen}`}>
    <a className="skip-link" href="#main">본문으로 이동</a>
    <main id="main" ref={main} tabIndex={-1}><Screen session={session} /></main>
    <Toast notification={session.notification} onDismiss={session.dismissNotification} />
  </div>;
}
