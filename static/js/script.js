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

let editor = null;

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
    });
  });
}

function renderMetricCards() {
  metricsGrid.innerHTML = `
    <article class="metric-card">
      <span class="metric-label">Time Complexity</span>
      <strong class="metric-value">O(n<sup>2</sup>)</strong>
      <p class="metric-copy">Nested loops compare pairs of array elements.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Space Complexity</span>
      <strong class="metric-value">O(1)</strong>
      <p class="metric-copy">Only a small helper list is tracked in this mock.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Dead Code</span>
      <strong class="metric-value">2</strong>
      <p class="metric-copy">2 unused functions detected in the sample report.</p>
    </article>

    <article class="metric-card">
      <span class="metric-label">Optimization Score</span>
      <strong class="metric-value">67/100</strong>
      <div class="progress-track" aria-label="Optimization score 67 out of 100">
        <div class="progress-fill"></div>
      </div>
      <p class="metric-copy">Good baseline, but nested lookups need attention.</p>
    </article>
  `;
}

function renderAiExplanation() {
  aiOutput.innerHTML = `
    <article class="explanation-card">
      <span class="insight-tag">AI Insight</span>
      <p>
        <strong>This function has nested loops causing O(n<sup>2</sup>) complexity.</strong>
        Consider using a hash map to reduce to O(n).
      </p>
    </article>
  `;
}

function runMockAnalysis() {
  analysisState.textContent = "Analyzing";
  analysisState.classList.add("status-pill-idle");

  window.setTimeout(() => {
    renderMetricCards();
    renderAiExplanation();
    analysisState.textContent = "Mock results";
  }, 350);
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

analyzeBtn.addEventListener("click", runMockAnalysis);
themeToggle.addEventListener("click", toggleTheme);

applyTheme(getSavedTheme());
initializeMonaco();
