import { useEffect, useState } from 'react';

export function useSceneActivity({ paused = false } = {}) {
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [focused, setFocused] = useState(() => document.hasFocus());
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const onMedia = () => setReducedMotion(media.matches);
    const onVisibility = () => setHidden(document.hidden);
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    media.addEventListener('change', onMedia);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    onMedia(); onVisibility(); setFocused(document.hasFocus());
    return () => {
      media.removeEventListener('change', onMedia);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return { active: !paused && !hidden && focused && !reducedMotion, reducedMotion };
}
