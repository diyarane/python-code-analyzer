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
let activeDecorations = [];
let analyzeTimer = null;

const astVisualizer = new window.AstVisualizer("ast-visualization", {
  onNodeClick: (node) => highlightEditorLine(node.line),
});

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

function highlightEditorLine(line) {
  if (!editor || !window.monaco || !line) {
    return;
  }

  activeDecorations = editor.deltaDecorations(activeDecorations, [
    {
      range: new window.monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "monaco-highlight-line",
        glyphMarginClassName: "monaco-highlight-glyph",
      },
    },
  ]);

  editor.revealLineInCenter(line);
}

function renderMetricCards(metrics) {
  const score = metrics.optimization_score;

  metricsGrid.innerHTML = `
    <article class="metric-card">
      <span class="metric-label">Time Complexity</span>
      <strong class="metric-value">${metrics.time_complexity}</strong>
      <p class="metric-copy">Estimated from maximum loop nesting depth.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Space Complexity</span>
      <strong class="metric-value">${metrics.space_complexity}</strong>
      <p class="metric-copy">Estimated from data structures and recursion patterns.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Dead Code</span>
      <strong class="metric-value">${metrics.dead_code_count}</strong>
      <p class="metric-copy">Unused functions plus unreachable statements.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Optimization Score</span>
      <strong class="metric-value">${score}/100</strong>
      <div class="progress-track" aria-label="Optimization score ${score} out of 100">
        <div class="progress-fill" style="width: ${score}%"></div>
      </div>
      <p class="metric-copy">Penalizes nested loops, inefficient recursion, and deep conditions.</p>
    </article>
  `;
}

function renderAiExplanation(metrics, warnings = []) {
  const complexityNote =
    metrics.max_loop_depth > 1
      ? `This code contains nested loops, producing ${metrics.time_complexity} time complexity. Consider replacing repeated scans with a dictionary or set when the loop is performing lookups.`
      : `This code has low loop nesting, so the estimated time complexity is ${metrics.time_complexity}.`;

  const recursionNote = metrics.has_inefficient_recursion
    ? " A Fibonacci-style recursive pattern was detected, which may grow exponentially without memoization."
    : "";

  const warningHtml = warnings.length
    ? `<p class="warning-note">${warnings.join("<br>")}</p>`
    : "";

  aiOutput.innerHTML = `
    <article class="explanation-card">
      <span class="insight-tag">AI Insight</span>
      <p><strong>${complexityNote}</strong>${recursionNote}</p>
      <p>
        The AST tree highlights expensive nodes in red, moderate nodes in yellow,
        and lightweight structural nodes in green.
      </p>
      ${warningHtml}
    </article>
  `;
}

function renderError(error) {
  analysisState.textContent = "Syntax error";
  astWarning.textContent = error.line ? `Line ${error.line}` : "Error";

  metricsGrid.innerHTML = `
    <article class="metric-card placeholder-card">
      <span class="metric-label">${error.error || "Analysis Error"}</span>
      <strong class="metric-value">Failed</strong>
      <p class="metric-copy">${error.message || "Unable to analyze this code."}</p>
    </article>
  `;

  document.getElementById("ast-visualization").innerHTML = `
    <div class="ast-empty-state ast-error-state">
      ${error.message || "Unable to render AST."}
    </div>
  `;

  aiOutput.innerHTML = `
    <article class="explanation-card">
      <span class="insight-tag">Parser Feedback</span>
      <p><strong>${error.error || "Error"}</strong>: ${error.message || "Check the Python syntax and try again."}</p>
    </article>
  `;

  if (error.line) {
    highlightEditorLine(error.line);
  }
}

async function runAstAnalysis() {
  const code = editor ? editor.getValue() : DEFAULT_CODE;

  analyzeBtn.disabled = true;
  analysisState.textContent = "Parsing AST";
  astWarning.textContent = "Analyzing";

  try {
    const result = await window.AstApi.analyzeAst(code);

    if (!result.success) {
      renderError(result);
      return;
    }

    renderMetricCards(result.metrics);
    renderAiExplanation(result.metrics, result.warnings || []);
    astVisualizer.render(result.ast);

    analysisState.textContent = "AST ready";
    astWarning.textContent = `${result.node_count} nodes`;
  } catch (error) {
    renderError({
      error: "NetworkError",
      message: "Could not reach the Flask AST analysis endpoint.",
      line: null,
    });
  } finally {
    analyzeBtn.disabled = false;
  }
}

function debouncedAnalyze() {
  window.clearTimeout(analyzeTimer);
  analyzeTimer = window.setTimeout(runAstAnalysis, 500);
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

applyTheme(getSavedTheme());
initializeMonaco();

