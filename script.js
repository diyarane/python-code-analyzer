// Simple frontend logic for the static analyzer UI

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("status");
const analyzeBtn = document.getElementById("analyze-btn");
const loadingEl = document.getElementById("loading");
const reportEl = document.getElementById("report");

// Keep track of the currently selected file in memory
let selectedFile = null;

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
    analyzeBtn.disabled = true;
    return;
  }

  selectedFile = file;
  analyzeBtn.disabled = false;
  setStatus(`Ready to analyze: ${file.name}`, false);
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

analyzeBtn.addEventListener("click", () => {
  if (!selectedFile) {
    setStatus("Please select a Python file first.", true);
    return;
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