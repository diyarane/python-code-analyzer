import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { ASTNode } from '../types/analyzer';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 60;

export function convertAstToReactFlow(astRoot: ASTNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeIdCounter = 0;

  function traverse(astNode: ASTNode, parentId: string | null = null): string {
    const id = `node_${++nodeIdCounter}`;

    const nodeData = {
      type: astNode.type,
      label: astNode.label || astNode.type,
      line: astNode.line,
      end_line: astNode.end_line ?? astNode.line,
      complexity: astNode.complexity,
      complexity_weight: astNode.complexity_weight || 1,
      metadata: astNode.metadata || {},
    };

    nodes.push({
      id,
      type: 'astNode',
      data: nodeData,
      position: { x: 0, y: 0 },
    });

    if (parentId) {
      edges.push({
        id: `edge_${parentId}_${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: { stroke: 'rgba(142, 233, 255, 0.4)', strokeWidth: 1.8 },
      });
    }

    if (Array.isArray(astNode.children)) {
      for (const child of astNode.children) {
        traverse(child, id);
      }
    }

    return id;
  }

  traverse(astRoot);

  // Apply Dagre layout for hierarchical graph positioning
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPos = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPos.x - NODE_WIDTH / 2,
        y: nodeWithPos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
