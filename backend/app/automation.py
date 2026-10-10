"""Future automation boundary. No computer actions are enabled in stage one.

Implement tools behind this protocol, require user approval for side effects,
and store audit records before connecting them to a provider's tool calls.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ToolResult:
    success: bool
    message: str


class AutomationTool(Protocol):
    name: str
    requires_approval: bool

    async def execute(self, arguments: dict) -> ToolResult: ...
