import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { AnalyzeResponse } from '../types/analyzer';

export interface ProgressStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
}

const DEFAULT_STAGES: ProgressStage[] = [
  { id: 'ast', label: 'Parsing AST representation', status: 'pending' },
  { id: 'complexity', label: 'Calculating complexity', status: 'pending' },
  { id: 'dead_code', label: 'Detecting dead code & branches', status: 'pending' },
  { id: 'optimization', label: 'Calculating optimization score', status: 'pending' },
  { id: 'ai', label: 'Generating AI explanations', status: 'pending' },
];

export function useAnalysisSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [stages, setStages] = useState<ProgressStage[]>(DEFAULT_STAGES);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef<{
    onSuccess?: (res: AnalyzeResponse) => void;
    onError?: (err: { message: string; line?: number | null }) => void;
    onFallback?: () => void;
  }>({});

  useEffect(() => {
    // Initialize Socket.IO connection to host
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('analysis_progress', (evt: { stage: string; data?: any }) => {
      const { stage, data } = evt;

      if (stage === 'analysis_started') {
        setIsAnalyzing(true);
        setStages(DEFAULT_STAGES);
      } else if (stage === 'cache_check') {
        // Cache check in progress
      } else if (stage === 'cache_hit') {
        setStages((prev) =>
          prev.map((s) => ({ ...s, status: 'completed', detail: 'Served from Redis cache' }))
        );
      } else if (stage === 'ast_started') {
        setStages((prev) =>
          prev.map((s) => (s.id === 'ast' ? { ...s, status: 'running' } : s))
        );
      } else if (stage === 'ast_completed') {
        setStages((prev) =>
          prev.map((s) =>
            s.id === 'ast'
              ? { ...s, status: 'completed', detail: `${data.node_count ?? '?'} nodes` }
              : s
          )
        );
      } else if (stage === 'complexity_completed') {
        setStages((prev) =>
          prev.map((s) =>
            s.id === 'complexity'
              ? { ...s, status: 'completed', detail: `Time ${data.time_complexity || 'O(1)'}` }
              : s
          )
        );
      } else if (stage === 'dead_code_completed') {
        setStages((prev) =>
          prev.map((s) =>
            s.id === 'dead_code'
              ? { ...s, status: 'completed', detail: `${data.dead_code_count ?? 0} signals` }
              : s
          )
        );
      } else if (stage === 'optimization_completed') {
        setStages((prev) =>
          prev.map((s) =>
            s.id === 'optimization'
              ? { ...s, status: 'completed', detail: `${data.optimization_score ?? 100}/100` }
              : s
          )
        );
      } else if (stage === 'ai_analysis_started') {
        setStages((prev) =>
          prev.map((s) => (s.id === 'ai' ? { ...s, status: 'running' } : s))
        );
      } else if (stage === 'ai_analysis_completed') {
        setStages((prev) =>
          prev.map((s) => (s.id === 'ai' ? { ...s, status: 'completed' } : s))
        );
      } else if (stage === 'analysis_completed') {
        setIsAnalyzing(false);
        setStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
        if (callbackRef.current.onSuccess) {
          callbackRef.current.onSuccess(data);
        }
      } else if (stage === 'analysis_error') {
        setIsAnalyzing(false);
        setStages((prev) =>
          prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' } : s))
        );
        if (callbackRef.current.onError) {
          callbackRef.current.onError({
            message: data.message || 'Analysis failed',
            line: data.line ?? null,
          });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const analyzeCode = useCallback(
    (
      code: string,
      language: string | undefined,
      filename: string | undefined,
      onSuccess: (res: AnalyzeResponse) => void,
      onError: (err: { message: string; line?: number | null }) => void,
      onFallback: () => void
    ) => {
      callbackRef.current = { onSuccess, onError, onFallback };

      if (socketRef.current && isConnected) {
        setIsAnalyzing(true);
        setStages(DEFAULT_STAGES);
        socketRef.current.emit('start_analysis', { code, language, filename });
      } else {
        // Fall back to HTTP API
        onFallback();
      }
    },
    [isConnected]
  );

  return {
    isConnected,
    isAnalyzing,
    stages,
    analyzeCode,
  };
}
