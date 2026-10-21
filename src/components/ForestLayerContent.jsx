import React, { useId } from 'react';
import { ASSETS } from '../game/assetCatalog.js';
import SceneAtmosphere from './SceneAtmosphere.jsx';

function Layer({ name, children, activity, visible }) {
  const clip = `forest-${useId().replace(/:/g, '')}-foreground`;
  return <svg className={`battlefield-layer scene-${name}`} data-scene-layer={name} data-scene-area="forest"
    style={{ display: visible ? undefined : 'none' }}
    viewBox="0 0 3600 1200" aria-hidden="true">
    {name === 'foreground' && <defs><clipPath id={clip}><path d="M-100-200H36V1010H3564V-200H3700V1800H-100Z" /></clipPath></defs>}
    <g data-depth-plane={name} clipPath={name === 'foreground' ? `url(#${clip})` : undefined}>
      {children}
      {name === 'distant' && <SceneAtmosphere area="forest" band="far" {...activity} />}
      {name === 'route' && <SceneAtmosphere area="forest" band="near" {...activity} />}
    </g>
  </svg>;
}

function ArtPatch({ href, x, y, width, height, viewBox = '0 0 1536 1024', opacity = 1 }) {
  const id = `forest-patch-${useId().replace(/:/g, '')}`;
  return <g data-source-patch="true" opacity={opacity}>
    <defs>
      <linearGradient id={`${id}-x`} x1={x} x2={x + width} gradientUnits="userSpaceOnUse"><stop stopColor="black" /><stop offset=".1" stopColor="white" /><stop offset=".9" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <linearGradient id={`${id}-y`} x1="0" x2="0" y1={y} y2={y + height} gradientUnits="userSpaceOnUse"><stop stopColor="black" /><stop offset=".15" stopColor="white" /><stop offset=".82" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <mask id={`${id}-mx`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}><rect x={x} y={y} width={width} height={height} fill={`url(#${id}-x)`} /></mask>
      <mask id={`${id}-my`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}><rect x={x} y={y} width={width} height={height} fill={`url(#${id}-y)`} /></mask>
    </defs>
    <g mask={`url(#${id}-mx)`}><g mask={`url(#${id}-my)`}>
      <svg x={x} y={y} width={width} height={height} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" overflow="hidden">
        <image href={href} width="1536" height="1024" preserveAspectRatio="xMidYMid meet" />
      </svg>
    </g></g>
  </g>;
}

export default function ForestLayerContent({ activity, visibleLayers }) {
  const id = `forest-scene-${useId().replace(/:/g, '')}`;
  return <>
    <Layer name="sky" activity={activity} visible={visibleLayers?.sky !== false}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="-300" y2="900" gradientUnits="userSpaceOnUse"><stop stopColor="#72d5d3" /><stop offset="1" stopColor="#f0efbd" /></linearGradient>
        <radialGradient id={`${id}-sun`}><stop stopColor="#fff9d4" stopOpacity=".8" /><stop offset="1" stopColor="#f0efbd" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="-5000" y="-5000" width="13600" height="5900" fill="#72d5d3" />
      <rect x="-5000" y="-1200" width="13600" height="2100" fill={`url(#${id}-sky)`} />
      <ellipse cx="730" cy="300" rx="820" ry="620" fill={`url(#${id}-sun)`} />
      {[[200, -680], [1850, -300]].map(([x, y]) => <ArtPatch key={x} href={ASSETS.forestLayers.distant}
        x={x} y={y} width={1300} height={1300 * 284 / 1086} viewBox="450 30 1086 284" opacity=".6" />)}
      {[0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(${i * 850 - 180} ${170 + i % 3 * 80}) scale(${1 + i % 2 * .3})`} fill="#fff8dc" opacity=".52">
        <path d="M0 40Q19 12 57 22Q71-17 108 5Q139-17 165 12Q202-1 225 30Q270 17 293 44Q192 57 121 49Q56 60 0 40" />
        <path d="M120 87q71-16 164-8l57 9q-89 5-221-1" opacity=".6" />
      </g>)}
    </Layer>
    <Layer name="distant" activity={activity} visible={visibleLayers?.distant !== false}>
      <path d="M-400 800Q-100 690 100 711L360 486 510 616 720 411 970 655 1300 452 1460 647 1810 398 2050 637 2340 484 2600 678 2890 402 3120 609 3460 460 3900 754V1200H-400Z" fill="#71a8a2" opacity=".36" />
      {[-120, 930, 1980, 3030].map((x, i) => <ArtPatch key={x} href={ASSETS.forestLayers.distant} x={x} y="100" width="1200" height="800"
        viewBox={['0 0 1536 1024', '450 80 1086 724', '400 170 1136 757.3333333333', '650 70 886 590.6666666667'][i]} />)}
    </Layer>
    <Layer name="midground" activity={activity} visible={visibleLayers?.midground !== false}>
      <defs><linearGradient id={`${id}-land`} x1="0" x2="0" y1="850" y2="1500" gradientUnits="userSpaceOnUse"><stop stopColor="#527c51" /><stop offset="1" stopColor="#386c58" /></linearGradient>
        <clipPath id={`${id}-left`}><rect width="600" height="1200" /></clipPath><clipPath id={`${id}-right`}><rect x="3000" width="600" height="1200" /></clipPath></defs>
      <path d="M-300 840Q80 780 360 805T1010 803T1740 810T2490 799T3200 806T3900 790V1080H-300Z" fill={`url(#${id}-land)`} />
      <g clipPath={`url(#${id}-left)`}><image href={ASSETS.forestLayers.midground} x="0" y="100" width="1200" height="800" preserveAspectRatio="xMidYMid meet" /></g>
      <g clipPath={`url(#${id}-right)`}><image href={ASSETS.forestLayers.midground} x="2400" y="100" width="1200" height="800" preserveAspectRatio="xMidYMid meet" /></g>
      {[620, 960, 1280, 1600, 1950, 2290, 2640].map((x, i) => <ArtPatch key={x} href={ASSETS.forestLayers.midground} x={x} y={540 + i % 3 * 24}
        width={380 + i % 2 * 60} height={(380 + i % 2 * 60) * 350 / 520} viewBox="0 10 520 350" />)}
    </Layer>
    <Layer name="route" activity={activity} visible={visibleLayers?.route !== false}>
      <defs><linearGradient id={`${id}-water`} x1="0" x2="0" y1="1000" y2="1500" gradientUnits="userSpaceOnUse"><stop stopColor="#91c7ba" /><stop offset="1" stopColor="#387d80" /></linearGradient>
        <linearGradient id={`${id}-lane`} x1="0" x2="0" y1="840" y2="975" gradientUnits="userSpaceOnUse"><stop stopColor="#af775d" /><stop offset=".22" stopColor="#f8cdab" /><stop offset=".7" stopColor="#deaa83" /><stop offset="1" stopColor="#af775d" /></linearGradient>
        <pattern id={`${id}-grain`} width="137" height="69" patternUnits="userSpaceOnUse"><path d="m9 20 23-2m17 29 14 2m27-38 21 1m7 44 15-3m-90-1 13-2m49-24 14 2" stroke="#f8cdab" strokeWidth="2" opacity=".4" /></pattern>
        <clipPath id={`${id}-route`}><path d="M-200 798Q400 774 800 800T1700 803T2700 797T3800 804V1034Q3200 1020 2600 1030T1400 1024T-200 1030Z" /></clipPath></defs>
      <rect x="-5000" y="935" width="13600" height="5000" fill="#527c51" />
      <rect x="-5000" y="1030" width="13600" height="5000" fill={`url(#${id}-water)`} />
      {Array.from({ length: 35 }, (_, i) => <path key={i} d={`M${i * 113 - 80} ${1075 + i % 5 * 34}q${20 + i % 4 * 12}-4 ${40 + i % 4 * 20} 0`} stroke="#d6edc4" strokeWidth="2" fill="none" opacity=".3" />)}
      <path d="M-100 900H3700" stroke="#af775d" strokeWidth="142" />
      <path d="M-100 900H3700" stroke={`url(#${id}-lane)`} strokeWidth="110" />
      <path d="M-100 900H3700" stroke={`url(#${id}-grain)`} strokeWidth="110" />
      <g clipPath={`url(#${id}-route)`}>{[-200, 800, 1800, 2800].map(x => <ArtPatch key={x} href={ASSETS.forestLayers.path} x={x} y="300" width="1200" height="800" />)}</g>
      {Array.from({ length: 42 }, (_, i) => <g key={i} transform={`translate(${(i * 211) % 3600} ${i % 2 ? 990 + i % 3 * 7 : 811 - i % 4 * 3})`}>
        <path d="M0 8Q-19-10-23 0Q-7 11 0 8Q15-18 19-8Q18 4 0 8" fill="#69995b" /><circle cy="-4" r="5" fill={i % 3 ? '#edc575' : '#efb4b2'} /><circle cy="-4" r="2" fill="#fff6c4" />
      </g>)}
    </Layer>
    <Layer name="foreground" activity={activity} visible={visibleLayers?.foreground !== false}>
      {[-80, 2480].map(x => <ArtPatch key={x} href={ASSETS.forestLayers.foreground} x={x} y="300" width="1200" height="800" />)}
      {[850, 1800].map(x => <ArtPatch key={x} href={ASSETS.forestLayers.foreground} x={x} y="1010" width="1100" height="220" viewBox="250 830 1036 207.2" />)}
    </Layer>
  </>;
}
