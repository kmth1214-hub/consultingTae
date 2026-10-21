import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('The game cannot start: missing #root element.');

const isStudioPath = ['/__dev/maps', '/__dev/maps/'].includes(window.location.pathname);

function StudioUnavailable() {
  return <main className="studio-unavailable">
    <h1>페이지를 찾을 수 없습니다</h1>
    <p>이 개발용 지도 화면은 사용할 수 없습니다.</p>
    <a href="/">게임으로 돌아가기</a>
  </main>;
}

class StudioLoadBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="studio-unavailable">
      <h1>지도 검토 화면을 열지 못했습니다</h1>
      <a href="/__dev/maps">다시 불러오기</a> <a href="/">게임으로 돌아가기</a>
    </main>;
    return this.props.children;
  }
}

const GameApp = lazy(() => import('./App.jsx'));
let Entry = () => <Suspense fallback={<main role="status">게임을 불러오는 중…</main>}><GameApp /></Suspense>;
if (isStudioPath) {
  if (import.meta.env.DEV) {
    const MapStudio = lazy(() => import('./dev/MapStudio.jsx'));
    Entry = () => <StudioLoadBoundary><Suspense fallback={<main role="status">지도 검토 화면을 여는 중…</main>}><MapStudio /></Suspense></StudioLoadBoundary>;
  } else Entry = StudioUnavailable;
}

createRoot(root).render(<React.StrictMode><Entry /></React.StrictMode>);
