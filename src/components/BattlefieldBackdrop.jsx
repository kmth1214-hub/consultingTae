import React, { memo, useId } from 'react';
import { ASSETS } from '../game/assetCatalog.js';

const THEMES = {
  forest: { sky: '#72d5d3', horizon: '#f0efbd', far: '#71a8a2', bank: '#527c51', ground: '#386c58', lane: '#deaa83', light: '#f8cdab', dark: '#af775d' },
  snow: { sky: '#91badf', horizon: '#edf5ff', far: '#8ea6cb', bank: '#a5c7da', ground: '#739cb6', lane: '#bad4e5', light: '#f4fbff', dark: '#81a4c3' },
  city: { sky: '#654a75', horizon: '#f5c798', far: '#80688f', bank: '#7b657d', ground: '#49425f', lane: '#927da5', light: '#d9b8bb', dark: '#66547e' },
  chaos: { sky: '#23214d', horizon: '#b598e7', far: '#8274af', bank: '#726296', ground: '#292750', lane: '#9f8abd', light: '#d2bce9', dark: '#655783' },
};

function Layer({ name, area, children }) {
  return <svg className={`battlefield-layer scene-${name}`} data-scene-layer={name} data-scene-area={area}
    viewBox="0 0 3600 1200" aria-hidden="true">{children}</svg>;
}

/** Cropped source pixels stay proportional. Two alpha masks blend their edges,
 * without blur, stretching, editing the source PNG or adding flat poster frames. */
function ArtPatch({ href, x, y, width, height, viewBox = '0 0 1536 1024', regional = false, opacity = 1 }) {
  const id = `patch-${useId().replace(/:/g, '')}`;
  // SVG accepts numeric strings, but mask endpoints require numeric addition.
  x = Number(x); y = Number(y); width = Number(width); height = Number(height);
  return <g data-source-patch="true" opacity={opacity}>
    <defs>
      <linearGradient id={`${id}-x`} gradientUnits="userSpaceOnUse" x1={x} x2={x + width}>
        <stop stopColor="black" /><stop offset=".10" stopColor="white" /><stop offset=".9" stopColor="white" /><stop offset="1" stopColor="black" />
      </linearGradient>
      <linearGradient id={`${id}-y`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y} y2={y + height}>
        <stop stopColor="black" /><stop offset=".15" stopColor="white" /><stop offset=".82" stopColor="white" /><stop offset="1" stopColor="black" />
      </linearGradient>
      <mask id={`${id}-mx`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
        <rect x={x} y={y} width={width} height={height} fill={`url(#${id}-x)`} />
      </mask>
      <mask id={`${id}-my`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
        <rect x={x} y={y} width={width} height={height} fill={`url(#${id}-y)`} />
      </mask>
    </defs>
    <g mask={`url(#${id}-mx)`}><g mask={`url(#${id}-my)`}>
      <svg x={x} y={y} width={width} height={height} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" overflow="hidden">
        <image href={href} width={regional ? 764 : 1536} height={regional ? 508 : 1024} preserveAspectRatio="xMidYMid meet" />
      </svg>
    </g></g>
  </g>;
}

function Pine({ x, y, scale = 1, snowy = false, dark = false }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-6 0 0-180 7 0" fill={snowy ? '#677e99' : '#496947'} />
    <path d="M0-204-28-159-17-161-50-115-34-117-72-65-52-69-91-12Q-47 3 0-10Q48 3 91-12L52-69 72-65 34-117 50-115 17-161 28-159Z"
      fill={snowy ? dark ? '#617f9f' : '#7296ae' : dark ? '#316c60' : '#60916a'} />
    <path d="M0-202-24-162 1-168 21-158M-18-145-46-117-17-121 13-130 45-115M-35-101-65-69-35-74 6-89 62-70M-49-53-82-15-40-27 8-36 79-14"
      fill={snowy ? '#edf8fa' : '#a3b979'} opacity={snowy ? '.93' : '.48'} />
    <path d="m-8-125 12-8m-29 57 22-9m18 34 16 8" stroke={snowy ? '#c9e3ed' : '#c3ca83'} strokeWidth="4" opacity=".5" />
  </g>;
}

function Building({ x, y, scale = 1, id, distant = false }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={distant ? .48 : 1}>
    <path d="M-47 0V-149L0-208 47-149V0Z" fill={`url(#${id}-stone)`} stroke="#70607d" strokeWidth="3" />
    <path d="M-56-145 0-218 56-145 0-171Z" fill="#665477" stroke="#a48291" strokeWidth="3" />
    <path d="M0-218v-23m-7 5h14" stroke="#e9bf78" strokeWidth="3" />
    {[-24, 20].map((wx, i) => <g key={wx} fill="#fbd693" stroke="#9f795f" strokeWidth="2">
      <path d={`M${wx - 7}-115q7-14 14 0v25h-14Z`} /><path d={`M${wx - 7}-63q7-14 14 0v25h-14Z`} />
      <path d={`M${wx}-125v35m-7-17h14M${wx}-73v35`} fill="none" />
    </g>)}
    <path d="M-11 0v-23q11-16 22 0V0" fill="#756079" stroke="#d6b18b" strokeWidth="3" />
    <path d="M-45-81H45M-45-29H45M-54-10H54" stroke="#d9b3a0" strokeWidth="5" />
  </g>;
}

function Crystal({ x, y, scale = 1, id, pale = false }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={pale ? '#bfd9ee' : '#8475bf'} strokeWidth="2">
    <path d="M-23 0-31-67-6-110 24-66 16 0Z" fill={`url(#${id}-crystal)`} />
    <path d="m-6-110 2 110 28-66M-31-67-4-49 24-66" fill="none" stroke={pale ? '#f3ffff' : '#e7d3ff'} />
    <path d="M-39 0-52-37-37-63-17-38-20 0M24 0 23-40 40-68 53-34 45 0" fill={pale ? '#d2eef6' : '#b389de'} />
  </g>;
}

function BattlefieldBackdrop({ area, layout }) {
  const id = `land-${useId().replace(/:/g, '')}`, t = THEMES[area];
  const forest = area === 'forest', snow = area === 'snow', city = area === 'city', chaos = area === 'chaos';
  const regionalArt = ASSETS.maps[area];
  return <>
    <Layer name="sky" area={area}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="-300" y2="900" gradientUnits="userSpaceOnUse">
          <stop stopColor={t.sky} /><stop offset="1" stopColor={t.horizon} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}><stop stopColor={chaos ? '#edc5ff' : '#fff9d4'} stopOpacity=".8" /><stop offset="1" stopColor={t.horizon} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-land`} x1="0" x2="0" y1="850" y2="1500" gradientUnits="userSpaceOnUse"><stop stopColor={t.bank} /><stop offset="1" stopColor={t.ground} /></linearGradient>
        <linearGradient id={`${id}-water`} x1="0" x2="0" y1="1000" y2="1500" gradientUnits="userSpaceOnUse"><stop stopColor="#91c7ba" /><stop offset="1" stopColor="#387d80" /></linearGradient>
        <linearGradient id={`${id}-lane`} x1="0" x2="0" y1="840" y2="975" gradientUnits="userSpaceOnUse"><stop stopColor={t.dark} /><stop offset=".22" stopColor={t.light} /><stop offset=".7" stopColor={t.lane} /><stop offset="1" stopColor={t.dark} /></linearGradient>
        <linearGradient id={`${id}-stone`} x2=".8" y2="1"><stop stopColor="#dec3ba" /><stop offset=".5" stopColor="#a68a9b" /><stop offset="1" stopColor="#796580" /></linearGradient>
        <linearGradient id={`${id}-crystal`} x2=".9" y2=".7"><stop stopColor={snow ? '#f5ffff' : '#f6c5ff'} /><stop offset=".45" stopColor={snow ? '#a3d9f3' : '#a38bee'} /><stop offset="1" stopColor={snow ? '#578ebd' : '#6052b8'} /></linearGradient>
        <pattern id={`${id}-grain`} width="137" height="69" patternUnits="userSpaceOnUse">
          <path d="m9 20 23-2m17 29 14 2m27-38 21 1m7 44 15-3" stroke={t.light} strokeWidth="2" opacity=".4" />
          <path d="m25 56 13-2m49-24 14 2" stroke={t.dark} strokeWidth="2" opacity=".35" />
          <ellipse cx="66" cy="14" rx="3" ry="1.5" fill={t.dark} opacity=".3" />
        </pattern>
        <pattern id={`${id}-tiles`} width="148" height="74" patternUnits="userSpaceOnUse">
          <path d="M0 0H148V74H0ZM74 0V37M0 37H148M37 37V74M111 37V74" fill="none" stroke={t.dark} strokeWidth="2" opacity=".46" />
          <path d="M1 2H146M2 39H146" stroke={t.light} strokeWidth="2" opacity=".5" />
        </pattern>
        <clipPath id={`${id}-landmarks`}><rect x="0" y="-800" width={layout.width} height="1620" /></clipPath>
        <clipPath id={`${id}-left`}><rect width="600" height="1200" /></clipPath>
        <clipPath id={`${id}-right`}><rect x="3000" width="600" height="1200" /></clipPath>
        <clipPath id={`${id}-route`}><path d="M-200 798Q400 774 800 800T1700 803T2700 797T3800 804V1034Q3200 1020 2600 1030T1400 1024T-200 1030Z" /></clipPath>
        <clipPath id={`${id}-foreground`}><path d="M-100-200H36V1010H3564V-200H3700V1800H-100Z" /></clipPath>
      </defs>
      <rect x="-5000" y="-5000" width="13600" height="5900" fill={t.sky} />
      <rect x="-5000" y="-1200" width="13600" height="2100" fill={`url(#${id}-sky)`} />
      <ellipse cx={chaos ? 1750 : 730} cy="300" rx="820" ry="620" fill={`url(#${id}-sun)`} />
      {forest && [[200, -680], [1850, -300]].map(([x, y]) => <ArtPatch key={x} href={ASSETS.forestLayers.distant}
        x={x} y={y} width="1300" height={1300 * 284 / 1086} viewBox="450 30 1086 284" opacity=".6" />)}
      {!chaos && [0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(${i * 850 - 180} ${170 + i % 3 * 80}) scale(${1 + i % 2 * .3})`} fill="#fff8dc" opacity={snow ? .45 : .52}>
        <path d="M0 40Q19 12 57 22Q71-17 108 5Q139-17 165 12Q202-1 225 30Q270 17 293 44Q192 57 121 49Q56 60 0 40" />
        <path d="M120 87q71-16 164-8l57 9q-89 5-221-1" opacity=".6" />
      </g>)}
      {chaos && Array.from({ length: 65 }, (_, i) => <g key={i} transform={`translate(${(i * 233 + 80) % 3600} ${(i * 137 + 37) % 720 - 140})`} fill={i % 3 ? '#d5ddff' : '#f5cdff'} opacity={.3 + i % 4 * .15}>
        <path d={`M0-${4 + i % 3 * 3} 2-2 ${4 + i % 3 * 3} 0 2 2 0 ${4 + i % 3 * 3}-2 2-${4 + i % 3 * 3} 0-2-2Z`} />
      </g>)}
    </Layer>

    <Layer name="distant" area={area}>
      <path d="M-400 800Q-100 690 100 711L360 486 510 616 720 411 970 655 1300 452 1460 647 1810 398 2050 637 2340 484 2600 678 2890 402 3120 609 3460 460 3900 754V1200H-400Z" fill={t.far} opacity=".36" />
      {snow && <path d="m360 486-66 122 68-28 47 25 101 11-79-71-71-59m360-75-95 148 86-32 77 42 71-29-139-129m1090-13-117 169 97-48 66 24 55-23-101-122m1080 4-118 192 120-66 64 28 67-11-133-143" fill="#edf5ff" opacity=".7" />}
      {forest && [[-120, '0 0 1536 1024'], [930, '450 80 1086 724'], [1980, '400 170 1136 757.3333333333'],
        [3030, '650 70 886 590.6666666667']].map(([x, crop]) => <ArtPatch key={x} href={ASSETS.forestLayers.distant}
        x={x} y="100" width="1200" height="800" viewBox={crop} />)}
      {snow && <g opacity=".24">{Array.from({ length: 25 }, (_, i) => <Pine key={i} x={i * 156 - 80} y={812 + i % 3 * 9} scale={.65 + i % 5 * .13} snowy dark />)}</g>}
      {city && Array.from({ length: 19 }, (_, i) => <Building key={i} x={i * 215 - 100} y={825 + i % 3 * 9} scale={.9 + i % 4 * .25} id={id} distant />)}
      {chaos && [500, 1450, 2580].map((x, i) => <g key={x} transform={`translate(${x} ${470 + i % 2 * 110})`} opacity=".42">
        <path d="M-90 0Q0-30 100-4L45 87 2 110-40 59Z" fill="#605283" /><path d="M-90 0Q0-30 100-4L47 15-20 10Z" fill="#b3a0d0" /><Crystal x="5" y="-6" scale=".7" id={id} />
      </g>)}
    </Layer>

    <Layer name="midground" area={area}>
      <path d="M-300 840Q80 780 360 805T1010 803T1740 810T2490 799T3200 806T3900 790V1080H-300Z" fill={`url(#${id}-land)`} />
      {forest ? <>
        <g clipPath={`url(#${id}-left)`}><image href={ASSETS.forestLayers.midground} x="0" y="100" width="1200" height="800" preserveAspectRatio="xMidYMid meet" /></g>
        <g clipPath={`url(#${id}-right)`}><image href={ASSETS.forestLayers.midground} x="2400" y="100" width="1200" height="800" preserveAspectRatio="xMidYMid meet" /></g>
        {[620, 960, 1280, 1600, 1950, 2290, 2640].map((x, i) => <ArtPatch key={x} href={ASSETS.forestLayers.midground} x={x} y={540 + i % 3 * 24}
          width={380 + i % 2 * 60} height={(380 + i % 2 * 60) * 350 / 520} viewBox="0 10 520 350" />)}
      </> : <g clipPath={`url(#${id}-landmarks)`}>
        {/* Distinct cropped districts overlap into one illustrated ridge. Keeping
            the same baseline avoids detached rectangular landmark cards. */}
        {[[-90, '0 60 382 260'], [810, '382 60 382 260'], [1710, '0 248 382 260'], [2610, '382 248 382 260']].map(([x, crop]) =>
          <ArtPatch key={x} href={regionalArt} regional x={x} y="135" width="1000" height={1000 * 260 / 382} viewBox={crop} />)}
      </g>}
      {chaos && <g opacity=".6">{Array.from({ length: 7 }, (_, i) => <Crystal key={i} x={650 + i * 370} y={825 + i % 2 * 7} scale={.25 + i % 3 * .1} id={id} />)}</g>}
    </Layer>

    <Layer name="route" area={area}>
      <rect x="-5000" y="935" width="13600" height="5000" fill={`url(#${id}-land)`} />
      {forest && <>
        <rect x="-5000" y="1030" width="13600" height="5000" fill={`url(#${id}-water)`} />
        {Array.from({ length: 35 }, (_, i) => <path key={i} d={`M${i * 113 - 80} ${1075 + i % 5 * 34}q${20 + i % 4 * 12}-4 ${40 + i % 4 * 20} 0`}
          stroke="#d6edc4" strokeWidth="2" fill="none" opacity=".3" />)}
      </>}
      <path d="M-100 900H3700" stroke={t.dark} strokeWidth="142" />
      <path d="M-100 900H3700" stroke={`url(#${id}-lane)`} strokeWidth="110" />
      <path d="M-100 900H3700" stroke={`url(#${id}-${city ? 'tiles' : 'grain'})`} strokeWidth="110" />
      {forest && <g clipPath={`url(#${id}-route)`}>{[-200, 800, 1800, 2800].map(x =>
        <ArtPatch key={x} href={ASSETS.forestLayers.path} x={x} y="300" width="1200" height="800" />)}</g>}
      {!forest && <>
        <path d="M-100 843Q230 828 470 844T1000 844T1700 844T2400 844T3100 844T3700 844" fill="none" stroke={t.light} strokeWidth={snow ? 25 : 7} strokeLinecap="round" />
        <path d="M-100 964Q230 979 470 966T1000 966T1700 966T2400 966T3100 966T3700 966" fill="none" stroke={t.light} strokeWidth={snow ? 18 : 5} opacity=".8" />
        {city && Array.from({ length: 10 }, (_, i) => <path key={i} d={`m${120 + i * 370} 880 14 15-14 15-14-15Z`} fill="none" stroke="#e6c583" strokeWidth="2" opacity=".7" />)}
        {chaos && Array.from({ length: 12 }, (_, i) => <path key={i} d={`m${50 + i * 310} 851 22 20-8 28 33 27-10 29`} fill="none" stroke="#d2b4e6" strokeWidth="2.5" opacity=".55" />)}
      </>}
      {!city && Array.from({ length: 42 }, (_, i) => <g key={i} transform={`translate(${(i * 211) % 3600} ${i % 2 ? 990 + i % 3 * 7 : 811 - i % 4 * 3})`}>
        {snow ? <path d="M-17 2Q-15-12-5-11Q7-20 15-6Q26-8 29 2Z" fill="#e5f4fb" stroke="#acc9dc" strokeWidth="2" />
          : chaos ? <path d="M-7 5-10-7 0-17 9-5 6 5Z" fill="#b6a0e1" stroke="#7561a1" strokeWidth="2" />
            : <><path d="M0 8Q-19-10-23 0Q-7 11 0 8Q15-18 19-8Q18 4 0 8" fill="#69995b" /><circle cy="-4" r="5" fill={i % 3 ? '#edc575' : '#efb4b2'} /><circle cy="-4" r="2" fill="#fff6c4" /></>}
      </g>)}
    </Layer>

    <Layer name="foreground" area={area}>
      <g clipPath={`url(#${id}-foreground)`}>
        {!forest && [-100, 1100, 2300].map(x => <ArtPatch key={x} href={regionalArt} regional x={x} y="1030" width="1400" height={1400 * 110 / 764} viewBox="0 398 764 110" opacity=".85" />)}
        {forest ? <>
          {[-80, 2480].map(x => <ArtPatch key={x} href={ASSETS.forestLayers.foreground} x={x} y="300" width="1200" height="800" />)}
          {[850, 1800].map(x => <ArtPatch key={x} href={ASSETS.forestLayers.foreground} x={x} y="1010" width="1100" height="220" viewBox="250 830 1036 207.2" />)}
        </> : snow ? <>
          <path d="M-100 1110Q80 982 260 1040T780 1048T1350 1040T1940 1045T2540 1048T3100 1040T3700 1048V1500H-100Z" fill="#c2dfe9" opacity=".45" />
          <path d="M-100 1101Q80 972 260 1030T780 1038T1350 1030T1940 1035T2540 1038T3100 1030T3700 1038" fill="none" stroke="#edf9fc" strokeWidth="15" />
          {Array.from({ length: 20 }, (_, i) => <Crystal key={i} x={i * 210 - 100} y={1160 + i % 2 * 60} scale={.7 + i % 3 * .2} id={id} pale />)}
        </> : city ? <>
          <path d="M-100 1090H3700V1600H-100Z" fill="#6c607d" opacity=".35" /><path d="M-100 1090H3700M-100 1120H3700" stroke="#c4a08b" strokeWidth="6" />
          {Array.from({ length: 25 }, (_, i) => <g key={i} transform={`translate(${i * 155} 1125)`} fill="none" stroke="#ddba7f" strokeWidth="3"><path d="M0 0v80m-55-66q55-42 110 0v50q-55-35-110 0Z" /><path d="m0 10 13 20-13 20-13-20Z" /></g>)}
        </> : <>
          <path d="M-100 1110Q300 1000 600 1100T1300 1090T2050 1090T2780 1090T3700 1060V1700H-100Z" fill="#4e416f" opacity=".4" />
          {Array.from({ length: 22 }, (_, i) => <Crystal key={i} x={i * 180 - 30} y={1160 + i % 3 * 25} scale={.7 + i % 4 * .17} id={id} />)}
        </>}
      </g>
    </Layer>
  </>;
}

export default memo(BattlefieldBackdrop);
