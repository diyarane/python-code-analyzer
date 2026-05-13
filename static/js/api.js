window.AstApi = {
  async analyzeAst(code) {
    const response = await fetch("/analyze-ast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: "InvalidResponse",
      message: "Server returned an unreadable response.",
      line: null,
    }));

    if (!response.ok) {
      return data;
    }

    return data;
  },
};

