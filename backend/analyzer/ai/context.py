"""
Context data structures for CodeAnalyzer AI Explanation Service.
Encapsulates all static analysis results, source code, metrics, and rule-based fallbacks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AIExplanationContext:
    source_code: str
    language: str = "python"
    time_complexity: str = "O(1)"
    space_complexity: str = "O(1)"
    optimization_score: int = 100
    dead_code_count: Optional[int] = None
    dead_code_findings: List[Dict[str, Any]] = field(default_factory=list)
    other_findings: List[Dict[str, Any]] = field(default_factory=list)
    fallback_explanation: Optional[Dict[str, str]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AIExplanationContext:
        """Construct AIExplanationContext safely from an API payload dictionary."""
        source_code = data.get("code") or data.get("source_code") or ""
        language = data.get("language") or "python"

        metrics = data.get("metrics") or {}
        time_c = metrics.get("time_complexity") or data.get("time_complexity") or "O(1)"
        space_c = metrics.get("space_complexity") or data.get("space_complexity") or "O(1)"
        opt_score = metrics.get("optimization_score") if metrics.get("optimization_score") is not None else data.get("optimization_score", 100)
        dead_code = metrics.get("dead_code_count") if metrics.get("dead_code_count") is not None else data.get("dead_code_count")

        dead_code_res = data.get("dead_code_result") or metrics.get("dead_code_result") or {}
        findings = dead_code_res.get("findings") or data.get("dead_code_findings") or []

        fallback = data.get("explanations") or data.get("fallback_explanation") or None

        return cls(
            source_code=source_code,
            language=str(language),
            time_complexity=str(time_c),
            space_complexity=str(space_c),
            optimization_score=int(opt_score) if isinstance(opt_score, (int, float)) else 100,
            dead_code_count=int(dead_code) if dead_code is not None and isinstance(dead_code, (int, float)) else None,
            dead_code_findings=list(findings) if isinstance(findings, list) else [],
            other_findings=data.get("other_findings") or [],
            fallback_explanation=fallback if isinstance(fallback, dict) else None,
            metadata=data.get("metadata") or {},
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize context to dictionary representation."""
        return {
            "language": self.language,
            "time_complexity": self.time_complexity,
            "space_complexity": self.space_complexity,
            "optimization_score": self.optimization_score,
            "dead_code_count": self.dead_code_count,
            "dead_code_findings": self.dead_code_findings,
            "other_findings": self.other_findings,
            "has_fallback": self.fallback_explanation is not None,
        }
