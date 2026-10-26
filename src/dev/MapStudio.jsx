import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ArenaScenery from '../components/ArenaScenery.jsx';
import BattlefieldBackdrop from '../components/BattlefieldBackdrop.jsx';
import { buildBattlefield } from '../game/battlefieldModel.js';
import { applyScenePose } from '../game/sceneParallax.js';
import { CHARACTERS } from '../game/gameData.js';
import { getStudioPose, panStudio, zoomStudioAt } from './mapStudioCamera.js';
import './mapStudio.css';

const AREA_NAMES = { forest: '숲', snow: '눈', city: '도시', chaos: '혼돈' };
const LAYER_NAMES = { sky: '하늘', distant: '원경', midground: '중경', route: '길', foreground: '전경' };
const LAYER_KEYS = Object.keys(LAYER_NAMES);
const RESET_CAMERA = { zoom: 1, center: { x: 1800, y: 600 } };
const StudioPlay = lazy(() => import('./StudioPlay.jsx'));

function ErrorScreen() {
  return <main className="studio-error"><h1>지도 검토 화면을 열지 못했습니다</h1><a href="/__dev/maps">다시 불러오기</a><a href="/">게임으로 돌아가기</a></main>;
}

export default function MapStudio() {
  const [area, setArea] = useState('forest');
  const [round, setRound] = useState(1), [characterId, setCharacterId] = useState('adventurer');
  const [bossSpecial, setBossSpecial] = useState(false), [play, setPlay] = useState(null);
  const playId = useRef(0);
  const [visibleLayers, setVisibleLayers] = useState(() => Object.fromEntries(LAYER_KEYS.map(key => [key, true])));
  const [motionPaused, setMotionPaused] = useState(false);
  const [camera, setCamera] = useState(RESET_CAMERA);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef(null), worldRef = useRef(null), dragRef = useRef(null);
  const layout = useMemo(() => buildBattlefield({ area, round: 1,
    enemies: [{ id: 'studio-reference-target', kind: 'snake', isBoss: false }] }), [area]);
  const pose = getStudioPose({ viewport, camera });

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    const measure = () => setViewport({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(node); measure();
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (worldRef.current && pose) applyScenePose(worldRef.current, pose, viewport, motionPaused || reducedMotion);
  }, [pose?.x, pose?.y, pose?.scale, viewport, motionPaused, reducedMotion]);

  const cancelDrag = useCallback((release = true) => {
    const drag = dragRef.current;
    dragRef.current = null; setDragging(false);
    if (release && drag && viewportRef.current?.hasPointerCapture(drag.pointerId)) {
      viewportRef.current.releasePointerCapture(drag.pointerId);
    }
  }, []);
  useEffect(() => {
    const blur = () => cancelDrag();
    const visibility = () => { if (document.hidden) cancelDrag(); };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); cancelDrag(); };
  }, [cancelDrag]);
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    const wheel = event => {
      event.preventDefault();
      if (!pose) return;
      const rect = node.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setCamera(current => zoomStudioAt({ camera: current, viewport, nextZoom: current.zoom * Math.exp(-event.deltaY * .0015), point }));
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [pose?.scale, viewport]);

  function setZoom(next) {
    const point = { x: viewport.width / 2, y: viewport.height / 2 };
    setCamera(current => zoomStudioAt({ camera: current, viewport, nextZoom: next, point }));
  }
  function onPointerDown(event) {
    if (event.button !== 0 || !pose) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera };
    setDragging(true);
  }
  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = { x: event.clientX - drag.x, y: event.clientY - drag.y };
    setCamera(panStudio({ camera: drag.camera, viewport, delta }));
  }
  function onKeyDown(event) {
    if (!pose) return;
    const direction = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
    if (direction) {
      event.preventDefault();
      const distance = 120 * pose.scale;
      setCamera(current => panStudio({ camera: current, viewport, delta: { x: direction[0] * distance, y: direction[1] * distance } }));
    } else if (['+', '=', 'Add'].includes(event.key)) { event.preventDefault(); setZoom(camera.zoom + .25); }
    else if (['-', '_', 'Subtract'].includes(event.key)) { event.preventDefault(); setZoom(camera.zoom - .25); }
    else if (event.key === 'Home' || event.key === '0') { event.preventDefault(); cancelDrag(); setCamera(RESET_CAMERA); }
  }
  function changeArea(nextArea) {
    cancelDrag(); setCamera(RESET_CAMERA); setArea(nextArea);
  }
  function launchPlay(config = { area, round, characterId, bossSpecial }, newLayout = true) {
    cancelDrag();
    if (config.area !== area) changeArea(config.area);
    setRound(config.round); setCharacterId(config.characterId); setBossSpecial(config.bossSpecial);
    const seed = !newLayout ? config.seed : globalThis.crypto?.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 0x100000000);
    setPlay({ area: config.area, round: config.round, characterId: config.characterId,
      bossSpecial: config.bossSpecial && config.round === 3, seed, id: ++playId.current });
  }

  return <><main className="map-studio" hidden={Boolean(play)} data-dev-tool="regional-map-studio-v1">
    <header className="studio-header">
      <div><p className="studio-kicker">개발 검토 도구</p><h1>지역 지도 스튜디오</h1>
        <p>전투와 같은 배경·장애물 장면을 확인합니다. 이 화면은 개발 환경 전용입니다.</p></div>
      <a className="studio-return" href="/">게임으로 돌아가기</a>
    </header>
    <div className="studio-layout">
      <aside className="studio-controls" aria-label="지도 검토 설정">
        <label className="studio-field">지역
          <select aria-label="지역 선택" value={area} onChange={event => changeArea(event.target.value)}>
            {Object.keys(AREA_NAMES).map(key => <option key={key} value={key}>{AREA_NAMES[key]} 지역</option>)}
          </select>
        </label>
        <fieldset><legend>표시할 레이어</legend>
          {LAYER_KEYS.map(key => <label className="studio-check" key={key}><input type="checkbox" checked={visibleLayers[key]}
            onChange={event => setVisibleLayers(current => ({ ...current, [key]: event.target.checked }))} />{LAYER_NAMES[key]}</label>)}
        </fieldset>
        <button type="button" className="studio-pause" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>
          {motionPaused ? '환경 연출 재생' : '환경 연출 일시 정지'}
        </button>
        <section className="studio-zoom" aria-label="확대 설정">
          <div className="studio-zoom-heading"><strong>확대</strong><output aria-live="polite">{camera.zoom.toFixed(1)}×</output></div>
          <div className="studio-zoom-buttons">
            <button type="button" aria-label="확대" onClick={() => setZoom(camera.zoom + .25)}>＋</button>
            <button type="button" aria-label="축소" onClick={() => setZoom(camera.zoom - .25)}>−</button>
            <button type="button" aria-label="전체 영역 보기" onClick={() => { cancelDrag(); setCamera(RESET_CAMERA); }}>전체 보기</button>
          </div>
          <label className="sr-only" htmlFor="studio-zoom-range">확대 비율</label>
          <input id="studio-zoom-range" type="range" min="1" max="6" step="0.1" value={camera.zoom}
            onChange={event => setZoom(Number(event.target.value))} />
          <p>드래그로 이동 · 휠로 확대 · 방향키로 이동 · Home으로 초기화</p>
        </section>
        <fieldset className="studio-play-settings"><legend>전투 테스트</legend>
          <label className="studio-play-field">라운드<select aria-label="테스트 라운드" value={round}
            onChange={event => { setRound(Number(event.target.value)); setBossSpecial(false); }}>
            {[1, 2, 3].map(value => <option key={value} value={value}>{value}라운드{value === 3 ? ' · 보스' : ''}</option>)}
          </select></label>
          <label className="studio-play-field">쿠키<select aria-label="테스트 쿠키" value={characterId} onChange={event => setCharacterId(event.target.value)}>
            {CHARACTERS.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
          </select></label>
          <label className="studio-check"><input type="checkbox" checked={bossSpecial} disabled={round !== 3}
            onChange={event => setBossSpecial(event.target.checked)} />보스 특수 공격부터 확인</label>
          <button type="button" className="studio-play-primary" onClick={() => launchPlay()}>테스트 플레이</button>
          <p>선택한 지역에서 바로 시작 · 소모품 각 3개</p>
        </fieldset>
      </aside>
      <section ref={viewportRef} className={`studio-viewport${dragging ? ' is-dragging' : ''}`} role="group"
        aria-label={`${AREA_NAMES[area]} 지역 지도 미리보기`} tabIndex={0} onPointerDown={onPointerDown}
        onPointerMove={onPointerMove} onPointerUp={() => cancelDrag()} onPointerCancel={() => cancelDrag()}
        onLostPointerCapture={() => cancelDrag(false)} onKeyDown={onKeyDown}>
        {!pose && <p className="studio-waiting" role="status">미리보기 크기를 확인하는 중…</p>}
        <div ref={worldRef} className="arena-world" style={{ width: layout.width, height: layout.height }}>
          <BattlefieldBackdrop area={area} visibleLayers={visibleLayers} motionPaused={motionPaused || reducedMotion || Boolean(play)} />
          <ArenaScenery layout={layout} />
        </div>
        <p className="studio-map-label">{AREA_NAMES[area]} 지역 · 장애물 {layout.obstacles.length}개</p>
      </section>
    </div>
    <footer className="studio-footer">개발 환경 전용 · 테스트 플레이는 일반 게임의 프로필·순위 기록을 변경하지 않습니다.</footer>
  </main>
    {play && <Suspense fallback={<main role="status">테스트 전투를 준비하는 중…</main>}>
      <StudioPlay key={play.id} config={play} onRestart={launchPlay} onExit={() => setPlay(null)} />
    </Suspense>}
  </>;
}
