import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { AnalyzerToolbar } from './components/AnalyzerToolbar';
import { CodeEditor } from './components/CodeEditor';
import { MetricsGrid } from './components/MetricsGrid';
import { AstVisualizer } from './components/AstVisualizer';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ProgressIndicator } from './components/ProgressIndicator';
import { SaveTitleModal } from './components/SaveTitleModal';
import { HomePage } from './components/HomePage';
import { HistoryPage } from './components/HistoryPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { useAnalysisSocket } from './hooks/useAnalysisSocket';
import { useAuth } from './context/AuthContext';
import { analyzerApi } from './services/analyzerApi';
import { AnalyzeResponse } from './types/analyzer';

const DEFAULT_CODE = `# Mock sample loaded
def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i+1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates`;

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('codeanalyzer-theme') as 'dark' | 'light') || 'dark';
  });

  // Client Routing State: /login, /signup, /home, /analyzer, /history
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = window.location.pathname.replace('/', '').toLowerCase();
    if (['login', 'signup', 'analyzer', 'history'].includes(path)) return path;
    return 'home';
  });

  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [fileStatus, setFileStatus] = useState<string>('Mock sample loaded');
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState<boolean>(false);
  const [analysisState, setAnalysisState] = useState<string>('Ready');
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState<boolean>(false);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { isConnected: isSocketConnected, isAnalyzing: isSocketAnalyzing, stages, analyzeCode: analyzeSocket } = useAnalysisSocket();

  const isAnalyzing = isAnalyzingLocal || isSocketAnalyzing;

  const navigate = useCallback((route: string) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', `/${route}`);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '').toLowerCase();
      if (['login', 'signup', 'analyzer', 'history'].includes(path)) {
        setCurrentRoute(path);
      } else {
        setCurrentRoute('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Protected route redirection logic
  useEffect(() => {
    if (!authLoading && !user && ['history'].includes(currentRoute)) {
      navigate('login');
    }
  }, [user, authLoading, currentRoute, navigate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('codeanalyzer-theme', theme);
  }, [theme]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setIsSaved(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleFileUpload = (newCode: string, filename: string) => {
    setCode(newCode);
    setFileStatus(filename);
    setIsSaved(false);
  };

  const handleClearCode = () => {
    setCode('');
    setFileStatus('Empty');
    setAnalysisResponse(null);
    setHighlightLine(null);
    setAnalysisState('Ready');
    setIsSaved(false);
  };

  const handleResetExample = () => {
    setCode(DEFAULT_CODE);
    setFileStatus('Mock sample loaded');
    setHighlightLine(null);
    setIsSaved(false);
  };

  const runAnalyze = useCallback(() => {
    if (isAnalyzing) return;

    setAnalysisState('Analyzing…');
    setHighlightLine(null);
    setIsSaved(false);

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

  const handleInitiateSave = () => {
    if (!user) {
      navigate('login');
      return;
    }
    if (!analysisResponse || !analysisResponse.success) return;
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async (title: string) => {
    if (!analysisResponse || !analysisResponse.success) return;
    try {
      const resp = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title,
          source_code: code,
          analysis_result: analysisResponse,
        }),
      });
      if (resp.ok) {
        setIsSaved(true);
      } else {
        alert('Failed to save analysis.');
      }
    } catch (err) {
      alert('Network error saving analysis.');
    }
  };

  const handleLoadSnippet = (selectedCode: string, res: AnalyzeResponse) => {
    setCode(selectedCode);
    setAnalysisResponse(res);
    setFileStatus('Restored from History');
    setHighlightLine(null);
    setAnalysisState('Restored');
    setIsSaved(true);
  };

  const errorLine = !analysisResponse?.success ? analysisResponse?.line ?? null : null;
  const errorMessage = !analysisResponse?.success ? analysisResponse?.message ?? null : null;
  const defaultSaveTitle = `Analysis — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="app-shell">
      <Navbar
        currentRoute={currentRoute}
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {currentRoute === 'login' && <LoginPage onNavigate={navigate} />}

      {currentRoute === 'signup' && <SignupPage onNavigate={navigate} />}

      {currentRoute === 'home' && (
        <HomePage
          onNavigate={navigate}
          onLoadSnippet={handleLoadSnippet}
        />
      )}

      {currentRoute === 'history' && (
        <HistoryPage
          onNavigate={navigate}
          onLoadSnippet={handleLoadSnippet}
        />
      )}

      {currentRoute === 'analyzer' && (
        <main className="analyzer-workspace-flow">
          <AnalyzerToolbar
            fileStatus={fileStatus}
            onFileUpload={handleFileUpload}
            onClear={handleClearCode}
            onResetExample={handleResetExample}
            onAnalyze={runAnalyze}
            isAnalyzing={isAnalyzing}
          />

          <ProgressIndicator
            stages={stages}
            isAnalyzing={isAnalyzing}
            isSocketConnected={isSocketConnected}
          />

          {/* Row 1: Python Editor (50%) | Analysis Results (50%) Equal Height Grid */}
          <div className={`editor-results-row ${isEditorCollapsed ? 'is-collapsed-row' : ''}`}>
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              onAnalyze={runAnalyze}
              onClear={handleClearCode}
              onResetExample={handleResetExample}
              theme={theme}
              fileStatus={fileStatus}
              highlightLine={highlightLine}
              errorLine={errorLine}
              errorMessage={errorMessage}
              isAnalyzing={isAnalyzing}
              isCollapsed={isEditorCollapsed}
              onToggleCollapse={() => setIsEditorCollapsed((prev) => !prev)}
            />

            <MetricsGrid
              metrics={analysisResponse?.success ? analysisResponse.metrics || null : null}
              error={!analysisResponse?.success ? analysisResponse?.error : null}
              errorMessage={errorMessage}
            />
          </div>

          {/* Row 2: Full-Width AI Explanation */}
          <AnalysisPanel
            explanations={
              analysisResponse?.success ? analysisResponse.explanations || null : null
            }
            error={!analysisResponse?.success ? analysisResponse?.error : null}
            errorMessage={errorMessage}
            onSaveExplanation={handleInitiateSave}
            isSaved={isSaved}
            canSave={!!analysisResponse && !!analysisResponse.success}
          />

          {/* Row 3: Full-Width Interactive AST */}
          <AstVisualizer
            astData={analysisResponse?.success ? analysisResponse.ast || null : null}
            nodeCount={analysisResponse?.node_count}
            warnings={analysisResponse?.warnings}
            errorMessage={errorMessage}
            cached={analysisResponse?.cached}
            onSelectNode={setHighlightLine}
            sourceCode={code}
          />
        </main>
      )}

      <SaveTitleModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleConfirmSave}
        defaultTitle={defaultSaveTitle}
      />
    </div>
  );
};
