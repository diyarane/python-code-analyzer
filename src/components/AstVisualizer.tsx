import React, { useEffect, useMemo, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  Background,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ASTNode } from '../types/analyzer';
import { convertAstToReactFlow } from '../utils/astToReactFlow';
import { AstNodeCustom } from './AstNodeCustom';

interface AstVisualizerProps {
  astData: ASTNode | null;
  nodeCount?: number;
  warnings?: string[];
  errorMessage?: string | null;
  onSelectNode: (line: number | null) => void;
}

const nodeTypes = {
  astNode: AstNodeCustom,
};

const AstFlowCanvas: React.FC<AstVisualizerProps> = ({
  astData,
  nodeCount,
  warnings,
  errorMessage,
  onSelectNode,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleZoomIn = () => zoomIn({ duration: 250 });
  const handleZoomOut = () => zoomOut({ duration: 250 });
  const handleResetZoom = () => fitView({ padding: 0.2, duration: 400 });

  useEffect(() => {
    if (!astData || errorMessage) {
      setNodes([]);
      setEdges([]);
      return;
    }

    try {
      const { nodes: newNodes, edges: newEdges } = convertAstToReactFlow(astData);
      setNodes(newNodes);
      setEdges(newEdges);

      setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 50);
    } catch (err) {
      console.error('[AstVisualizer] Error setting up React Flow graph:', err);
    }
  }, [astData, errorMessage, setNodes, setEdges, fitView]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.data?.line ?? null);
    },
    [onSelectNode]
  );

  return (
    <div className="ast-panel">
      <div className="ast-toolbar">
        <div>
          <p className="eyebrow">Compiler View</p>
          <h2>Interactive AST</h2>
        </div>
        <div className="ast-toolbar-right">
          <div className="ast-btn-group" role="group" aria-label="AST view controls">
            <button className="ast-btn" type="button" onClick={handleZoomIn} title="Zoom In">+</button>
            <button className="ast-btn" type="button" onClick={handleZoomOut} title="Zoom Out">−</button>
            <button className="ast-btn" type="button" onClick={handleResetZoom} title="Fit / Reset View">Reset</button>
          </div>
          <span className="status-pill">
            {errorMessage
              ? 'AST error'
              : astData
              ? `${nodeCount ?? '?'} nodes${warnings?.length ? ' · limited depth' : ''}`
              : 'Waiting for code'}
          </span>
        </div>
      </div>

      <div className="ast-visualization">
        {errorMessage ? (
          <div className="ast-empty-state ast-error-state">
            <strong>Unable to build AST</strong>
            <p>{errorMessage}</p>
          </div>
        ) : !astData ? (
          <div className="ast-empty-state">
            Run analysis to generate an interactive syntax tree.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(125, 211, 252, 0.08)" gap={28} size={1} />
            <MiniMap
              style={{
                backgroundColor: 'rgba(10, 16, 30, 0.88)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              nodeColor={(n) => {
                const w = n.data?.complexity_weight;
                if (w === 3) return 'var(--danger)';
                if (w === 2) return 'var(--warning)';
                return 'var(--success)';
              }}
              maskColor="rgba(6, 9, 20, 0.65)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export const AstVisualizer: React.FC<AstVisualizerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AstFlowCanvas {...props} />
    </ReactFlowProvider>
  );
};
