/**
 * D3 v7 interactive tree for AST JSON from Python backend.
 * Features:
 * - Dynamic centering and auto-fitting tree bounds
 * - Zoom in / out / reset view controls
 * - Expand / collapse subtrees on node click
 * - Line selection callback to highlight editor lines
 * - Detailed hover tooltips with metadata & complexity notes
 * - Safe fallback & error handling
 */

const AST_TRANSITION_MS = 300;

let activeVisualizer = null;

function getD3() {
  if (typeof window.d3 !== "undefined") {
    return window.d3;
  }
  if (typeof window.require === "function") {
    try {
      return window.require("d3");
    } catch (_) {
      /* ignore */
    }
  }
  return null;
}

class AstTreeVisualizer {
  constructor(containerId, options = {}) {
    const d3 = getD3();
    if (!d3) {
      throw new Error("D3 library is not loaded.");
    }
    this.d3 = d3;
    this.containerId = containerId;
    this.container = d3.select(`#${containerId}`);
    this.options = options;
    this.onNodeSelect = options.onNodeSelect || null;
    this.duration = AST_TRANSITION_MS;
    this.nodeWidth = 172;
    this.nodeHeight = 58;
    this.nodeId = 0;
    this.root = null;
    this.svg = null;
    this.graph = null;
    this.zoomBehavior = null;
    this.selectedNodeId = null;

    // Ensure clean tooltip element
    d3.selectAll(".ast-tooltip").remove();
    this.tooltip = d3.select("body").append("div").attr("class", "ast-tooltip");
  }

  destroy() {
    this.container.selectAll("*").remove();
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }

  weightClass(d) {
    const w = d.data && d.data.complexity_weight;
    if (w === 3) return "w3";
    if (w === 2) return "w2";
    return "w1";
  }

  render(astData) {
    const d3 = this.d3;
    this.container.selectAll("*").remove();
    this.nodeId = 0;

    const el = this.container.node();
    if (!el) {
      console.error("[AstTreeVisualizer] Missing container #" + this.containerId);
      return;
    }

    const bounds = el.getBoundingClientRect();
    const width = Math.max(bounds.width || 720, 600);
    const height = Math.max(bounds.height || 520, 440);
    this.width = width;
    this.height = height;

    this.svg = this.container
      .append("svg")
      .attr("class", "ast-svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    this.graph = this.svg.append("g").attr("class", "ast-root-group");

    this.zoomBehavior = d3
      .zoom()
      .scaleExtent([0.2, 2.5])
      .on("zoom", (event) => {
        this.graph.attr("transform", event.transform);
      });

    this.svg.call(this.zoomBehavior);

    // Build hierarchy
    this.root = d3.hierarchy(astData);
    this.root.x0 = width / 2;
    this.root.y0 = 40;

    // Collapse deeper subtrees initially if tree is large
    const totalNodes = this.root.descendants().length;
    if (totalNodes > 35) {
      this.collapseAfterDepth(this.root, 2);
    } else if (totalNodes > 15) {
      this.collapseAfterDepth(this.root, 3);
    }

    this.update(this.root, true);
  }

  collapseAfterDepth(node, maxDepth) {
    if (!node.children) return;
    if (node.depth >= maxDepth) {
      node._children = node.children;
      node.children = null;
      return;
    }
    node.children.forEach((child) => this.collapseAfterDepth(child, maxDepth));
  }

  fitToContainer() {
    const d3 = this.d3;
    if (!this.svg || !this.root || !this.graph) return;

    const nodes = this.root.descendants();
    if (!nodes.length) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach((d) => {
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

  update(source, isInitial = false) {
    const d3 = this.d3;
    const treeLayout = d3
      .tree()
      .nodeSize([this.nodeWidth + 28, this.nodeHeight + 42]);

    treeLayout(this.root);

    const nodes = this.root.descendants();
    const links = this.root.links();

    nodes.forEach((node) => {
      node.y = node.depth * 105;
    });

    const node = this.graph
      .selectAll("g.ast-node")
      .data(nodes, (d) => d.id || (d.id = ++this.nodeId));

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", (d) => {
        const selected = d.id === this.selectedNodeId ? " is-active" : "";
        return `ast-node ast-node--${this.weightClass(d)}${selected}`;
      })
      .attr("transform", () => `translate(${source.x0 ?? source.x},${source.y0 ?? source.y})`)
      .on("click", (event, d) => this.handleNodeClick(event, d))
      .on("mouseenter", (event, d) => this.showTooltip(event, d))
      .on("mousemove", (event) => this.moveTooltip(event))
      .on("mouseleave", () => this.hideTooltip());

    nodeEnter
      .append("rect")
      .attr("x", -this.nodeWidth / 2)
      .attr("y", -this.nodeHeight / 2)
      .attr("width", this.nodeWidth)
      .attr("height", this.nodeHeight)
      .attr("rx", 10);

    nodeEnter
      .append("text")
      .attr("class", "ast-node-title")
      .attr("dy", "-0.3em")
      .attr("text-anchor", "middle")
      .text((d) => this.truncate(d.data.label || d.data.type, 22));

    nodeEnter
      .append("text")
      .attr("class", "ast-node-meta")
      .attr("dy", "1.35em")
      .attr("text-anchor", "middle")
      .text((d) => this.nodeSubtitle(d));

    nodeEnter
      .append("circle")
      .attr("class", "ast-expand-dot")
      .attr("cx", this.nodeWidth / 2 - 12)
      .attr("cy", -this.nodeHeight / 2 + 12)
      .attr("r", 4)
      .style("opacity", (d) => (d.children || d._children ? 1 : 0));

    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate
      .attr("class", (d) => {
        const selected = d.id === this.selectedNodeId ? " is-active" : "";
        return `ast-node ast-node--${this.weightClass(d)}${selected}`;
      })
      .transition()
      .duration(this.duration)
      .ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodeUpdate
      .select(".ast-expand-dot")
      .style("opacity", (d) => (d.children || d._children ? 1 : 0))
      .style("fill", (d) => (d._children ? "var(--primary)" : undefined));

    node
      .exit()
      .transition()
      .duration(this.duration)
      .attr("transform", () => `translate(${source.x},${source.y})`)
      .style("opacity", 0)
      .remove();

    const link = this.graph
      .selectAll("path.ast-link")
      .data(links, (d) => d.target.id);

    const linkEnter = link
      .enter()
      .insert("path", "g")
      .attr("class", "ast-link")
      .attr("d", () => {
        const point = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
        return this.linkPath({ source: point, target: point });
      });

    linkEnter
      .merge(link)
      .transition()
      .duration(this.duration)
      .ease(d3.easeCubicInOut)
      .attr("d", (d) => this.linkPath(d));

    link
      .exit()
      .transition()
      .duration(this.duration)
      .attr("d", () => {
        const point = { x: source.x, y: source.y };
        return this.linkPath({ source: point, target: point });
      })
      .remove();

    nodes.forEach((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    if (isInitial) {
      setTimeout(() => this.fitToContainer(), 50);
    }
  }

  handleNodeClick(event, node) {
    event.stopPropagation();
    const d3 = this.d3;

    this.selectedNodeId = node.id;
    this.graph.selectAll(".ast-node").classed("is-active", false);
    d3.select(event.currentTarget).classed("is-active", true);

    // Toggle expansion if node has children or collapsed children
    if (node.children) {
      node._children = node.children;
      node.children = null;
    } else if (node._children) {
      node.children = node._children;
      node._children = null;
    }

    this.update(node);

    // Callback for editor line syncing
    if (typeof this.onNodeSelect === "function") {
      this.onNodeSelect(node.data);
    }
  }

  linkPath(d) {
    const midY = (d.source.y + d.target.y) / 2;
    return `
      M ${d.source.x},${d.source.y + this.nodeHeight / 2}
      C ${d.source.x},${midY}
        ${d.target.x},${midY}
        ${d.target.x},${d.target.y - this.nodeHeight / 2}
    `;
  }

  nodeSubtitle(node) {
    const line = node.data.line ? `Line ${node.data.line}` : "No line";
    return `${node.data.type} • ${line}`;
  }

  showTooltip(event, node) {
    const complexity = node.data.complexity || {};
    const metadata = node.data.metadata || {};
    const details = Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(
        ([key, value]) =>
          `<div><b>${this.escapeHtml(key)}</b>: ${this.escapeHtml(
            Array.isArray(value) ? value.join(", ") : String(value)
          )}</div>`
      )
      .join("");

    this.tooltip
      .html(`
        <strong>${this.escapeHtml(node.data.type)}</strong>
        <div class="ast-tooltip-line">Line: ${node.data.line ?? "n/a"}</div>
        <p>${this.escapeHtml(complexity.reason || "No complexity note.")}</p>
        ${details || "<div class=\"ast-tooltip-empty\">No extra metadata</div>"}
      `)
      .classed("is-visible", true);

    this.moveTooltip(event);
  }

  moveTooltip(event) {
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

    this.tooltip.style("left", `${x}px`).style("top", `${y}px`);
  }

  hideTooltip() {
    this.tooltip.classed("is-visible", false);
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

  truncate(value, length) {
    const text = String(value || "");
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

/**
 * Render AST into the given container. Replaces any previous visualization.
 * @param {object} astData - root node from backend
 * @param {string} containerId - DOM id (no #)
 * @param {object} [options] - configuration options (e.g. onNodeSelect)
 */
window.renderAST = function renderAST(astData, containerId, options = {}) {
  const containerEl = document.getElementById(containerId);
  if (!containerEl) {
    console.error("[renderAST] No element #" + containerId);
    return;
  }

  if (!astData || typeof astData !== "object") {
    if (activeVisualizer) {
      activeVisualizer.destroy();
      activeVisualizer = null;
    }
    containerEl.innerHTML = `
      <div class="ast-empty-state">
        No AST data available. Run analysis first.
      </div>
    `;
    return;
  }

  if (!Array.isArray(astData.children)) {
    astData = { ...astData, children: [] };
  }

  if (activeVisualizer) {
    activeVisualizer.destroy();
    activeVisualizer = null;
  }

  try {
    activeVisualizer = new AstTreeVisualizer(containerId, options);
    activeVisualizer.render(astData);
  } catch (err) {
    console.error("[renderAST] D3 / hierarchy error", err, "AST root", astData);
    if (activeVisualizer) {
      try {
        activeVisualizer.destroy();
      } catch (_) {
        /* ignore */
      }
      activeVisualizer = null;
    }
    containerEl.innerHTML = `
      <div class="ast-empty-state ast-error-state">
        <strong>Unable to build AST</strong>
        <p>${err && err.message ? err.message : "Visualization error encountered."}</p>
      </div>
    `;
  }
};

window.astZoomIn = function () {
  if (activeVisualizer) activeVisualizer.zoomIn();
};

window.astZoomOut = function () {
  if (activeVisualizer) activeVisualizer.zoomOut();
};

window.astResetZoom = function () {
  if (activeVisualizer) activeVisualizer.resetZoom();
};
