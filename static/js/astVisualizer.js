class AstVisualizer {
  constructor(containerId, options = {}) {
    this.container = d3.select(`#${containerId}`);
    this.onNodeClick = options.onNodeClick || function () {};
    this.duration = 300;
    this.nodeWidth = 168;
    this.nodeHeight = 58;
    this.nodeId = 0;
    this.root = null;
    this.svg = null;
    this.graph = null;
    this.tooltip = d3.select("body").append("div").attr("class", "ast-tooltip");
  }

  render(astData) {
    this.container.selectAll("*").remove();
    this.nodeId = 0;

    const bounds = this.container.node().getBoundingClientRect();
    const width = Math.max(bounds.width, 720);
    const height = Math.max(bounds.height, 520);

    this.svg = this.container
      .append("svg")
      .attr("class", "ast-svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    this.graph = this.svg.append("g").attr("transform", "translate(70, 46)");

    const zoom = d3.zoom().scaleExtent([0.35, 1.8]).on("zoom", (event) => {
      this.graph.attr("transform", event.transform);
    });

    this.svg.call(zoom);
    this.svg.call(zoom.transform, d3.zoomIdentity.translate(70, 46).scale(0.82));

    this.root = d3.hierarchy(astData);
    this.root.x0 = width / 2;
    this.root.y0 = 0;
    this.collapseAfterDepth(this.root, 1);
    this.update(this.root);
  }

  collapseAfterDepth(node, maxDepth) {
    if (!node.children) {
      return;
    }

    if (node.depth >= maxDepth) {
      node._children = node.children;
      node.children = null;
      return;
    }

    node.children.forEach((child) => this.collapseAfterDepth(child, maxDepth));
  }

  update(source) {
    const treeLayout = d3.tree().nodeSize([this.nodeWidth + 34, this.nodeHeight + 46]);
    treeLayout(this.root);

    const nodes = this.root.descendants();
    const links = this.root.links();

    nodes.forEach((node) => {
      node.y = node.depth * 112;
    });

    const node = this.graph
      .selectAll("g.ast-node")
      .data(nodes, (d) => d.id || (d.id = ++this.nodeId));

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", (d) => `ast-node ast-node--${d.data.complexity.color}`)
      .attr("transform", () => `translate(${source.x0},${source.y0})`)
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
      .attr("rx", 13);

    nodeEnter
      .append("text")
      .attr("class", "ast-node-title")
      .attr("dy", "-0.25em")
      .attr("text-anchor", "middle")
      .text((d) => this.truncate(d.data.label || d.data.type, 24));

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
      .transition()
      .duration(this.duration)
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

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
        const point = { x: source.x0, y: source.y0 };
        return this.linkPath({ source: point, target: point });
      });

    linkEnter
      .merge(link)
      .transition()
      .duration(this.duration)
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
  }

  handleNodeClick(event, node) {
    event.stopPropagation();
    this.graph.selectAll(".ast-node").classed("is-active", false);
    d3.select(event.currentTarget).classed("is-active", true);

    if (node.children) {
      node._children = node.children;
      node.children = null;
    } else {
      node.children = node._children;
      node._children = null;
    }

    this.onNodeClick(node.data);
    this.update(node);
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
    const metadata = node.data.metadata || {};
    const details = Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `<div><b>${key}</b>: ${Array.isArray(value) ? value.join(", ") : value}</div>`)
      .join("");

    this.tooltip
      .html(`
        <strong>${node.data.type}</strong>
        <p>${node.data.complexity.reason}</p>
        ${details || "<div>No extra metadata</div>"}
      `)
      .classed("is-visible", true);

    this.moveTooltip(event);
  }

  moveTooltip(event) {
    this.tooltip
      .style("left", `${event.pageX + 16}px`)
      .style("top", `${event.pageY + 16}px`);
  }

  hideTooltip() {
    this.tooltip.classed("is-visible", false);
  }

  truncate(value, length) {
    return value.length > length ? `${value.slice(0, length - 1)}…` : value;
  }
}

window.AstVisualizer = AstVisualizer;

