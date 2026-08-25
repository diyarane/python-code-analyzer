/**
 * Centralized API calls for the Flask dashboard.
 */

const DEBUG_ANALYZE = true;

function logAnalyze(...args) {
  if (DEBUG_ANALYZE) {
    console.log("[CodeAnalyzerApi]", ...args);
  }
}

window.CodeAnalyzerApi = {
  /**
   * POST /analyze — returns AST JSON, metrics, and explanations.
   * Separates real network failures from HTTP / parse errors.
   * @param {string} code
   * @returns {Promise<object>}
   */
  async analyze(code) {
    let response;
    try {
      response = await fetch("/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
    } catch (err) {
      logAnalyze("fetch failed (network)", err);
      return {
        success: false,
        error: "NetworkError",
        message: err && err.message ? err.message : "Could not complete the request.",
        line: null,
        _cause: "network",
      };
    }

    logAnalyze("fetch response", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });
    console.log("[CodeAnalyzerApi] raw Response object", response);

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      logAnalyze("JSON parse error", parseErr, "body preview", text.slice(0, 200));
      data = {
        success: false,
        error: "InvalidResponse",
        message: "Server returned non-JSON (check Content-Type and proxy).",
        line: null,
        _cause: "parse",
      };
    }

    console.log("[CodeAnalyzerApi] parsed JSON", data);

    if (!response.ok && data.success !== false) {
      return {
        success: false,
        error: data.error || "HttpError",
        message: data.message || response.statusText || `HTTP ${response.status}`,
        line: data.line ?? null,
        _cause: "http",
        _status: response.status,
      };
    }

    return data;
  },
};
