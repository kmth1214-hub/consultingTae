import { screenToWorld, worldToScreen } from '../game/battlefieldCamera.js';

const WORLD = { width: 3600, height: 1200 };
const BOUNDS = { left: -600, right: 4200, top: -600, bottom: 1800 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const validViewport = v => v && Number.isFinite(v.width) && Number.isFinite(v.height) && v.width > 0 && v.height > 0;
const validCamera = c => c && Number.isFinite(c.zoom) && Number.isFinite(c.center?.x) && Number.isFinite(c.center?.y);

export function clampStudioCamera({ camera, viewport }) {
  if (!validCamera(camera) || !validViewport(viewport)) return camera;
  const zoom = clamp(camera.zoom, 1, 6), fit = Math.min(viewport.width / WORLD.width, viewport.height / WORLD.height);
  const scale = fit * zoom, halfWidth = viewport.width / scale / 2, halfHeight = viewport.height / scale / 2;
  const clampAxis = (value, min, max, half) => min + half > max - half
    ? (min + max) / 2 : clamp(value, min + half, max - half);
  return { zoom, center: {
    x: clampAxis(camera.center.x, BOUNDS.left, BOUNDS.right, halfWidth),
    y: clampAxis(camera.center.y, BOUNDS.top, BOUNDS.bottom, halfHeight)
  } };
}

export function getStudioPose({ viewport, camera } = {}) {
  if (!validViewport(viewport) || !validCamera(camera)) return null;
  const safe = clampStudioCamera({ camera, viewport });
  const scale = Math.min(viewport.width / WORLD.width, viewport.height / WORLD.height) * safe.zoom;
  return { scale, x: viewport.width / 2 - safe.center.x * scale,
    y: viewport.height / 2 - safe.center.y * scale };
}

export function panStudio({ camera, viewport, delta } = {}) {
  if (!validCamera(camera) || !validViewport(viewport) || !delta
    || !Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return camera;
  const pose = getStudioPose({ viewport, camera });
  return clampStudioCamera({ camera: { ...camera,
    center: { x: camera.center.x - delta.x / pose.scale, y: camera.center.y - delta.y / pose.scale } }, viewport });
}

export function zoomStudioAt({ camera, viewport, nextZoom, point } = {}) {
  if (!validCamera(camera) || !validViewport(viewport) || !Number.isFinite(nextZoom)
    || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return camera;
  const zoom = clamp(nextZoom, 1, 6), oldPose = getStudioPose({ viewport, camera });
  const anchor = screenToWorld(point, oldPose);
  const nextScale = Math.min(viewport.width / WORLD.width, viewport.height / WORLD.height) * zoom;
  const centered = { x: viewport.width / 2 - point.x, y: viewport.height / 2 - point.y };
  const next = { zoom, center: { x: anchor.x + centered.x / nextScale, y: anchor.y + centered.y / nextScale } };
  return clampStudioCamera({ camera: next, viewport });
}

export function studioScreenPoint(point, pose) { return worldToScreen(point, pose); }
