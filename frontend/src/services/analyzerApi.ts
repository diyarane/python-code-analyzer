import { AnalyzeResponse } from '../types/analyzer';

export const analyzerApi = {
  /**
   * POST /analyze — returns AST JSON, metrics, explanations, and detection metadata.
   * Accepts an optional AbortSignal for canceling in-flight HTTP requests.
   */
  async analyze(
    code: string,
    language?: string,
    filename?: string,
    signal?: AbortSignal
  ): Promise<AnalyzeResponse> {
    let response: Response;
    try {
      response = await fetch('/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language, filename }),
        signal,
      });
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        throw err;
      }
      return {
        success: false,
        error: 'NetworkError',
        message: err && err.message ? err.message : 'Could not complete the network request.',
        line: null,
        _cause: 'network',
      };
    }

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      return {
        success: false,
        error: 'InvalidResponse',
        message: 'Server returned invalid JSON.',
        line: null,
        _cause: 'parse',
      };
    }

    if (!response.ok && data.success !== false) {
      return {
        success: false,
        error: data.error || 'HttpError',
        message: data.message || response.statusText || `HTTP ${response.status}`,
        line: data.line ?? null,
        _cause: 'http',
        _status: response.status,
      };
    }

    const ast = data.ast ?? data.ast_data ?? data.tree ?? null;
    const metrics = data.metrics ?? data.analysis ?? null;
    const explanations = data.explanations ?? data.explanation ?? null;

    return {
      ...data,
      ast,
      metrics: metrics && typeof metrics === 'object' ? metrics : undefined,
      explanations: explanations && typeof explanations === 'object' ? explanations : undefined,
    };
  },
};
