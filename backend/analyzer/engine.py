"""
Language-independent static analysis engine.
Calculates control-flow metrics across normalized AST representations.
"""

from __future__ import annotations

from typing import Any, Dict
from .normalized_metrics import build_metric_status_map
from .utils import big_o_from_loop_depth


class LanguageIndependentEngine:
    """Generic analyzer calculating metrics across normalized control flow structures."""

    def compute_control_flow_metrics(
        self,
        max_loop_depth: int,
        max_condition_depth: int,
        dead_code_count: int | None = None,
        dead_code_supported: bool = True,
        language_display: str = "Code",
    ) -> Dict[str, Any]:
        time_complexity = big_o_from_loop_depth(max_loop_depth)
        space_complexity = "O(1)" if max_loop_depth == 0 else "O(n)"

        score = 100
        if max_loop_depth > 1:
            score -= (max_loop_depth - 1) * 20
        if max_condition_depth > 3:
            score -= 10

        optimization_score = max(0, min(100, score))

        metric_status = build_metric_status_map(
            time_complexity=time_complexity,
            space_complexity=space_complexity,
            dead_code_count=dead_code_count if dead_code_supported else None,
            optimization_score=optimization_score,
            dead_code_supported=dead_code_supported,
            language_display=language_display,
        )

        return {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "dead_code_count": dead_code_count if dead_code_supported else None,
            "optimization_score": optimization_score,
            "max_loop_depth": max_loop_depth,
            "max_condition_depth": max_condition_depth,
            "metric_status": metric_status,
        }


# Singleton engine instance
engine = LanguageIndependentEngine()
