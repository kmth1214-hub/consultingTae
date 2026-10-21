import React from 'react';

export default function TrajectoryPreview({ path, previewD, visible }) {
  if (!path) return null;
  return <>
    <path data-testid="trajectory-geometry" d={path.d} fill="none" stroke="none" visibility="hidden" />
    {visible && <>
      <path className="trajectory-outline" d={previewD} fill="none" vectorEffect="non-scaling-stroke" />
      <path data-testid="trajectory-preview" className="trajectory-arc" d={previewD} fill="none" vectorEffect="non-scaling-stroke" />
    </>}
  </>;
}
