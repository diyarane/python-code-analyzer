import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const AstNodeCustom = memo(({ data, selected }: NodeProps) => {
  const { type, label, line, complexity_weight, complexity, metadata } = data;

  const weightClass = complexity_weight === 3 ? 'w3' : complexity_weight === 2 ? 'w2' : 'w1';
  const subtitle = `${type} • ${line ? `Line ${line}` : 'No line'}`;
  const truncatedTitle = String(label || type).length > 22 ? `${String(label || type).slice(0, 21)}…` : label || type;

  const tooltipText = [
    `Type: ${type}`,
    `Line: ${line ?? 'n/a'}`,
    `Reason: ${complexity?.reason || 'No complexity note.'}`,
  ].join('\n');

  return (
    <div
      className={`ast-node ast-node--${weightClass} ${selected ? 'is-active' : ''}`}
      title={tooltipText}
    >
      <Handle type="target" position={Position.Top} className="ast-node-handle" />
      <div className="ast-node-card">
        <div className="ast-node-title">{truncatedTitle}</div>
        <div className="ast-node-meta">{subtitle}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="ast-node-handle" />
    </div>
  );
});
AstNodeCustom.displayName = 'AstNodeCustom';
