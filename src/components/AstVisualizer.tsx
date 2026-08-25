import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ASTNode } from '../types/analyzer';

interface AstVisualizerProps {
  astData: ASTNode | null;
  nodeCount?: number;
  warnings?: string[];
  errorMessage?: string | null;
  onSelectNode: (line: number | null) => void;
}

const AST_TRANSITION_MS = 300;

export const AstVisualizer: React.FC<AstVisualizerProps> = ({
  astData,
  nodeCount,
  warnings,
  errorMessage,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeVisualizerRef = useRef<D3TreeEngine | null>(null);

  const handleZoomIn = () => activeVisualizerRef.current?.zoomIn();
  const handleZoomOut = () => activeVisualizerRef.current?.zoomOut();
  const handleResetZoom = () => activeVisualizerRef.current?.resetZoom();

  useEffect(() => {
    if (activeVisualizerRef.current) {
      activeVisualizerRef.current.destroy();
      activeVisualizerRef.current = null;
    }

    if (!containerRef.current || !astData || errorMessage) {
      return;
    }

    try {
      const engine = new D3TreeEngine(containerRef.current, astData, onSelectNode);
      engine.render();
      activeVisualizerRef.current = engine;
    } catch (err) {
      console.error('[AstVisualizer] D3 render error:', err);
    }

    return () => {
      if (activeVisualizerRef.current) {
        activeVisualizerRef.current.destroy();
        activeVisualizerRef.current = null;
      }
    };
  }, [astData, errorMessage, onSelectNode]);

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

      <div className="ast-visualization" ref={containerRef}>
        {errorMessage ? (
          <div className="ast-empty-state ast-error-state">
            <strong>Unable to build AST</strong>
            <p>{errorMessage}</p>
          </div>
        ) : !astData ? (
          <div className="ast-empty-state">
            Run analysis to generate an interactive syntax tree.
          </div>
        ) : null}
      </div>
    </div>
  );
};

class D3TreeEngine {
  private containerEl: HTMLDivElement;
  private astData: ASTNode;
  private onSelectNode: (line: number | null) => void;
  private nodeWidth = 172;
  private nodeHeight = 58;
  private nodeId = 0;
  private duration = AST_TRANSITION_MS;

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private graph: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private root: d3.HierarchyNode<ASTNode> | null = null;
  private selectedNodeId: number | null = null;
  private width = 720;
  private height = 520;

  constructor(containerEl: HTMLDivElement, astData: ASTNode, onSelectNode: (line: number | null) => void) {
    this.containerEl = containerEl;
    this.astData = astData;
    this.onSelectNode = onSelectNode;

    d3.selectAll('.ast-tooltip').remove();
    this.tooltip = d3.select('body').append('div').attr('class', 'ast-tooltip');
  }

  destroy() {
    d3.select(this.containerEl).selectAll('*').remove();
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  private weightClass(d: d3.HierarchyNode<ASTNode>): string {
    const w = d.data.complexity_weight;
    if (w === 3) return 'w3';
    if (w === 2) return 'w2';
    return 'w1';
  }

  render() {
    d3.select(this.containerEl).selectAll('*').remove();
    this.nodeId = 0;

    const bounds = this.containerEl.getBoundingClientRect();
    this.width = Math.max(bounds.width || 720, 600);
    this.height = Math.max(bounds.height || 520, 440);

    this.svg = d3
      .select(this.containerEl)
      .append('svg')
      .attr('class', 'ast-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.graph = this.svg.append('g').attr('class', 'ast-root-group');

    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2.5])
      .on('zoom', (event) => {
        this.graph?.attr('transform', event.transform);
      });

    this.svg.call(this.zoomBehavior);

    const safeTree: ASTNode = {
      ...this.astData,
      children: Array.isArray(this.astData.children) ? this.astData.children : [],
    };

    this.root = d3.hierarchy<ASTNode>(safeTree);
    (this.root as any).x0 = this.width / 2;
    (this.root as any).y0 = 40;

    const totalNodes = this.root.descendants().length;
    if (totalNodes > 35) {
      this.collapseAfterDepth(this.root, 2);
    } else if (totalNodes > 15) {
      this.collapseAfterDepth(this.root, 3);
    }

    this.update(this.root, true);
  }

  private collapseAfterDepth(node: d3.HierarchyNode<ASTNode>, maxDepth: number) {
    if (!node.children) return;
    if (node.depth >= maxDepth) {
      node.data._children = node.children.map((c) => c.data);
      (node as any)._children = node.children;
      (node as any).children = undefined;
      return;
    }
    node.children.forEach((child) => this.collapseAfterDepth(child, maxDepth));
  }

  fitToContainer() {
    if (!this.svg || !this.root || !this.graph || !this.zoomBehavior) return;

    const nodes = this.root.descendants();
    if (!nodes.length) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach((d: any) => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const paddingX = this.nodeWidth;
    const paddingY = this.nodeHeight;

    const treeWidth = (maxX - minX) + paddingX * 2;
    const treeHeight = (maxY - minY) + paddingY * 2;

    const scaleX = this.width / treeWidth;
    const scaleY = this.height / treeHeight;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const tx = this.width / 2 - centerX * scale;
    const ty = Math.max(40, this.height / 2 - centerY * scale);

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);

    this.svg
      .transition()
      .duration(450)
      .ease(d3.easeCubicInOut)
      .call(this.zoomBehavior.transform, transform);
  }

  private update(source: any, isInitial = false) {
    if (!this.root || !this.graph) return;

    const treeLayout = d3
      .tree<ASTNode>()
      .nodeSize([this.nodeWidth + 28, this.nodeHeight + 42]);

    treeLayout(this.root);

    const nodes = this.root.descendants();
    const links = this.root.links();

    nodes.forEach((node: any) => {
      node.y = node.depth * 105;
    });

    const nodeSelection = this.graph
      .selectAll<SVGGElement, d3.HierarchyNode<ASTNode>>('g.ast-node')
      .data(nodes, (d: any) => d.id || (d.id = ++this.nodeId));

    const nodeEnter = nodeSelection
      .enter()
      .append('g')
      .attr('class', (d) => {
        const selected = (d as any).id === this.selectedNodeId ? ' is-active' : '';
        return `ast-node ast-node--${this.weightClass(d)}${selected}`;
      })
      .attr('transform', () => `translate(${source.x0 ?? source.x},${source.y0 ?? source.y})`)
      .on('click', (event, d) => this.handleNodeClick(event, d))
      .on('mouseenter', (event, d) => this.showTooltip(event, d))
      .on('mousemove', (event) => this.moveTooltip(event))
      .on('mouseleave', () => this.hideTooltip());

    nodeEnter
      .append('rect')
      .attr('x', -this.nodeWidth / 2)
      .attr('y', -this.nodeHeight / 2)
      .attr('width', this.nodeWidth)
      .attr('height', this.nodeHeight)
      .attr('rx', 10);

    nodeEnter
      .append('text')
      .attr('class', 'ast-node-title')
      .attr('dy', '-0.3em')
      .attr('text-anchor', 'middle')
      .text((d) => this.truncate(d.data.label || d.data.type, 22));

    nodeEnter
      .append('text')
      .attr('class', 'ast-node-meta')
      .attr('dy', '1.35em')
      .attr('text-anchor', 'middle')
      .text((d) => this.nodeSubtitle(d));

    nodeEnter
      .append('circle')
      .attr('class', 'ast-expand-dot')
      .attr('cx', this.nodeWidth / 2 - 12)
      .attr('cy', -this.nodeHeight / 2 + 12)
      .attr('r', 4)
      .style('opacity', (d: any) => (d.children || d._children ? 1 : 0));

    const nodeUpdate = nodeEnter.merge(nodeSelection as any);

    nodeUpdate
      .attr('class', (d) => {
        const selected = (d as any).id === this.selectedNodeId ? ' is-active' : '';
        return `ast-node ast-node--${this.weightClass(d)}${selected}`;
      })
      .transition()
      .duration(this.duration)
      .ease(d3.easeCubicInOut)
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    nodeUpdate
      .select('.ast-expand-dot')
      .style('opacity', (d: any) => (d.children || d._children ? 1 : 0))
      .style('fill', (d: any) => (d._children ? 'var(--primary)' : null));

    nodeSelection
      .exit()
      .transition()
      .duration(this.duration)
      .attr('transform', () => `translate(${source.x},${source.y})`)
      .style('opacity', 0)
      .remove();

    const linkSelection = this.graph
      .selectAll<SVGPathElement, d3.HierarchyLink<ASTNode>>('path.ast-link')
      .data(links, (d: any) => d.target.id);

    const linkEnter = linkSelection
      .enter()
      .insert('path', 'g')
      .attr('class', 'ast-link')
      .attr('d', () => {
        const point = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
        return this.linkPath({ source: point, target: point });
      });

    linkEnter
      .merge(linkSelection as any)
      .transition()
      .duration(this.duration)
      .ease(d3.easeCubicInOut)
      .attr('d', (d: any) => this.linkPath(d));

    linkSelection
      .exit()
      .transition()
      .duration(this.duration)
      .attr('d', () => {
        const point = { x: source.x, y: source.y };
        return this.linkPath({ source: point, target: point });
      })
      .remove();

    nodes.forEach((d: any) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    if (isInitial) {
      setTimeout(() => this.fitToContainer(), 50);
    }
  }

  private handleNodeClick(event: MouseEvent, node: any) {
    event.stopPropagation();
    this.selectedNodeId = node.id;
    this.graph?.selectAll('.ast-node').classed('is-active', false);
    d3.select(event.currentTarget as Element).classed('is-active', true);

    if (node.children) {
      node._children = node.children;
      node.children = null;
    } else if (node._children) {
      node.children = node._children;
      node._children = null;
    }

    this.update(node);
    this.onSelectNode(node.data.line ?? null);
  }

  private linkPath(d: { source: { x: number; y: number }; target: { x: number; y: number } }) {
    const midY = (d.source.y + d.target.y) / 2;
    return `
      M ${d.source.x},${d.source.y + this.nodeHeight / 2}
      C ${d.source.x},${midY}
        ${d.target.x},${midY}
        ${d.target.x},${d.target.y - this.nodeHeight / 2}
    `;
  }

  private nodeSubtitle(node: d3.HierarchyNode<ASTNode>): string {
    const line = node.data.line ? `Line ${node.data.line}` : 'No line';
    return `${node.data.type} • ${line}`;
  }

  private showTooltip(event: MouseEvent, node: d3.HierarchyNode<ASTNode>) {
    if (!this.tooltip) return;

    const complexity: any = node.data.complexity || {};
    const metadata = node.data.metadata || {};
    const details = Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(
        ([key, value]) =>
          `<div><b>${this.escapeHtml(key)}</b>: ${this.escapeHtml(
            Array.isArray(value) ? value.join(', ') : String(value)
          )}</div>`
      )
      .join('');

    this.tooltip
      .html(`
        <strong>${this.escapeHtml(node.data.type)}</strong>
        <div class="ast-tooltip-line">Line: ${node.data.line ?? 'n/a'}</div>
        <p>${this.escapeHtml(complexity.reason || 'No complexity note.')}</p>
        ${details || '<div class="ast-tooltip-empty">No extra metadata</div>'}
      `)
      .classed('is-visible', true);

    this.moveTooltip(event);
  }

  private moveTooltip(event: MouseEvent) {
    if (!this.tooltip) return;
    const padding = 16;
    let x = event.pageX + padding;
    let y = event.pageY + padding;

    const tooltipNode = this.tooltip.node();
    if (tooltipNode) {
      const rect = tooltipNode.getBoundingClientRect();
      if (x + rect.width > window.innerWidth - 20) {
        x = event.pageX - rect.width - padding;
      }
      if (y + rect.height > window.innerHeight - 20) {
        y = event.pageY - rect.height - padding;
      }
    }

    this.tooltip.style('left', `${x}px`).style('top', `${y}px`);
  }

  private hideTooltip() {
    this.tooltip?.classed('is-visible', false);
  }

  zoomIn() {
    if (this.svg && this.zoomBehavior) {
      this.svg.transition().duration(250).call(this.zoomBehavior.scaleBy, 1.25);
    }
  }

  zoomOut() {
    if (this.svg && this.zoomBehavior) {
      this.svg.transition().duration(250).call(this.zoomBehavior.scaleBy, 0.8);
    }
  }

  resetZoom() {
    this.fitToContainer();
  }

  private truncate(value: string, length: number) {
    const text = String(value || '');
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  private escapeHtml(str: string) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
