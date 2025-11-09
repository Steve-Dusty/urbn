"""
Agentic Thoughts Stream Agent
Captures and streams live reasoning, decisions, and observations from active agents
Displays in bottom modal: "Agentic Thoughts Stream"
"""

import asyncio
from typing import Dict, Any, List, Generator
from datetime import datetime
from enum import Enum


class AgentType(Enum):
    """Types of agents that can emit thoughts"""
    POLICY_ANALYSIS = "PolicyAnalysisAgent"
    CITY_DATA = "CityDataAgent"
    SIMULATION = "SimulationAgent"
    MAP = "MapAgent"
    MAPBOX_AGENT = "MapboxAgent"
    CHAT = "ChatAgent"
    PARSER = "ParserAgent"
    DEBATE = "DebateAgent"
    AGGREGATOR = "AggregatorAgent"
    CONSULTING = "ConsultingAgent"


class ThoughtType(Enum):
    """Types of thoughts/messages"""
    REASONING = "reasoning"      # Agent's internal logic
    DECISION = "decision"        # Decision made
    OBSERVATION = "observation"  # Data observed
    ACTION = "action"           # Action taken
    ERROR = "error"             # Error encountered
    PROGRESS = "progress"       # Progress update


class ThoughtsStreamManager:
    """
    Central manager for all agent thoughts
    Collects thoughts from all agents and streams them to frontend
    """

    def __init__(self):
        self.thoughts: List[Dict[str, Any]] = []
        self.max_thoughts = 100  # Keep last 100 thoughts
        self.subscribers = []

    def emit_thought(
        self,
        agent_type: AgentType,
        thought_type: ThoughtType,
        message: str,
        metadata: Dict[str, Any] = None
    ):
        """
        Emit a thought from an agent

        Args:
            agent_type: Which agent is emitting
            thought_type: Type of thought
            message: The actual thought message
            metadata: Additional context
        """
        thought = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent": agent_type.value,
            "type": thought_type.value,
            "message": message,
            "metadata": metadata or {}
        }

        self.thoughts.append(thought)

        # Keep only last N thoughts
        if len(self.thoughts) > self.max_thoughts:
            self.thoughts = self.thoughts[-self.max_thoughts:]

        # Notify subscribers (for SSE streaming)
        for subscriber in self.subscribers:
            subscriber(thought)

        return thought

    def get_recent_thoughts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get the most recent thoughts"""
        return self.thoughts[-limit:]

    def get_thoughts_by_agent(self, agent_type: AgentType, limit: int = 20) -> List[Dict[str, Any]]:
        """Get thoughts from a specific agent"""
        agent_thoughts = [t for t in self.thoughts if t["agent"] == agent_type.value]
        return agent_thoughts[-limit:]

    def clear_thoughts(self):
        """Clear all thoughts"""
        self.thoughts = []

    def subscribe(self, callback):
        """Subscribe to thought stream"""
        self.subscribers.append(callback)

    def unsubscribe(self, callback):
        """Unsubscribe from thought stream"""
        if callback in self.subscribers:
            self.subscribers.remove(callback)


# Global instance
_thoughts_stream = ThoughtsStreamManager()


def get_thoughts_stream() -> ThoughtsStreamManager:
    """Get the global thoughts stream manager"""
    return _thoughts_stream


def emit_thought(
    agent_type: AgentType,
    thought_type: ThoughtType,
    message: str,
    metadata: Dict[str, Any] = None
):
    """
    Convenience function to emit a thought

    Example usage:
        emit_thought(
            AgentType.CITY_DATA,
            ThoughtType.OBSERVATION,
            "Fetching population data for San Diego...",
            {"city": "San Diego", "metric": "population"}
        )
    """
    return _thoughts_stream.emit_thought(agent_type, thought_type, message, metadata)


def stream_thoughts_generator(follow: bool = False) -> Generator[Dict[str, Any], None, None]:
    """
    Generator that yields thoughts as they arrive

    Args:
        follow: If True, keeps connection open and streams new thoughts

    Yields:
        Thought dictionaries
    """
    # First, yield all existing thoughts
    for thought in _thoughts_stream.get_recent_thoughts():
        yield thought

    if follow:
        # TODO: Implement real-time streaming with asyncio
        # For now, just return existing thoughts
        pass


# Example thought patterns for different agents
class ThoughtPatterns:
    """Pre-defined thought patterns for different agent types"""

    @staticmethod
    def city_data_searching(city: str, metric: str):
        emit_thought(
            AgentType.CITY_DATA,
            ThoughtType.ACTION,
            f"Searching web for {metric} data in {city}...",
            {"city": city, "metric": metric}
        )

    @staticmethod
    def city_data_found(city: str, metric: str, value: Any):
        emit_thought(
            AgentType.CITY_DATA,
            ThoughtType.OBSERVATION,
            f"Found {metric}: {value}",
            {"city": city, "metric": metric, "value": value}
        )

    @staticmethod
    def policy_analyzing(document_name: str):
        emit_thought(
            AgentType.POLICY_ANALYSIS,
            ThoughtType.ACTION,
            f"Analyzing policy document: {document_name}",
            {"document": document_name}
        )

    @staticmethod
    def policy_intent_extracted(intent: str):
        emit_thought(
            AgentType.POLICY_ANALYSIS,
            ThoughtType.DECISION,
            f"Policy intent identified: {intent}",
            {"intent": intent}
        )

    @staticmethod
    def simulation_starting(parameters: Dict[str, Any]):
        emit_thought(
            AgentType.SIMULATION,
            ThoughtType.ACTION,
            f"Starting simulation with parameters: {parameters}",
            {"parameters": parameters}
        )

    @staticmethod
    def simulation_progress(stage: str, progress: float):
        emit_thought(
            AgentType.SIMULATION,
            ThoughtType.PROGRESS,
            f"Simulation stage '{stage}': {progress:.0%} complete",
            {"stage": stage, "progress": progress}
        )

    @staticmethod
    def map_updating(feature: str):
        emit_thought(
            AgentType.MAP,
            ThoughtType.ACTION,
            f"Updating map: {feature}",
            {"feature": feature}
        )

    @staticmethod
    def debate_argument(position: str, argument: str):
        emit_thought(
            AgentType.DEBATE,
            ThoughtType.REASONING,
            f"{position}: {argument}",
            {"position": position, "argument": argument}
        )

    @staticmethod
    def aggregator_synthesizing(num_sources: int):
        emit_thought(
            AgentType.AGGREGATOR,
            ThoughtType.ACTION,
            f"Synthesizing insights from {num_sources} sources...",
            {"num_sources": num_sources}
        )

    @staticmethod
    def consulting_recommendation(recommendation: str):
        emit_thought(
            AgentType.CONSULTING,
            ThoughtType.DECISION,
            f"Recommendation: {recommendation}",
            {"recommendation": recommendation}
        )

    @staticmethod
    def error_occurred(agent: AgentType, error_msg: str):
        emit_thought(
            agent,
            ThoughtType.ERROR,
            f"Error: {error_msg}",
            {"error": error_msg}
        )


# For testing
if __name__ == "__main__":
    print("Testing Thoughts Stream Agent...\n")

    # Simulate some agent thoughts
    ThoughtPatterns.policy_analyzing("urban_policy_2024.pdf")
    ThoughtPatterns.city_data_searching("San Diego", "population")
    ThoughtPatterns.city_data_found("San Diego", "population", "1,409,359")
    ThoughtPatterns.policy_intent_extracted("Increase affordable housing supply")
    ThoughtPatterns.simulation_starting({"city": "San Diego", "timeframe": "10 years"})
    ThoughtPatterns.simulation_progress("Housing Impact Analysis", 0.25)
    ThoughtPatterns.debate_argument("Pro", "Increased density reduces housing costs")
    ThoughtPatterns.debate_argument("Con", "May cause traffic congestion")
    ThoughtPatterns.aggregator_synthesizing(5)
    ThoughtPatterns.consulting_recommendation("Phased rollout over 18 months")

    # Display thoughts
    print("\n📊 Recent Thoughts:")
    print("=" * 80)
    for thought in get_thoughts_stream().get_recent_thoughts():
        timestamp = thought["timestamp"].split("T")[1][:8]
        print(f"[{timestamp}] [{thought['agent']}] {thought['message']}")

    print("\n✅ Thoughts stream test complete!")
