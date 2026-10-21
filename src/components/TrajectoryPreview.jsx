import React from 'react';

export default function TrajectoryPreview({ path, visible }) {
  if (!path) return null;
  return <>
    <path data-testid="trajectory-geometry" d={path.d} fill="none" stroke="none" visibility="hidden" />
    {visible && <path data-testid="trajectory-preview" className="trajectory-arc" d={path.previewD} fill="none" />}
  </>;
}
