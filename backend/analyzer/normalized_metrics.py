"""
Normalized Metric Status Model for CodeAnalyzer AI.

Ensures every analysis metric explicitly communicates its state:
- "available": Explicitly measured and verified (e.g. Python dead code signals)
- "estimated": Calculated via AST structure heuristics (e.g. Big O complexity)
- "unavailable": Applicable metric temporarily unavailable
- "unsupported": Metric not implemented for this language (e.g. JS/TS dead code)
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Dict, Optional


class MetricStatus(str, Enum):
    AVAILABLE = "available"
    ESTIMATED = "estimated"
    UNAVAILABLE = "unavailable"
    UNSUPPORTED = "unsupported"


@dataclass
class MetricItem:
    value: Any
    status: MetricStatus
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": self.value,
            "status": self.status.value,
            "reason": self.reason,
        }


def build_metric_status_map(
    time_complexity: str,
    space_complexity: str,
    dead_code_count: Optional[int],
    optimization_score: int,
    dead_code_supported: bool = True,
    language_display: str = "Python",
) -> Dict[str, Dict[str, Any]]:
    """Build normalized metric_status dictionary."""
    time_item = MetricItem(
        value=time_complexity,
        status=MetricStatus.ESTIMATED,
        reason="Calculated from maximum loop nesting depth.",
    )
    space_item = MetricItem(
        value=space_complexity,
        status=MetricStatus.ESTIMATED,
        reason="Calculated from loop depth and memory allocation patterns.",
    )
    opt_item = MetricItem(
        value=optimization_score,
        status=MetricStatus.ESTIMATED,
        reason="Evaluated against control flow nesting guidelines.",
    )

    if dead_code_supported and dead_code_count is not None:
        dead_item = MetricItem(
            value=dead_code_count,
            status=MetricStatus.AVAILABLE,
            reason=f"Measured {dead_code_count} unreachable statement signals in {language_display}.",
        )
    else:
        dead_item = MetricItem(
            value=None,
            status=MetricStatus.UNSUPPORTED,
            reason=f"Dead-code control flow analysis is unsupported for {language_display}.",
        )

    return {
        "time_complexity": time_item.to_dict(),
        "space_complexity": space_item.to_dict(),
        "dead_code_count": dead_item.to_dict(),
        "optimization_score": opt_item.to_dict(),
    }
