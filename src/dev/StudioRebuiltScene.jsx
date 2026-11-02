import React, { useId } from 'react';
import BattlefieldBackdrop from '../components/BattlefieldBackdrop.jsx';
import SceneAtmosphere from '../components/SceneAtmosphere.jsx';
import StudioDepthScene from '../components/StudioDepthScene.jsx';
import { getSceneProfile } from '../game/sceneCatalog.js';
import { useSceneActivity } from '../game/useSceneActivity.js';
import { getStudioScenePanels } from './studioSceneCatalog.js';

const ORDER = [['midground', 'midground'], ['path', 'route'], ['foreground', 'foreground']];

function StudioPanelLayer({ area, role, layer, panels, palette, activity, visible }) {
  const prefix = `rebuilt-${useId().replace(/:/g, '')}`;
  return <svg className={`battlefield-layer scene-${layer} studio-painted-layer`}
    data-scene-layer={layer} data-scene-area={area}
    style={{ display: visible ? undefined : 'none' }}
    viewBox="0 0 3600 1200" aria-hidden="true">
    <defs>
      <linearGradient id={`${prefix}-east-fade`} x1="1500" x2="2100" gradientUnits="userSpaceOnUse">
        <stop stopColor="black" /><stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id={`${prefix}-west-fade`} x1="1500" x2="2100" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" /><stop offset="1" stopColor="black" />
      </linearGradient>
      <mask id={`${prefix}-east-mask`} maskUnits="userSpaceOnUse" x="1500" y="-450" width="2700" height="1800">
        <rect x="1500" y="-450" width="2700" height="1800" fill={`url(#${prefix}-east-fade)`} />
      </mask>
      <mask id={`${prefix}-west-mask`} maskUnits="userSpaceOnUse" x="-600" y="-450" width="2700" height="1800">
        <rect x="-600" y="-450" width="2100" height="1800" fill="white" />
        <rect x="1500" y="-450" width="600" height="1800" fill={`url(#${prefix}-west-fade)`} />
      </mask>
      <linearGradient id={`${prefix}-ground`} x1="0" x2="0" y1="1050" y2="1800" gradientUnits="userSpaceOnUse">
        <stop stopColor={palette.bank} /><stop offset="1" stopColor={palette.ground} />
      </linearGradient>
    </defs>
    {role === 'path' && area !== 'forest' && <rect x="0" y="1050" width="3600" height="5000" fill={`url(#${prefix}-ground)`} />}
    {role === 'path' && <rect x="0" y="885" width="3600" height="75" fill={palette.lane} opacity=".5" />}
    <g data-depth-plane={layer}>
      {panels.map(panel => <g key={panel.side} data-studio-painted-panel={role} data-panel-side={panel.side}
        mask={`url(#${prefix}-${panel.side}-mask)`}>
        <svg x={panel.x} y={panel.y} width={panel.width} height={panel.height}
          viewBox={`0 0 ${panel.sourceWidth} ${panel.sourceHeight}`} preserveAspectRatio="none" overflow="hidden">
          <image href={panel.href} width={panel.sourceWidth} height={panel.sourceHeight} preserveAspectRatio="none" />
        </svg>
      </g>)}
      {role === 'path' && <SceneAtmosphere area={area} band="near" {...activity} />}
    </g>
  </svg>;
}

export default function StudioRebuiltScene({ area, layout, visibleLayers, motionPaused = false, toppledObstacleIds = [] }) {
  const panels = getStudioScenePanels(area);
  const palette = getSceneProfile(area).palette;
  const activity = useSceneActivity({ paused: motionPaused });
  return <>
    <BattlefieldBackdrop area={area} motionPaused={motionPaused}
      visibleLayers={{ sky: visibleLayers?.sky !== false, distant: visibleLayers?.distant !== false,
        midground: false, route: false, foreground: false }} />
    {ORDER.map(([role, layer]) => <StudioPanelLayer key={role} area={area} role={role} layer={layer}
      panels={panels[role]} palette={palette} activity={activity} visible={visibleLayers?.[layer] !== false} />)}
    {visibleLayers?.route !== false && <StudioDepthScene area={area} layout={layout}
      toppledObstacleIds={toppledObstacleIds} renderRoad={false} />}
  </>;
}
