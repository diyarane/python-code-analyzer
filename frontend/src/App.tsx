import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CodeEditor } from './components/CodeEditor';
import { MetricsGrid } from './components/MetricsGrid';
import { AstVisualizer } from './components/AstVisualizer';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ProgressIndicator } from './components/ProgressIndicator';
import { AuthModal } from './components/AuthModal';
import { HistoryPanel } from './components/HistoryPanel';
import { useAnalysisSocket } from './hooks/useAnalysisSocket';
import { analyzerApi } from './services/analyzerApi';
import { AnalyzeResponse } from './types/analyzer';

const DEFAULT_CODE = `def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i+1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates`;

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('codeanalyzer-theme') as 'dark' | 'light') || 'dark';
  });

  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [fileStatus, setFileStatus] = useState<string>('Mock sample loaded');
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState<boolean>(false);
  const [analysisState, setAnalysisState] = useState<string>('Ready');
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  // Auth & History State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { isConnected: isSocketConnected, isAnalyzing: isSocketAnalyzing, stages, analyzeCode: analyzeSocket } = useAnalysisSocket();

  const isAnalyzing = isAnalyzingLocal || isSocketAnalyzing;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('codeanalyzer-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleFileUpload = (newCode: string, filename: string) => {
    setCode(newCode);
    setFileStatus(filename);
  };

  const handleClearCode = () => {
    setCode('');
    setFileStatus('Empty');
    setAnalysisResponse(null);
    setHighlightLine(null);
    setAnalysisState('Ready');
  };

  const handleResetExample = () => {
    setCode(DEFAULT_CODE);
    setFileStatus('Mock sample loaded');
    setHighlightLine(null);
  };

  const runAnalyze = useCallback(() => {
    if (isAnalyzing) return;

    setAnalysisState('Analyzing…');
    setHighlightLine(null);

    const handleSuccess = (res: AnalyzeResponse) => {
      setAnalysisResponse(res);
      setIsAnalyzingLocal(false);
      if (res.success) {
        setAnalysisState('Ready');
      } else {
        setAnalysisState('Error');
      }
    };

    const handleError = (err: { message: string; line?: number | null }) => {
      setAnalysisResponse({
        success: false,
        error: 'AnalysisError',
        message: err.message,
        line: err.line,
      });
      setIsAnalyzingLocal(false);
      setAnalysisState('Error');
    };

    const handleHttpFallback = async () => {
      setIsAnalyzingLocal(true);
      const res = await analyzerApi.analyze(code);
      handleSuccess(res);
    };

    analyzeSocket(code, handleSuccess, handleError, handleHttpFallback);
  }, [code, isAnalyzing, analyzeSocket]);

  const handleOpenAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSaveAnalysis = async () => {
    if (!analysisResponse || !analysisResponse.success) return;
    try {
      const resp = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source_code: code,
          analysis_result: analysisResponse,
        }),
      });
      if (resp.ok) {
        alert('Analysis saved successfully to your history!');
      } else {
        alert('Failed to save analysis.');
      }
    } catch (err) {
      alert('Network error saving analysis.');
    }
  };

  const handleSelectRecord = (selectedCode: string, res: AnalyzeResponse) => {
    setCode(selectedCode);
    setAnalysisResponse(res);
    setFileStatus('Loaded from history');
    setHighlightLine(null);
    setAnalysisState('Ready');
  };

  const errorLine = !analysisResponse?.success ? analysisResponse?.line ?? null : null;
  const errorMessage = !analysisResponse?.success ? analysisResponse?.message ?? null : null;

  return (
    <div className="app-shell">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onAnalyze={runAnalyze}
        onFileUpload={handleFileUpload}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onSaveAnalysis={handleSaveAnalysis}
        canSave={!!analysisResponse && !!analysisResponse.success}
        isAnalyzing={isAnalyzing}
        fileStatus={fileStatus}
      />

      <main className="dashboard">
        <CodeEditor
          value={code}
          onChange={setCode}
          onAnalyze={runAnalyze}
          onClear={handleClearCode}
          onResetExample={handleResetExample}
          theme={theme}
          fileStatus={fileStatus}
          highlightLine={highlightLine}
          errorLine={errorLine}
          errorMessage={errorMessage}
          isAnalyzing={isAnalyzing}
        />

        <section className="panel results-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analysis</p>
              <h2>Results Overview</h2>
            </div>
            <span
              className={`status-pill ${
                analysisState === 'Ready' ? 'status-pill-idle' : ''
              }`}
            >
              {analysisState}
            </span>
          </div>

          <ProgressIndicator
            stages={stages}
            isAnalyzing={isAnalyzing}
            isSocketConnected={isSocketConnected}
          />

          <MetricsGrid
            metrics={analysisResponse?.success ? analysisResponse.metrics || null : null}
            error={!analysisResponse?.success ? analysisResponse?.error : null}
            errorMessage={errorMessage}
          />

          <AstVisualizer
            astData={analysisResponse?.success ? analysisResponse.ast || null : null}
            nodeCount={analysisResponse?.node_count}
            warnings={analysisResponse?.warnings}
            errorMessage={errorMessage}
            cached={analysisResponse?.cached}
            onSelectNode={setHighlightLine}
          />
        </section>

        <AnalysisPanel
          explanations={
            analysisResponse?.success ? analysisResponse.explanations || null : null
          }
          error={!analysisResponse?.success ? analysisResponse?.error : null}
          errorMessage={errorMessage}
        />
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRecord={handleSelectRecord}
      />
    </div>
  );
};
