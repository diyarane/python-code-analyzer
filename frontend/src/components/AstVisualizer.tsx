import React, { useEffect, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  Background,
  Node,
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
  cached?: boolean;
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
  cached,
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
    <section className="workspace-section panel ast-panel-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Compiler View</p>
          <h2>Interactive AST</h2>
          <p className="section-subtitle">Explore the structure of the analyzed Python code.</p>
        </div>
        <div className="section-header-actions">
          <div className="ast-btn-group" role="group" aria-label="AST view controls">
            <button className="btn btn-secondary nav-btn-sm" type="button" onClick={handleZoomIn} title="Zoom In">+</button>
            <button className="btn btn-secondary nav-btn-sm" type="button" onClick={handleZoomOut} title="Zoom Out">−</button>
            <button className="btn btn-secondary nav-btn-sm" type="button" onClick={handleResetZoom} title="Fit View">Fit View</button>
          </div>
          <span className="status-pill">
            {errorMessage
              ? 'AST error'
              : cached
              ? 'Cached result'
              : astData
              ? `${nodeCount ?? '?'} nodes${warnings?.length ? ' · limited depth' : ''}`
              : 'Awaiting analysis'}
          </span>
        </div>
      </div>

      <div className="ast-container">
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
            <Background color="rgba(255, 255, 255, 0.08)" gap={24} size={1} />
            <MiniMap
              style={{
                backgroundColor: '#121212',
                border: '1px solid #262626',
                borderRadius: '6px',
              }}
              nodeColor={(n) => {
                const w = n.data?.complexity_weight;
                if (w === 3) return '#ef4444';
                if (w === 2) return '#f59e0b';
                return '#10b981';
              }}
              maskColor="rgba(8, 8, 8, 0.75)"
            />
          </ReactFlow>
        )}
      </div>
    </section>
  );
};

export const AstVisualizer: React.FC<AstVisualizerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AstFlowCanvas {...props} />
    </ReactFlowProvider>
  );
};
