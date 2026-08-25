/**
 * Centralized language capability definitions and metric explanation provider.
 */

export interface MetricCapability {
  supported: boolean;
  status: 'available' | 'estimated' | 'unsupported';
  title: string;
  copy: string;
  reason?: string;
}

export function getMetricExplanation(
  metricKey: 'time_complexity' | 'space_complexity' | 'dead_code_count' | 'optimization_score' | 'ast_visualization',
  languageDisplayName: string = 'Code',
  isSupportedMetric: boolean = true,
  deadCodeCount: number | null = null
): MetricCapability {
  const lang = languageDisplayName || 'Code';

  switch (metricKey) {
    case 'time_complexity':
      return {
        supported: true,
        status: 'estimated',
        title: 'Time Complexity',
        copy: `Estimated static time complexity based on loop nesting and control-flow structure in ${lang}. This is a static heuristic estimate and does not represent measured runtime profiling.`,
      };
    case 'space_complexity':
      return {
        supported: true,
        status: 'estimated',
        title: 'Space Complexity',
        copy: `Estimated static space complexity based on memory-allocation patterns, data structures, and recursion/stack behavior in ${lang}.`,
      };
    case 'optimization_score':
      return {
        supported: true,
        status: 'estimated',
        title: 'Optimization Score',
        copy: `An estimated score based on the analyzer's current control-flow and optimization heuristics for ${lang}.`,
      };
    case 'dead_code_count':
      if (deadCodeCount !== null && deadCodeCount !== undefined && isSupportedMetric) {
        return {
          supported: true,
          status: 'available',
          title: 'Dead Code Analysis',
          copy: `Identifies unreachable statements and unreferenced function or variable definitions in ${lang} source code.`,
        };
      }
      return {
        supported: false,
        status: 'unsupported',
        title: 'Dead Code Analysis',
        copy: `Dead-code analysis is not currently implemented for ${lang} in this analyzer. The ${lang} adapter currently provides syntax/AST parsing, complexity estimation, and structural analysis, but does not yet expose dead-code detection.`,
        reason: `Dead-code detection is currently unsupported for ${lang}.`,
      };
    case 'ast_visualization':
      return {
        supported: true,
        status: 'available',
        title: 'Interactive AST',
        copy: `An Abstract Syntax Tree (AST) represents the structure of your ${lang} code as connected nodes. It helps the analyzer understand functions, loops, conditions, expressions, and other code constructs.`,
      };
    default:
      return {
        supported: true,
        status: 'estimated',
        title: 'Metric Information',
        copy: `Calculated from static AST structure for ${lang}.`,
      };
  }
}
