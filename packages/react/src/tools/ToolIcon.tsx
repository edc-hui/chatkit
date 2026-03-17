import React from 'react';

import type { ToolIconDescriptor } from '@kweaver-ai/chatkit-shared';

export interface ToolIconProps {
  icon?: ToolIconDescriptor;
  size?: number;
}

export function ToolIcon(props: ToolIconProps) {
  if (!props.icon) {
    return null;
  }

  const size = props.size ?? 20;

  if (props.icon.kind === 'image') {
    return <img src={props.icon.src} alt={props.icon.alt ?? ''} width={size} height={size} />;
  }

  return (
    <span
      aria-label={props.icon.ariaLabel}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(12, Math.floor(size * 0.6)),
        fontWeight: 700,
      }}
    >
      {props.icon.text}
    </span>
  );
}