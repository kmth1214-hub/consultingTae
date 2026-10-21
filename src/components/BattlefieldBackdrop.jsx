import React, { memo } from 'react';
import SceneArt from './SceneArt.jsx';
import ForestLayerContent from './ForestLayerContent.jsx';
import { useSceneActivity } from '../game/useSceneActivity.js';

function BattlefieldBackdrop({ area, motionPaused = false }) {
  const activity = useSceneActivity({ paused: motionPaused });
  return area === 'forest' ? <ForestLayerContent activity={activity} /> : <SceneArt area={area} activity={activity} />;
}

export default memo(BattlefieldBackdrop);
