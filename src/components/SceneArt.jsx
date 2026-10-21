import React, { useId } from 'react';
import { getSceneProfile } from '../game/sceneCatalog.js';
import SceneAtmosphere from './SceneAtmosphere.jsx';

const ORDER = ['sky', 'distant', 'midground', 'route', 'foreground'];
const Z = { sky: 0, distant: 0, midground: 1, route: 2, foreground: 5 };

function PanoramaLayer({ role, panels, area, profile, prefix, activity }) {
  const layer = role === 'path' ? 'route' : role;
  const clipId = `${prefix}-${layer}-clip`;
  const isForeground = role === 'foreground';
  return <svg className={`battlefield-layer scene-${layer}`} data-scene-layer={layer} data-scene-area={area}
    viewBox="0 0 3600 1200" aria-hidden="true">
    <defs>
      <linearGradient id={`${prefix}-sky`} x1="0" x2="0" y1="-300" y2="900" gradientUnits="userSpaceOnUse">
        <stop stopColor={profile.palette.sky} /><stop offset="1" stopColor={profile.palette.horizon} />
      </linearGradient>
      <linearGradient id={`${prefix}-bank`} x1="0" x2="0" y1="830" y2="1050" gradientUnits="userSpaceOnUse">
        <stop stopColor={profile.palette.bank} /><stop offset="1" stopColor={profile.palette.ground} />
      </linearGradient>
      <linearGradient id={`${prefix}-road`} x1="0" x2="0" y1="840" y2="960" gradientUnits="userSpaceOnUse">
        <stop stopColor={profile.palette.dark} /><stop offset=".2" stopColor={profile.palette.light} /><stop offset=".72" stopColor={profile.palette.lane} /><stop offset="1" stopColor={profile.palette.dark} />
      </linearGradient>
      <linearGradient id={`${prefix}-west-feather`} x1="1980" x2="2100" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" /><stop offset="1" stopColor="black" />
      </linearGradient>
      <linearGradient id={`${prefix}-east-feather`} x1="1500" x2="1740" gradientUnits="userSpaceOnUse">
        <stop stopColor="black" /><stop offset="1" stopColor="white" />
      </linearGradient>
      <mask id={`${prefix}-west-mask`} maskUnits="userSpaceOnUse" x="-600" y="-700" width="2700" height="2200">
        <rect x="-600" y="-700" width="2700" height="2200" fill="white" />
        <rect x="1500" y="-700" width="600" height="2200" fill={`url(#${prefix}-west-feather)`} />
      </mask>
      <mask id={`${prefix}-east-mask`} maskUnits="userSpaceOnUse" x="1500" y="-700" width="2700" height="2200">
        <rect x="1500" y="-700" width="2700" height="2200" fill="white" />
        <rect x="1500" y="-700" width="240" height="2200" fill={`url(#${prefix}-east-feather)`} />
      </mask>
      {role === 'midground' && <clipPath id={clipId}><rect x="-600" y="-500" width="4800" height="1320" /></clipPath>}
      {isForeground && <clipPath id={clipId}><path d="M-100-200H36V1010H3564V-200H3700V1800H-100Z" /></clipPath>}
    </defs>
    {role === 'sky' && <>
      <rect x="-5000" y="-5000" width="13600" height="5900" fill={profile.palette.sky} />
      <rect x="-5000" y="-1200" width="13600" height="2100" fill={`url(#${prefix}-sky)`} />
    </>}
    {role === 'midground' && <path d="M-300 840Q80 780 360 805T1010 803T1740 810T2490 799T3200 806T3900 790V1080H-300Z" fill={`url(#${prefix}-bank)`} />}
    {role === 'route' && <>
      <rect x="-5000" y="935" width="13600" height="5000" fill={`url(#${prefix}-bank)`} />
      <path d="M-100 900H3700" stroke={profile.palette.dark} strokeWidth="142" />
      <path d="M-100 900H3700" stroke={`url(#${prefix}-road)`} strokeWidth="110" />
    </>}
    <g clipPath={role === 'midground' || isForeground ? `url(#${clipId})` : undefined}>
    <g data-depth-plane={layer}>
      {(panels || []).map(panel => {
        const mask = `${prefix}-${panel.side}-mask`;
        return <g key={panel.side} mask={`url(#${mask})`} data-painted-panel={role} data-panel-side={panel.side}>
          <svg x={panel.x} y={panel.y} width={panel.width} height={panel.height}
            viewBox={`0 0 ${panel.sourceWidth} ${panel.sourceHeight}`} preserveAspectRatio="xMidYMid meet" overflow="hidden">
            <image href={panel.href} width={panel.sourceWidth} height={panel.sourceHeight} preserveAspectRatio="none" />
          </svg>
        </g>;
      })}
      {role === 'route' && <path d="M-100 843Q230 828 470 844T1000 844T1700 844T2400 844T3100 844T3700 844" fill="none" stroke={profile.palette.light} strokeWidth="7" strokeLinecap="round" />}
      {role === 'distant' && <SceneAtmosphere area={area} band="far" {...activity} />}
      {role === 'path' && <SceneAtmosphere area={area} band="near" {...activity} />}
    </g></g>
  </svg>;
}

export default function SceneArt({ area, activity }) {
  const profile = getSceneProfile(area), prefix = `scene-${useId().replace(/:/g, '')}`;
  return <>
    {ORDER.map(name => {
      const role = name === 'route' ? 'path' : name;
      const panels = profile.panels[role];
      return <PanoramaLayer key={name} role={role} panels={panels} area={area} profile={profile} prefix={`${prefix}-${name}`} activity={activity} />;
    })}
  </>;
}

export { PanoramaLayer };
