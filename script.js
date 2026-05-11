// Simple frontend logic for the static analyzer UI

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("status");
const analyzeBtn = document.getElementById("analyze-btn");
const loadingEl = document.getElementById("loading");
const reportEl = document.getElementById("report");
const analysisSectionsEl = document.getElementById("analysis-sections");

// Keep track of the currently selected file in memory
let selectedFile = null;
let selectedSourceLines = [];

/**
 * Helper: show a status message (success or error).
 */
function setStatus(message, isError = false) {
  statusEl.textContent = message || "";
  statusEl.classList.toggle("status--error", !!isError);
  statusEl.classList.toggle("status--success", !isError && !!message);
}

/**
 * Helper: validate that a file is a non-empty .py file.
 */
function validatePythonFile(file) {
  if (!file) {
    setStatus("No file selected.", true);
    return false;
  }

  if (!file.name.toLowerCase().endsWith(".py")) {
    setStatus("Only .py files are accepted.", true);
    return false;
  }

  if (file.size === 0) {
    setStatus("Uploaded file is empty.", true);
    return false;
  }

  return true;
}

/**
 * When a file is chosen (via click or drop), store it and enable the button.
 */
function handleFileSelected(file) {
  if (!validatePythonFile(file)) {
    selectedFile = null;
    selectedSourceLines = [];
    analyzeBtn.disabled = true;
    return;
  }

  selectedFile = file;
  selectedSourceLines = [];
  analyzeBtn.disabled = false;
  setStatus(`Ready to analyze: ${file.name}`, false);
}

/**
 * Helper: get a source-code line from the selected file, if available.
 */
function getCodeSnippet(lineNumber) {
  if (!lineNumber || !selectedSourceLines.length) {
    return "Snippet not available";
  }

  return selectedSourceLines[lineNumber - 1] || "Snippet not available";
}

/**
 * Helper: get multiple source lines for duplicate blocks, if available.
 */
function getCodeSnippetRange(startLine, endLine) {
  if (!startLine || !endLine || !selectedSourceLines.length) {
    return getCodeSnippet(startLine);
  }

  return selectedSourceLines
    .slice(startLine - 1, endLine)
    .join("\n") || "Snippet not available";
}

/**
 * Convert different backend finding shapes into one UI-friendly shape.
 */
function normalizeFinding(finding, fallbackDescription) {
  if (typeof finding === "string") {
    return {
      line: null,
      snippet: "Snippet not available",
      description: finding || fallbackDescription,
    };
  }

  const line =
    finding.line ||
    finding.line_number ||
    finding.start_line ||
    finding.duplicate_start ||
    null;

  const endLine = finding.end_line || finding.duplicate_end || null;
  const snippet =
    finding.snippet ||
    finding.code ||
    (endLine ? getCodeSnippetRange(line, endLine) : getCodeSnippet(line));
  const description =
    finding.description ||
    finding.reason ||
    finding.message ||
    fallbackDescription;

  return {
    line,
    endLine,
    snippet,
    description,
  };
}

/**
 * Convert an object like {name: lineNumber} into finding objects.
 */
function findingsFromMap(mapValue, label) {
  if (!mapValue || Array.isArray(mapValue) || typeof mapValue !== "object") {
    return [];
  }

  return Object.entries(mapValue).map(([name, line]) =>
    normalizeFinding(
      {
        line: typeof line === "number" ? line : null,
        description: `${label}: ${name}`,
      },
      `${label}: ${name}`
    )
  );
}

/**
 * Convert arrays or maps returned by the backend into normalized findings.
 */
function findingsFromValue(value, label) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      normalizeFinding(
        typeof item === "object" && item !== null
          ? { ...item, description: item.description || item.name || label }
          : `${label}: ${item}`,
        label
      )
    );
  }

  if (typeof value === "object") {
    return findingsFromMap(value, label);
  }

  return [normalizeFinding(`${label}: ${value}`, label)];
}

/**
 * Build unused-code findings from common structured backend keys.
 */
function collectStructuredUnusedFindings(data) {
  const deadCode = data.dead_code || {};
  const unused = data.unused_code || data.unused || deadCode.unused || deadCode || {};
  return [
    ...findingsFromValue(unused.imports || data.unused_imports, "Unused import"),
    ...findingsFromValue(unused.variables || data.unused_variables, "Unused variable"),
    ...findingsFromValue(unused.functions || data.unused_functions, "Unused function"),
    ...findingsFromValue(unused.classes || data.unused_classes, "Unused class"),
    ...findingsFromValue(
      unused.parameters || unused.method_parameters || data.unused_method_parameters,
      "Unused method parameter"
    ),
  ];
}

/**
 * Fallback parser for the current plain-text report format.
 */
function collectFindingsFromReport(reportText) {
  const findings = {
    unused: [],
    unreachable: [],
    redundant: [],
    duplicates: [],
  };

  let currentGroup = null;

  reportText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (/^Unused Functions/.test(trimmed)) currentGroup = "Unused function";
    else if (/^Unused Variables/.test(trimmed)) currentGroup = "Unused variable";
    else if (/^Unused Imports/.test(trimmed)) currentGroup = "Unused import";
    else if (/^Unused Classes/.test(trimmed)) currentGroup = "Unused class";
    else if (/^Unused Method Parameters/.test(trimmed)) {
      currentGroup = "Unused method parameter";
    } else if (/^Unreachable Code/.test(trimmed)) currentGroup = "unreachable";
    else if (/^Redundant Conditional Branches/.test(trimmed)) {
      currentGroup = "redundant";
    } else if (/^Duplicated Code Blocks/.test(trimmed)) {
      currentGroup = "duplicates";
    } else if (/^\d+\./.test(trimmed) || /^=+|-+$/.test(trimmed)) {
      currentGroup = null;
    }

    if (!trimmed.startsWith("- ")) {
      return;
    }

    if (currentGroup && currentGroup.startsWith("Unused")) {
      const match = trimmed.match(/^- (.+?)(?: \(line (\d+)\))?$/);
      if (match) {
        const lineNumber = match[2] ? Number(match[2]) : null;
        findings.unused.push(
          normalizeFinding(
            {
              line: lineNumber,
              description: `${currentGroup}: ${match[1]}`,
            },
            `${currentGroup}: ${match[1]}`
          )
        );
      }
    } else if (currentGroup === "unreachable") {
      const match = trimmed.match(/^- line (\d+) \((.+)\)$/);
      if (match) {
        findings.unreachable.push(
          normalizeFinding(
            {
              line: Number(match[1]),
              description: match[2],
            },
            "Unreachable code"
          )
        );
      }
    } else if (currentGroup === "redundant") {
      const match = trimmed.match(/^- line (\d+) \((.+)\)$/);
      if (match) {
        findings.redundant.push(
          normalizeFinding(
            {
              line: Number(match[1]),
              description: match[2],
            },
            "Redundant conditional branch"
          )
        );
      }
    } else if (currentGroup === "duplicates") {
      const match = trimmed.match(
        /^- lines (\d+)-(\d+) duplicate lines (\d+)-(\d+)$/
      );
      if (match) {
        findings.duplicates.push(
          normalizeFinding(
            {
              line: Number(match[1]),
              endLine: Number(match[2]),
              description: `Duplicates lines ${match[3]}-${match[4]}`,
            },
            "Duplicated code block"
          )
        );
      }
    }
  });

  return findings;
}

/**
 * Prefer structured backend fields, then fall back to parsing the text report.
 */
function buildFindings(data, reportText) {
  const issues = data.issue_data || data.issues || {};
  const structured = {
    unused: collectStructuredUnusedFindings(data),
    unreachable: findingsFromValue(
      data.unreachable_code || data.unreachable || issues.unreachable_code,
      "Unreachable code"
    ),
    redundant: findingsFromValue(
      data.redundant_conditionals ||
        data.redundant_branches ||
        issues.redundant_conditionals,
      "Redundant conditional branch"
    ),
    duplicates: findingsFromValue(
      data.duplicate_blocks || data.duplicates || issues.duplicate_blocks,
      "Duplicated code block"
    ),
  };

  const hasStructuredFindings = Object.values(structured).some(
    (items) => items.length > 0
  );

  return hasStructuredFindings ? structured : collectFindingsFromReport(reportText);
}

/**
 * Render one collapsible section with title, count badge, and findings.
 */
function renderFindingSection({ key, title, colorClass, findings }) {
  const section = document.createElement("details");
  section.className = `analysis-section analysis-section--${colorClass}`;
  section.open = findings.length > 0;

  const summary = document.createElement("summary");
  const titleEl = document.createElement("span");
  titleEl.className = "section-title";
  titleEl.textContent = title;

  const badge = document.createElement("span");
  badge.className = "count-badge";
  badge.textContent = String(findings.length);

  summary.append(titleEl, badge);
  section.appendChild(summary);

  const list = document.createElement("div");
  list.className = "findings-list";

  if (findings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-finding";
    empty.textContent = "✓ No issues found";
    list.appendChild(empty);
  } else {
    findings.forEach((finding) => {
      const item = document.createElement("article");
      item.className = "finding-item";

      const meta = document.createElement("div");
      meta.className = "finding-meta";
      if (finding.line && finding.endLine && finding.endLine !== finding.line) {
        meta.textContent = `Lines ${finding.line}-${finding.endLine}`;
      } else if (finding.line) {
        meta.textContent = `Line ${finding.line}`;
      } else {
        meta.textContent = "Line not available";
      }

      const description = document.createElement("div");
      description.className = "finding-description";
      description.textContent = finding.description;

      const snippet = document.createElement("code");
      snippet.className = "finding-snippet";
      snippet.textContent = finding.snippet || "Snippet not available";

      item.append(meta, description, snippet);
      list.appendChild(item);
    });
  }

  section.appendChild(list);
  section.dataset.category = key;
  return section;
}

/**
 * Render the four requested analysis categories above the raw text report.
 */
function renderAnalysisSections(data, reportText) {
  const findings = buildFindings(data || {}, reportText || "");
  const sections = [
    {
      key: "unused",
      title: "Unused Code",
      colorClass: "unused",
      findings: findings.unused,
    },
    {
      key: "unreachable",
      title: "Unreachable Code",
      colorClass: "unreachable",
      findings: findings.unreachable,
    },
    {
      key: "redundant",
      title: "Redundant Conditional Branches",
      colorClass: "redundant",
      findings: findings.redundant,
    },
    {
      key: "duplicates",
      title: "Duplicate Code Blocks",
      colorClass: "duplicates",
      findings: findings.duplicates,
    },
  ];

  analysisSectionsEl.replaceChildren(
    ...sections.map((section) => renderFindingSection(section))
  );
  analysisSectionsEl.classList.remove("hidden");
}

/* ---- Drag & Drop Events ---- */

// Prevent default browser behavior for drag/drop on document
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );
});

// Highlight drop zone on dragenter/dragover
["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.add("drag-over");
    },
    false
  );
});

// Remove highlight on dragleave/drop
["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.remove("drag-over");
    },
    false
  );
});

// Handle dropped files
dropZone.addEventListener(
  "drop",
  (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files[0]) {
      handleFileSelected(files[0]);
    }
  },
  false
);

/* ---- Click-to-upload fallback ---- */

// Clicking anywhere on the drop zone triggers the hidden file input
dropZone.addEventListener("click", () => {
  fileInput.click();
});

// Handle file selection via the file input
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    handleFileSelected(file);
  }
});

/* ---- Analyze button ---- */

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    setStatus("Please select a Python file first.", true);
    return;
  }

  try {
    const sourceText = await selectedFile.text();
    selectedSourceLines = sourceText.split(/\r?\n/);
  } catch {
    selectedSourceLines = [];
  }

  // Prepare multipart/form-data body
  const formData = new FormData();
  // Backend expects field name "file"
  formData.append("file", selectedFile, selectedFile.name);

  // UI state: show loading, disable button, clear old report
  loadingEl.classList.remove("hidden");
  analyzeBtn.disabled = true;
  setStatus("Uploading and analyzing…", false);
  reportEl.textContent = "";
  analysisSectionsEl.classList.add("hidden");
  analysisSectionsEl.replaceChildren();

  // POST to API-only backend (no homepage). Backend enables CORS for cross-origin requests.
  fetch("http://127.0.0.1:5000/analyze", {
    method: "POST",
    body: formData,
  })
    .then(async (response) => {
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Try to show backend-provided error details if any
        const msg =
          (data && data.error) ||
          `Backend error (status ${response.status}).`;
        setStatus(msg, true);
        if (data && data.details) {
          reportEl.textContent = `Error details:\n${data.details}`;
        } else {
          reportEl.textContent = "No report due to error.";
        }
        return;
      }

      // Success: show report returned by backend
      const reportText = data && data.report ? data.report : "(No report text)";
      reportEl.textContent = reportText;
      renderAnalysisSections(data || {}, reportText);
      setStatus("Analysis completed successfully.", false);
    })
    .catch((err) => {
      // Network or other unexpected error
      setStatus("Failed to contact backend: " + err.message, true);
      reportEl.textContent = "No report due to network error.";
    })
    .finally(() => {
      // Restore UI state
      loadingEl.classList.add("hidden");
      // Re-enable button if we still have a valid file selected
      analyzeBtn.disabled = !selectedFile;
    });
});