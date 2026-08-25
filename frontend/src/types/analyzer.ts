export interface NodeComplexity {
  level: string;
  color: string;
  reason: string;
}

export interface ASTNode {
  type: string;
  label: string;
  line: number | null;
  end_line?: number | null;
  metadata?: Record<string, any>;
  complexity?: NodeComplexity;
  complexity_weight?: number;
  children: ASTNode[];
  _children?: ASTNode[];
}

export interface MetricStatusDetail {
  value: any;
  status: 'available' | 'estimated' | 'unavailable' | 'unsupported';
  reason?: string;
}

export interface ComplexityMetrics {
  time_complexity: string;
  space_complexity: string;
  dead_code_count: number | null;
  optimization_score: number;
  max_loop_depth?: number;
  max_condition_depth?: number;
  has_inefficient_recursion?: boolean;
  metric_status?: Record<string, MetricStatusDetail>;
}

export interface Explanations {
  time: string;
  space: string;
  optimization: string;
  summary: string;
}

export interface DetectionMetadata {
  language: string;
  display_name: string;
  source: string;
  confidence: number;
  supported: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  language?: string;
  ast?: ASTNode;
  metrics?: ComplexityMetrics;
  explanations?: Explanations;
  warnings?: string[];
  node_count?: number;
  cached?: boolean;
  detection?: DetectionMetadata;
  error?: string;
  message?: string;
  line?: number | null;
  _cause?: string;
  _status?: number;
}
