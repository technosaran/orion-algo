"""
Orion Algo - Autonomous Multi-Agent Trading Swarm
Base Agent Abstraction & Universal Agent Vote Contracts
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class AgentVote(BaseModel):
    """
    Standardized verdict and vote emitted by an autonomous trading agent.
    """
    agent_name: str
    signal: str = Field(..., description="BUY, SELL, or HOLD")
    conviction: float = Field(..., ge=0.0, le=1.0, description="Conviction level from 0.0 to 1.0")
    reasoning: str = Field(..., description="Plain-English explanation of the analytical conclusion")
    category: str = Field(default="Alpha", description="Functional category of agent")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom analytical outputs")


class BaseAgent(ABC):
    """
    Abstract Base Class for all 10 specialized trading agents.
    """

    def __init__(
        self,
        name: str,
        category: str = "Alpha",
        description: str = "",
        weight: float = 1.0,
        enabled: bool = True,
    ):
        self.name = name
        self.category = category
        self.description = description
        self.weight = weight
        self.enabled = enabled
        self.last_vote: Optional[AgentVote] = None

    @abstractmethod
    def analyze(self, market_data: Dict[str, Any]) -> AgentVote:
        """
        Executes isolated domain analysis on market_data and returns an AgentVote.
        """
        pass

    def get_status(self) -> Dict[str, Any]:
        """
        Returns the agent's current configuration, state, and last emitted vote.
        """
        return {
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "weight": self.weight,
            "enabled": self.enabled,
            "last_vote": self.last_vote.model_dump() if self.last_vote else None,
        }
