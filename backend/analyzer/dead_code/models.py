"""
Shared Data Models for Dead Code Analysis Framework.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class DeadCodeCategory(str, Enum):
    UNREACHABLE_STATEMENT = "unreachable-statement"
    UNREACHABLE_BRANCH = "unreachable-branch"
    UNUSED_LOCAL = "unused-local"
    UNREACHABLE_CODE = "unreachable-code"


@dataclass
class DeadCodeFinding:
    category: str
    message: str
    line: int
    column: Optional[int] = None
    end_line: Optional[int] = None
    symbol: Optional[str] = None
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "message": self.message,
            "line": self.line,
            "column": self.column,
            "end_line": self.end_line or self.line,
            "symbol": self.symbol,
            "reason": self.reason or self.message,
        }


@dataclass
class DeadCodeCapability:
    supported: bool
    categories: List[str] = field(default_factory=list)
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "supported": self.supported,
            "categories": self.categories,
            "reason": self.reason,
        }


@dataclass
class DeadCodeResult:
    supported: bool
    count: int
    findings: List[DeadCodeFinding] = field(default_factory=list)
    capability: Optional[DeadCodeCapability] = None
    reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "supported": self.supported,
            "count": self.count,
            "findings": [f.to_dict() for f in self.findings],
            "capability": self.capability.to_dict() if self.capability else None,
            "reason": self.reason,
        }
