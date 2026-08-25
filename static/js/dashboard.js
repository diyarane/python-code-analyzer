/**
 * Dashboard: Monaco editor, theme, upload, and Analyze → /analyze integration.
 */

const DEFAULT_CODE = `def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i+1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates`;

const MONACO_VERSION_PATH =
  "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs";

const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = document.getElementById("theme-label");
const fileStatus = document.getElementById("file-status");
const analysisState = document.getElementById("analysis-state");
const metricsGrid = document.getElementById("metrics-grid");
const aiOutput = document.getElementById("ai-output");
const astWarning = document.getElementById("ast-warning");

let editor = null;
let analyzeTimer = null;

function getSavedTheme() {
  return localStorage.getItem("codeanalyzer-theme") || "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = theme === "dark" ? "Light" : "Dark";
  localStorage.setItem("codeanalyzer-theme", theme);

  if (editor && window.monaco) {
    window.monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme || "dark";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function initializeMonaco() {
  window.require.config({ paths: { vs: MONACO_VERSION_PATH } });

  window.require(["vs/editor/editor.main"], () => {
    editor = window.monaco.editor.create(document.getElementById("editor"), {
      value: DEFAULT_CODE,
      language: "python",
      theme: getSavedTheme() === "dark" ? "vs-dark" : "vs",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontLigatures: true,
      lineHeight: 22,
      padding: { top: 18, bottom: 18 },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      roundedSelection: true,
      cursorBlinking: "smooth",
      glyphMargin: true,
    });
  });
}

const DEBUG_DASHBOARD = true;

function logDashboard(...args) {
  if (DEBUG_DASHBOARD) {
    console.log("[dashboard]", ...args);
  }
}

/**
 * Map alternate backend keys to the shape the UI expects.
 * @param {object} data
 */
function normalizeAnalyzePayload(data) {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      error: "InvalidResponse",
      message: "Empty or invalid JSON from server.",
      line: null,
    };
  }
  const ast = data.ast ?? data.ast_data ?? data.tree ?? null;
  const metrics = data.metrics ?? data.analysis ?? null;
  const explanations = data.explanations ?? data.explanation ?? null;
  return {
    ...data,
    ast,
    metrics: metrics && typeof metrics === "object" ? metrics : {},
    explanations: explanations && typeof explanations === "object" ? explanations : {},
  };
}

/**
 * Update the four metric cards from backend metrics.
 * @param {object} metrics
 */
function updateMetrics(metrics) {
  const m = metrics && typeof metrics === "object" ? metrics : {};
  const score = Number(m.optimization_score);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  metricsGrid.innerHTML = `
    <article class="metric-card">
      <span class="metric-label">Time Complexity</span>
      <strong class="metric-value">${escapeHtml(String(m.time_complexity ?? "—"))}</strong>
      <p class="metric-copy">Estimated from loop nesting and exponential-recursion heuristics.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Space Complexity</span>
      <strong class="metric-value">${escapeHtml(String(m.space_complexity ?? "—"))}</strong>
      <p class="metric-copy">Estimated from data structures and recursion usage.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Dead Code</span>
      <strong class="metric-value">${escapeHtml(String(m.dead_code_count ?? "—"))}</strong>
      <p class="metric-copy">Unused functions plus unreachable statements after return/raise/exit.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Optimization Score</span>
      <strong class="metric-value">${escapeHtml(String(safeScore))}/100</strong>
      <div class="progress-track" aria-label="Optimization score ${safeScore} out of 100">
        <div class="progress-fill" style="width: ${safeScore}%"></div>
      </div>
      <p class="metric-copy">Penalizes nested loops, inefficient recursion, and deep conditions.</p>
    </article>
  `;
}

/**
 * Render AI-style explanations from backend (static text, not an LLM).
 * @param {object} explanations
 */
function updateExplanations(explanations) {
  const ex = explanations || {};
  aiOutput.innerHTML = `
    <article class="explanation-card">
      <span class="insight-tag">Analysis</span>
      <p>${escapeHtml(ex.summary || "")}</p>
      <p><strong>Time</strong> — ${escapeHtml(ex.time || "")}</p>
      <p><strong>Space</strong> — ${escapeHtml(ex.space || "")}</p>
      <p><strong>Optimization</strong> — ${escapeHtml(ex.optimization || "")}</p>
    </article>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

let editorDecorations = [];

function highlightEditorLine(line) {
  if (!editor || !window.monaco || !line || typeof line !== "number") return;
  try {
    editor.revealLineInCenter(line);
    editorDecorations = editor.deltaDecorations(editorDecorations, [
      {
        range: new window.monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "monaco-highlight-line",
          glyphMarginClassName: "monaco-highlight-glyph",
        },
      },
    ]);
  } catch (e) {
    console.error("[dashboard] Error highlighting editor line", e);
  }
}

function renderAnalysisError(payload) {
  analysisState.textContent = "Error";
  astWarning.textContent = payload.line ? `Line ${payload.line}` : "Syntax Error";

  metricsGrid.innerHTML = `
    <article class="metric-card placeholder-card">
      <span class="metric-label">${escapeHtml(payload.error || "Error")}</span>
      <strong class="metric-value">Failed</strong>
      <p class="metric-copy">${escapeHtml(payload.message || "Unable to analyze this code.")}</p>
    </article>
  `;

  document.getElementById("ast-visualization").innerHTML = `
    <div class="ast-empty-state ast-error-state">
      <strong>Unable to build AST</strong>
      <p>${escapeHtml(payload.message || "Unable to parse Python source code.")}</p>
    </div>
  `;

  aiOutput.innerHTML = `
    <article class="explanation-card">
      <span class="insight-tag">Parser</span>
      <p><strong>${escapeHtml(payload.error || "Error")}</strong>: ${escapeHtml(
        payload.message || "Check Python syntax and try again."
      )}</p>
    </article>
  `;
}

function renderVisualizationError(message) {
  astWarning.textContent = "AST error";
  const astEl = document.getElementById("ast-visualization");
  if (astEl) {
    astEl.innerHTML = `
    <div class="ast-empty-state ast-error-state">
      <strong>Unable to build AST</strong>
      <p>${escapeHtml(message || "Visualization error.")}</p>
    </div>
  `;
  }
}

async function runAnalyze() {
  const code = editor ? editor.getValue() : DEFAULT_CODE;

  analyzeBtn.disabled = true;
  analysisState.textContent = "Analyzing…";
  astWarning.textContent = "…";

  let payload = null;

  try {
    const raw = await window.CodeAnalyzerApi.analyze(code);
    console.log("[dashboard] analyze() raw payload", raw);

    payload = normalizeAnalyzePayload(raw);
    console.log("[dashboard] normalized payload", payload);

    if (!payload.success) {
      renderAnalysisError(payload);
      return;
    }

    logDashboard("AST data (root type)", payload.ast && payload.ast.type);
    console.log("[dashboard] AST data", payload.ast);

    try {
      updateMetrics(payload.metrics);
    } catch (metricsErr) {
      console.error("[dashboard] metrics UI error", metricsErr);
      renderAnalysisError({
        error: "MetricsRenderError",
        message: metricsErr && metricsErr.message ? metricsErr.message : "Failed to render metric cards.",
        line: null,
      });
      return;
    }

    try {
      updateExplanations(payload.explanations);
    } catch (exErr) {
      console.error("[dashboard] explanations UI error", exErr);
    }

    try {
      if (typeof window.renderAST !== "function") {
        throw new Error("renderAST is not defined (check astVisualizer.js load order).");
      }
      window.renderAST(payload.ast, "ast-visualization", {
        onNodeSelect: (nodeData) => {
          if (nodeData && nodeData.line) {
            highlightEditorLine(nodeData.line);
          }
        },
      });
    } catch (vizErr) {
      console.error("[dashboard] visualization error", vizErr);
      renderVisualizationError(
        vizErr && vizErr.message ? vizErr.message : "AST tree could not be drawn."
      );
    }

    analysisState.textContent = "Ready";
    astWarning.textContent = `${payload.node_count ?? "?"} nodes`;
    if (payload.warnings && payload.warnings.length) {
      astWarning.textContent += " · limited depth";
    }
  } catch (err) {
    console.error("[dashboard] unexpected error after successful fetch", err);
    if (payload && payload.success) {
      renderVisualizationError(err && err.message ? err.message : "Unexpected error.");
      analysisState.textContent = "Partial";
      astWarning.textContent = "Check console";
    } else {
      renderAnalysisError({
        error: "ClientError",
        message: err && err.message ? err.message : "Something went wrong in the browser.",
        line: null,
      });
    }
  } finally {
    analyzeBtn.disabled = false;
  }
}

function debouncedAnalyze() {
  window.clearTimeout(analyzeTimer);
  analyzeTimer = window.setTimeout(runAnalyze, 500);
}

function loadUploadedFile(file) {
  if (!file.name.toLowerCase().endsWith(".py")) {
    fileStatus.textContent = "Only .py files";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const source = String(reader.result || "");
    if (editor) {
      editor.setValue(source);
    }
    fileStatus.textContent = file.name;
  };

  reader.onerror = () => {
    fileStatus.textContent = "Could not read file";
  };

  reader.readAsText(file);
}

uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (file) {
    loadUploadedFile(file);
  }
});

analyzeBtn.addEventListener("click", debouncedAnalyze);
themeToggle.addEventListener("click", toggleTheme);

const astZoomInBtn = document.getElementById("ast-zoom-in");
const astZoomOutBtn = document.getElementById("ast-zoom-out");
const astZoomResetBtn = document.getElementById("ast-zoom-reset");

if (astZoomInBtn) {
  astZoomInBtn.addEventListener("click", () => {
    if (typeof window.astZoomIn === "function") window.astZoomIn();
  });
}

if (astZoomOutBtn) {
  astZoomOutBtn.addEventListener("click", () => {
    if (typeof window.astZoomOut === "function") window.astZoomOut();
  });
}

if (astZoomResetBtn) {
  astZoomResetBtn.addEventListener("click", () => {
    if (typeof window.astResetZoom === "function") window.astResetZoom();
  });
}

applyTheme(getSavedTheme());
initializeMonaco();
