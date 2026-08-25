import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CodeEditor } from './components/CodeEditor';
import { MetricsGrid } from './components/MetricsGrid';
import { AstVisualizer } from './components/AstVisualizer';
import { AnalysisPanel } from './components/AnalysisPanel';
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
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisState, setAnalysisState] = useState<string>('Ready');
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

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

  const runAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisState('Analyzing…');
    setHighlightLine(null);

    const res = await analyzerApi.analyze(code);
    setAnalysisResponse(res);
    setIsAnalyzing(false);

    if (res.success) {
      setAnalysisState('Ready');
    } else {
      setAnalysisState('Error');
    }
  }, [code]);

  return (
    <div className="app-shell">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onAnalyze={runAnalyze}
        onFileUpload={handleFileUpload}
        isAnalyzing={isAnalyzing}
        fileStatus={fileStatus}
      />

      <main className="dashboard">
        <CodeEditor
          value={code}
          onChange={setCode}
          theme={theme}
          fileStatus={fileStatus}
          highlightLine={highlightLine}
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

          <MetricsGrid
            metrics={analysisResponse?.success ? analysisResponse.metrics || null : null}
            error={!analysisResponse?.success ? analysisResponse?.error : null}
            errorMessage={!analysisResponse?.success ? analysisResponse?.message : null}
          />

          <AstVisualizer
            astData={analysisResponse?.success ? analysisResponse.ast || null : null}
            nodeCount={analysisResponse?.node_count}
            warnings={analysisResponse?.warnings}
            errorMessage={!analysisResponse?.success ? analysisResponse?.message : null}
            onSelectNode={setHighlightLine}
          />
        </section>

        <AnalysisPanel
          explanations={
            analysisResponse?.success ? analysisResponse.explanations || null : null
          }
          error={!analysisResponse?.success ? analysisResponse?.error : null}
          errorMessage={!analysisResponse?.success ? analysisResponse?.message : null}
        />
      </main>
    </div>
  );
};
