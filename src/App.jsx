import React, { useEffect, useRef } from 'react';
import { useGameSession } from './game/useGameSession.js';
import { useBattleBgm } from './game/useBattleBgm.js';
import { createPlayerProfileClient } from './game/playerProfileClient.js';
import GameHome from './components/GameHome.jsx';
import CharacterSelect from './components/CharacterSelect.jsx';
import BattleScreen from './components/BattleScreen.jsx';
import RewardScreen from './components/RewardScreen.jsx';
import CampScreen from './components/CampScreen.jsx';
import CampSlotScreen from './components/CampSlotScreen.jsx';
import CampRewardResult from './components/CampRewardResult.jsx';
import RunResults from './components/RunResults.jsx';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import Toast from './components/Toast.jsx';
import './styles/game.css';
import './styles/arena.css';

const BGM_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_BGM === 'true';
const ACCOUNT_PROFILE_REQUIRED = import.meta.env.VITE_REQUIRE_ACCOUNT_PROFILE === 'true';
const profileClient = ACCOUNT_PROFILE_REQUIRED ? createPlayerProfileClient() : null;

function MusicScreen({ session, Screen }) {
  const music = useBattleBgm({ active: session.screen === 'battle',
    area: session.run?.area, boss: session.run?.round === 3 });
  return <Screen session={session} music={music} />;
}

export default function App() {
  const session = useGameSession({ profileClient });
  const main = useRef(null);
  useEffect(() => { main.current?.focus({ preventScroll: true }); }, [session.screen]);
  useEffect(() => { if (profileClient) void session.loadAccountProfile(); }, []);
  const screens = { home: GameHome, characters: CharacterSelect, battle: BattleScreen,
    reward: RewardScreen, camp: CampScreen, 'camp-slot': CampSlotScreen, 'camp-reward': CampRewardResult,
    'main-results': RunResults, 'bonus-results': RunResults, leaderboard: LeaderboardScreen };
  const Screen = screens[session.screen];
  return <div className={`app app--${session.screen}`}>
    <a className="skip-link" href="#main">본문으로 이동</a>
    <main id="main" ref={main} tabIndex={-1}>
      {BGM_ENABLED ? <MusicScreen session={session} Screen={Screen} /> : <Screen session={session} />}
    </main>
    <Toast notification={session.notification} onDismiss={session.dismissNotification} />
  </div>;
}
