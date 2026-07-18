'use client';

import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function PulsingEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, label, labelStyle, labelBgStyle,
  data,
}: EdgeProps & { data?: { animated?: boolean } }) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 16,
  });

  const isAnimating = data?.animated !== false;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd}
        label={label} labelStyle={labelStyle} labelBgStyle={labelBgStyle} />
      {isAnimating && (
        <>
          {/* Flowing particle */}
          <circle r="4" fill="#FF5A1F" opacity="0.9">
            <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.2s" repeatCount="indefinite" />
          </circle>
          {/* Trailing glow */}
          <circle r="8" fill="#FF5A1F" opacity="0.2">
            <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} begin="-0.2s" />
          </circle>
          {/* Second particle offset */}
          <circle r="3" fill="#FF8A5B" opacity="0.7">
            <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} begin="-1.2s" />
            <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </>
  );
}
