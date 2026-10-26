import React, { useEffect, useRef } from 'react';
import MonsterGroup from './MonsterGroup.jsx';
import { BOSS_SPLIT_FLIGHT_MS, sampleBossSplit } from '../game/bossSplitMotion.js';

export default function BossSplitTransition({ transition, source, layout, onImpact, onComplete }) {
  const bodies = useRef([]), callbacks = useRef(null);
  callbacks.current = { onImpact, onComplete };
  const { id, split, stage } = transition;
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flightMs = reduced ? 100 : BOSS_SPLIT_FLIGHT_MS;
    const impactMs = reduced ? 550 : 650;
    const started = performance.now();
    let frame, canceled = false, impacted = false, finished = false;
    function impact() { if (!impacted && !canceled) { impacted = true; callbacks.current.onImpact(id); } }
    function finish() {
      if (finished || canceled) return;
      impact(); finished = true; callbacks.current.onComplete(id);
    }
    function tick(now) {
      if (canceled || finished) return;
      const elapsed = now - started, progress = reduced ? 1 : Math.min(1, elapsed / flightMs);
      layout.enemies.forEach((target, index) => {
        const point = sampleBossSplit({ source, target, index, progress });
        const node = bodies.current[index];
        if (node) {
          node.style.transform = `translate(${point.x-target.x}px, ${point.y-target.y}px)`;
          node.dataset.x = String(point.x); node.dataset.y = String(point.y);
        }
      });
      if (elapsed >= flightMs) impact();
      if (elapsed >= flightMs + impactMs) finish();
      else frame = requestAnimationFrame(tick);
    }
    const visibility = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', visibility);
    if (document.hidden) finish(); else frame = requestAnimationFrame(tick);
    return () => { canceled = true; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [id, layout, source]);
  const shock = split.shock;
  return <div className={`boss-split-transition boss-split-transition--${stage}`} data-testid="boss-split-transition"
    data-stage={stage} aria-label={stage === 'flight' ? '융합 보스가 세 보스로 분리되어 날아가고 있어요' : '세 보스 착지 충격'}>
    {layout.enemies.map((target, index) => <div key={target.id} ref={node => { bodies.current[index] = node; }}
      className="boss-split-body" data-testid="boss-split-body" data-enemy-id={target.id}
      style={{ transform: `translate(${source.x-target.x}px, ${source.y-target.y}px)` }}>
      <MonsterGroup enemies={split.bosses} placements={[target]} layout={layout} />
    </div>)}
    {stage === 'impact' && <svg className="boss-landing-effects" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
      {layout.enemies.map(target => <g key={target.id} className="boss-landing-ring" transform={`translate(${target.x} ${target.y})`}>
        <ellipse rx="160" ry="28" /><path d="M-140-6-190-55M-70-17-92-86M70-17 92-86M140-6 190-55" />
      </g>)}
      <g data-testid="boss-landing-shock" className={shock.blocked ? 'shield-impact' : 'player-impact'}
        transform={`translate(${layout.player.impact.x} ${layout.player.impact.y})`}>
        {shock.blocked ? <path d="M-45-35 0-55 45-35V7Q42 47 0 64Q-42 47-45 7Z" />
          : <path d="M0-65 20-25 60-32 32 5 65 25 22 34 0 70-20 34-65 25-32 5-60-32-20-25Z" />}
      </g>
    </svg>}
  </div>;
}
