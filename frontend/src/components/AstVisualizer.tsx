import React, { useEffect, useCallback, useState } from 'react';
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
import {
  IconInfo,
  IconZoomIn,
  IconZoomOut,
  IconScanSearch,
  IconMaximize2,
  IconMinimize2,
  IconX,
} from './Icons';

interface AstVisualizerProps {
  astData: ASTNode | null;
  nodeCount?: number;
  warnings?: string[];
  errorMessage?: string | null;
  cached?: boolean;
  onSelectNode: (line: number | null) => void;
  sourceCode?: string;
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
  sourceCode = '',
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  const handleZoomIn = () => zoomIn({ duration: 250 });
  const handleZoomOut = () => zoomOut({ duration: 250 });
  const handleResetZoom = () => fitView({ padding: 0.2, duration: 400 });

  useEffect(() => {
    if (!astData || errorMessage) {
      setNodes([]);
      setEdges([]);
      setSelectedNodeData(null);
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

  // Keyboard Escape key handler to exit Fullscreen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        if (showInfoPopover) setShowInfoPopover(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showInfoPopover]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const line = node.data?.line ?? null;
      onSelectNode(line);

      setSelectedNodeData((prev: any) =>
        prev && prev.id === node.id ? null : { id: node.id, ...node.data }
      );
    },
    [onSelectNode]
  );

  // Extract source code lines for the selected AST node
  const getSourceSnippet = () => {
    if (!selectedNodeData || !sourceCode) return null;

    const allLines = sourceCode.split('\n');
    const startLine = selectedNodeData.line ?? 1;
    const endLine = selectedNodeData.end_line ?? startLine;

    // Show 2 context lines before and after
    const contextStart = Math.max(1, startLine - 2);
    const contextEnd = Math.min(allLines.length, endLine + 2);

    const linesToShow = [];
    for (let i = contextStart; i <= contextEnd; i++) {
      linesToShow.push({
        lineNumber: i,
        content: allLines[i - 1] || '',
        isHighlighted: i >= startLine && i <= endLine,
      });
    }

    return {
      startLine,
      endLine,
      lines: linesToShow,
    };
  };

  const snippetData = getSourceSnippet();

  return (
    <section className={`workspace-section panel ast-panel-section ${isFullscreen ? 'ast-fullscreen-overlay' : ''}`}>
      <div className="section-header">
        <div className="ast-header-title-group">
          <p className="eyebrow">Compiler View</p>
          <div className="ast-title-with-info">
            <h2>Interactive AST</h2>
            <div className="info-popover-wrapper">
              <button
                type="button"
                className="icon-btn info-trigger-btn"
                aria-label="AST information"
                title="AST information"
                onClick={() => setShowInfoPopover((prev) => !prev)}
                onMouseEnter={() => setShowInfoPopover(true)}
                onMouseLeave={() => setShowInfoPopover(false)}
              >
                <IconInfo size={16} />
              </button>

              {showInfoPopover && (
                <div className="info-popover-card">
                  <div className="popover-section">
                    <h4>What is an AST?</h4>
                    <p>
                      An Abstract Syntax Tree (AST) represents your Python code as a structured tree of statements, expressions, functions, loops, and other language constructs.
                    </p>
                  </div>
                  <div className="popover-section">
                    <h4>What does it help with?</h4>
                    <p>
                      It lets you visually explore how your code is structured and see where complexity, branches, loops, and other constructs occur.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="section-subtitle">
            Explore the structure of the analyzed Python code.
            {astData && !errorMessage && (
              <span className="ast-node-count-meta"> · {nodeCount ?? '?'} nodes</span>
            )}
            {cached && <span className="ast-cache-meta"> · Cached</span>}
            {warnings?.length ? <span className="ast-warning-meta"> · Limited depth</span> : null}
          </p>
        </div>

        <div className="section-header-actions">
          <div className="ast-btn-group" role="group" aria-label="AST view controls">
            <button
              className="btn btn-secondary nav-btn-sm"
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom in"
            >
              <IconZoomIn size={15} />
            </button>
            <button
              className="btn btn-secondary nav-btn-sm"
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <IconZoomOut size={15} />
            </button>

            <button
              className="btn btn-secondary nav-btn-sm"
              type="button"
              onClick={handleResetZoom}
              title="Fit View"
              aria-label="Fit AST to view"
            >
              <IconScanSearch size={15} /> Fit View
            </button>

            <button
              className="btn btn-secondary nav-btn-sm expand-ast-btn"
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Close Fullscreen (Esc)' : 'Fullscreen AST Workspace'}
              aria-label={isFullscreen ? 'Close expanded AST' : 'Expand AST'}
            >
              {isFullscreen ? <IconMinimize2 size={15} /> : <IconMaximize2 size={15} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`ast-workspace-body ${selectedNodeData ? 'has-inspector' : ''}`}>
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

        {/* Contextual Source Code Inspection Panel */}
        {selectedNodeData && snippetData && (
          <aside className="source-inspector-panel">
            <div className="inspector-header">
              <div className="inspector-header-title">
                <p className="eyebrow">SOURCE INSPECTION</p>
                <h3>
                  {selectedNodeData.type}
                  <span className="line-badge">
                    {snippetData.startLine === snippetData.endLine
                      ? `Line ${snippetData.startLine}`
                      : `Lines ${snippetData.startLine}–${snippetData.endLine}`}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                className="icon-btn close-inspector-btn"
                onClick={() => setSelectedNodeData(null)}
                aria-label="Close source inspector"
                title="Close source inspector"
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="inspector-content">
              {selectedNodeData.label && (
                <div className="inspector-meta-label">
                  <strong>Node:</strong> {selectedNodeData.label}
                </div>
              )}
              {selectedNodeData.complexity?.reason && (
                <div className="inspector-meta-reason">
                  <strong>Complexity Note:</strong> {selectedNodeData.complexity.reason}
                </div>
              )}

              <div className="snippet-code-box">
                {snippetData.lines.map((l) => (
                  <div
                    key={l.lineNumber}
                    className={`snippet-line ${l.isHighlighted ? 'is-selected-line' : ''}`}
                  >
                    <span className="line-num">{l.lineNumber}</span>
                    <span className="line-code">{l.content}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
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
