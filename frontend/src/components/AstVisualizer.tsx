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
  languageDisplayName?: string;
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
  languageDisplayName = 'Code',
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
                      An Abstract Syntax Tree (AST) represents your {languageDisplayName} code as a structured tree of statements, expressions, functions, loops, and other language constructs.
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
            Explore the structure of the analyzed {languageDisplayName} code.
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
              type="button"
              className="btn btn-secondary nav-btn-sm icon-only-btn"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom In"
            >
              <IconZoomIn size={15} />
            </button>
            <button
              type="button"
              className="btn btn-secondary nav-btn-sm icon-only-btn"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <IconZoomOut size={15} />
            </button>
            <button
              type="button"
              className="btn btn-secondary nav-btn-sm icon-only-btn"
              onClick={handleResetZoom}
              title="Fit View"
              aria-label="Fit View"
            >
              <IconScanSearch size={15} />
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary nav-btn-sm expand-btn"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand AST Canvas'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand AST Canvas'}
          >
            {isFullscreen ? (
              <>
                <IconMinimize2 size={14} /> Exit Fullscreen
              </>
            ) : (
              <>
                <IconMaximize2 size={14} /> Expand
              </>
            )}
          </button>
        </div>
      </div>

      <div className="ast-canvas-container">
        {errorMessage ? (
          <div className="ast-empty-state error">
            <p>{errorMessage}</p>
          </div>
        ) : !astData ? (
          <div className="ast-empty-state">
            <p>No AST data available. Run analysis to render graph.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            minZoom={0.1}
            maxZoom={2.5}
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(142, 233, 255, 0.08)" gap={20} size={1} />
            <MiniMap
              nodeColor={(node) => {
                const color = node.data?.complexity?.color;
                if (color === 'red') return '#ef4444';
                if (color === 'yellow') return '#f59e0b';
                return '#10b981';
              }}
              maskColor="rgba(15, 23, 42, 0.7)"
              style={{
                backgroundColor: 'var(--surface-card)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            />
          </ReactFlow>
        )}

        {/* Selected Node Details Drawer / Popover Inspector */}
        {selectedNodeData && (
          <div className="node-inspector-drawer">
            <div className="drawer-header">
              <div className="drawer-title-badge">
                <span className={`complexity-dot ${selectedNodeData.complexity?.color || 'green'}`} />
                <span className="drawer-type-label">{selectedNodeData.type}</span>
              </div>
              <button
                type="button"
                className="icon-btn drawer-close-btn"
                onClick={() => setSelectedNodeData(null)}
                aria-label="Close inspector"
                title="Close inspector"
              >
                <IconX size={14} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-row">
                <span className="drawer-label">Display Label:</span>
                <strong className="drawer-val">{selectedNodeData.label}</strong>
              </div>

              {selectedNodeData.line && (
                <div className="drawer-row">
                  <span className="drawer-label">Source Range:</span>
                  <span className="drawer-val">
                    {selectedNodeData.end_line && selectedNodeData.end_line !== selectedNodeData.line
                      ? `Lines ${selectedNodeData.line}–${selectedNodeData.end_line}`
                      : `Line ${selectedNodeData.line}`}
                  </span>
                </div>
              )}

              {selectedNodeData.complexity && (
                <div className="drawer-row">
                  <span className="drawer-label">Impact Reason:</span>
                  <p className="drawer-reason-text">{selectedNodeData.complexity.reason}</p>
                </div>
              )}

              {/* Live Source Snippet Code View */}
              {snippetData && snippetData.lines.length > 0 && (
                <div className="drawer-snippet-box">
                  <div className="snippet-header">Source Snippet</div>
                  <pre className="snippet-code">
                    {snippetData.lines.map((l) => (
                      <div
                        key={l.lineNumber}
                        className={`snippet-line ${l.isHighlighted ? 'is-target' : ''}`}
                      >
                        <span className="snippet-num">{l.lineNumber}</span>
                        <span className="snippet-text">{l.content}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export const AstVisualizer: React.FC<AstVisualizerProps> = (props) => (
  <ReactFlowProvider>
    <AstFlowCanvas {...props} />
  </ReactFlowProvider>
);
