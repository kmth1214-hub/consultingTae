import React, { useId } from 'react';
import { getSceneProfile } from '../game/sceneCatalog.js';

const DETAILS = {
  forest: { face: '#654535', seam: '#d2a77b', accent: '#77ae67', motif: 'roots' },
  snow: { face: '#56809c', seam: '#e4f6ff', accent: '#b3e9f3', motif: 'ice' },
  city: { face: '#65526b', seam: '#eac5ab', accent: '#f4d7a7', motif: 'stone' },
  chaos: { face: '#3c305d', seam: '#b890db', accent: '#d392e8', motif: 'rifts' }
};

function GroundShadow({ x, y, radius, opacity = .34 }) {
  return <ellipse cx={x} cy={y} rx={radius} ry={Math.max(9, radius * .19)}
    fill="#1f1b27" opacity={opacity} />;
}

/** Presentation-only terrain: every contact point comes from the playable layout. */
export default function StudioDepthScene({ area, layout, toppledObstacleIds = [] }) {
  const prefix = `studio-depth-${useId().replace(/:/g, '')}`;
  const palette = getSceneProfile(area).palette;
  const detail = DETAILS[area];
  const { width, height, groundY } = layout;
  const edge = groundY + 70;
  const front = edge + 64;
  const fallen = new Set(toppledObstacleIds);
  const playerFoot = layout.player.y + layout.player.height;
  const launcherFoot = layout.launcher.y + layout.launcher.height;

  return <svg className="studio-depth-scene" data-testid="studio-depth-scene"
    data-depth-area={area} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
    <defs>
      <linearGradient id={`${prefix}-surface`} x1="0" x2="0" y1={groundY - 95} y2={edge} gradientUnits="userSpaceOnUse">
        <stop stopColor={palette.light} stopOpacity=".22" />
        <stop offset=".58" stopColor={palette.lane} stopOpacity=".03" />
        <stop offset="1" stopColor={palette.dark} stopOpacity=".38" />
      </linearGradient>
      <linearGradient id={`${prefix}-face`} x1="0" x2="0" y1={edge} y2={front} gradientUnits="userSpaceOnUse">
        <stop stopColor={palette.dark} stopOpacity=".84" />
        <stop offset=".32" stopColor={detail.face} stopOpacity=".92" />
        <stop offset="1" stopColor={palette.ground} stopOpacity=".78" />
      </linearGradient>
    </defs>

    {/* The transparent top preserves the painted path; the dark front reads as its thickness. */}
    <path data-depth-part="road-top"
      d={`M0 ${groundY - 82} Q${width * .27} ${groundY - 91} ${width * .52} ${groundY - 82} T${width} ${groundY - 82} V${edge} H0Z`}
      fill={`url(#${prefix}-surface)`} />
    <path d={`M0 ${groundY - 82} Q${width * .27} ${groundY - 91} ${width * .52} ${groundY - 82} T${width} ${groundY - 82}`}
      fill="none" stroke={detail.accent} strokeWidth="8" opacity=".62" />
    <path data-depth-part="road-face"
      d={`M0 ${edge} Q${width * .25} ${edge - 6} ${width * .5} ${edge} T${width} ${edge} V${front} Q${width * .75} ${front + 6} ${width * .5} ${front} T0 ${front}Z`}
      fill={`url(#${prefix}-face)`} />
    <path d={`M0 ${edge} Q${width * .25} ${edge - 6} ${width * .5} ${edge} T${width} ${edge}`}
      fill="none" stroke={detail.seam} strokeWidth="6" opacity=".83" />
    <path d={`M0 ${front} Q${width * .25} ${front + 5} ${width * .5} ${front} T${width} ${front}`}
      fill="none" stroke={palette.ground} strokeWidth="10" opacity=".75" />

    {Array.from({ length: Math.ceil(width / 180) }, (_, index) => {
      const x = index * 180 + (index % 3) * 23;
      if (detail.motif === 'stone') return <g key={x} stroke={detail.seam} opacity=".38" fill="none" strokeWidth="3">
        <path d={`M${x} ${edge + 8}v23h67v28M${x + 110} ${edge + 2}v18h52`} />
      </g>;
      if (detail.motif === 'ice') return <path key={x} d={`M${x} ${edge + 6}l26 21-12 11 23 13m-11-29 34-12`}
        stroke={detail.seam} strokeWidth="3" opacity=".4" fill="none" />;
      if (detail.motif === 'rifts') return <path key={x} d={`M${x} ${edge + 3}l24 24-6 15 35 18`}
        stroke={detail.accent} strokeWidth="4" opacity=".5" fill="none" />;
      return <g key={x} fill="none" stroke={detail.seam} opacity=".44" strokeWidth="3">
        <path d={`M${x} ${edge + 4}q12 16 2 36l18 17m-18-17-17 18`} />
        <ellipse cx={x + 78} cy={edge + 27} rx="9" ry="4" fill={detail.seam} opacity=".5" />
      </g>;
    })}

    {/* Fixed platform and supports receive a small top plane and visible side. */}
    {layout.launcherPlatform && <g data-depth-part="launcher-platform" opacity=".82">
      <path d={`M${layout.launcherPlatform.x + layout.launcherPlatform.width} ${layout.launcherPlatform.y + 5}
        l22 11v${layout.launcherPlatform.height - 8}l-22-12Z`} fill={detail.face} />
      <path d={`M${layout.launcherPlatform.x} ${layout.launcherPlatform.y + 5}l16-12
        h${layout.launcherPlatform.width - 16}l22 12Z`} fill={detail.accent} stroke={detail.seam} strokeWidth="3" />
    </g>}
    {layout.obstacles.filter(prop => prop.supportsEnemyId && !fallen.has(prop.id)).map(prop =>
      <g key={prop.id} data-depth-support={prop.id} opacity=".68">
        <path d={`M${prop.x + 4} ${prop.y + 3}l13-11h${prop.width - 21}l13 11Z`}
          fill={detail.accent} stroke={detail.seam} strokeWidth="3" />
        <path d={`M${prop.x + prop.width - 3} ${prop.y + 8}l12-5v${Math.min(38, prop.height * .2)}l-12 9Z`}
          fill={detail.face} opacity=".58" />
      </g>)}

    <g data-depth-part="contact-shadows">
      <GroundShadow x={layout.player.x + layout.player.width * .5} y={playerFoot + 4}
        radius={layout.player.width * .44} opacity={layout.launcherPlatform ? .38 : .3} />
      <GroundShadow x={layout.launcher.x + layout.launcher.width * .5} y={launcherFoot + 5}
        radius={layout.launcher.width * .37} opacity=".32" />
      {layout.launcherPlatform && <GroundShadow x={layout.launcherPlatform.x + layout.launcherPlatform.width * .5}
        y={groundY + 4} radius={layout.launcherPlatform.width * .5} opacity=".24" />}
      {layout.obstacles.filter(prop => !fallen.has(prop.id)).map(prop =>
        <GroundShadow key={prop.id} x={prop.x + prop.width * .5} y={prop.y + prop.height + 4}
          radius={prop.width * .62} opacity=".27" />)}
      {layout.enemies.map(enemy => enemy.patrol ? null : enemy.supportObstacleId
        ? <g key={enemy.id} data-depth-enemy={enemy.id}>
          <GroundShadow x={enemy.x} y={groundY + 3} radius={enemy.size * .37} opacity=".13" />
          <GroundShadow x={enemy.x} y={enemy.y + 3} radius={enemy.size * .36} opacity=".37" />
        </g>
        : <g key={enemy.id} data-depth-enemy={enemy.id}>
          <GroundShadow x={enemy.x} y={enemy.y + 4} radius={enemy.size * .41} opacity=".3" />
        </g>)}
    </g>
  </svg>;
}
