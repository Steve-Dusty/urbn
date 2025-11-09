"""
LangGraph-based orchestration system for URBAN policy simulation.

Architecture Flow:
1. Parser Agent: ALWAYS RUNS FIRST - extracts context from policy documents
   - Feeds context to ALL downstream agents
   - Creates structured data for location analysis

2. Simulation Agent (Main Workflow):
   - Uses parsed context to generate map visualizations
   - Streams JSON deltas for real-time map updates
   - Chat interface for human-in-the-loop interactions
   - Future: Location analysis sub-agents

3. Debate Agents: Analyze pros/cons using simulation results

4. Aggregator Agent: Compiles final reports with recommendations

Key Insight: Parser → Context → Simulation (with Chat) → Debate → Aggregator
"""

from typing import TypedDict, Annotated, Literal, Generator
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv

from .parser_agent import parse_documents
from .simple_chat_agent import chat_with_documents
from .document_manager import get_parsed_context

load_dotenv()

# Initialize LLM for supervisor
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.3
)


class AgentState(TypedDict):
    """State that gets passed between agents in the graph."""
    messages: list[str]
    action: str
    user_message: str
    session_id: str
    document_context: str
    next_agent: str
    response: str | Generator
    metadata: dict


def supervisor_agent(state: AgentState) -> AgentState:
    """
    Supervisor/Consulting Agent that determines which specialized agent to route to.

    This is the "Consulting Agent" from your architecture that determines
    the political goal and directs core agents.
    """
    print("\n" + "="*60)
    print("🎯 SUPERVISOR AGENT: Analyzing request")
    print("="*60)

    action = state.get("action", "")
    user_message = state.get("user_message", "")

    # Route based on action
    # Note: Parser always runs first to provide context
    if action == "parse":
        next_agent = "parser"
        print("📋 Routing to: PARSER AGENT (extract context for all agents)")

    elif action == "chat":
        # Chat is part of simulation workflow - needs parsed context
        next_agent = "chat"
        print("💬 Routing to: CHAT/SIMULATION AGENT (interactive simulation)")

    elif action == "scrape":
        next_agent = "scraper"
        print("🔍 Routing to: SCRAPER AGENT (raw text extraction)")

    elif action == "simulate":
        # Full simulation pipeline: parse → simulate → (optional) debate → aggregate
        next_agent = "simulation"
        print("🗺️  Routing to: SIMULATION WORKFLOW (parse → map → analyze)")

    elif action == "debate":
        next_agent = "debate"
        print("⚖️  Routing to: DEBATE AGENTS (requires simulation results)")

    elif action == "aggregate":
        next_agent = "aggregator"
        print("📊 Routing to: AGGREGATOR AGENT (final report compilation)")

    else:
        # Use LLM to determine intent if action not specified
        print("🤔 No explicit action - analyzing user intent...")

        prompt = f"""You are a policy consulting supervisor agent. Analyze this request and determine which agent to route to.

User request: {user_message}

Available agents:
- parser: Extract context from policy documents (feeds all other agents)
- chat: Interactive simulation chat (part of simulation workflow)
- scraper: Raw text extraction from documents
- simulate: Full simulation workflow (parse → map visualization → analysis)
- debate: Multi-agent debate on policy implications
- aggregator: Compile final reports and recommendations

Respond with ONLY the agent name, nothing else."""

        response = llm.invoke([HumanMessage(content=prompt)])
        next_agent = response.content.strip().lower()
        print(f"🎯 Intent analysis result: {next_agent}")

    state["next_agent"] = next_agent
    state["messages"].append(f"Supervisor: Routing to {next_agent} agent")

    print(f"✓ Routing decision: {next_agent.upper()}")
    print("="*60 + "\n")

    return state


def parser_agent_node(state: AgentState) -> AgentState:
    """Parser agent node - extracts structured information from documents."""
    print("\n" + "="*60)
    print("📋 PARSER AGENT: Processing documents")
    print("="*60 + "\n")

    result = parse_documents()

    state["response"] = {
        "status": "success",
        "message": "Documents parsed successfully",
        "parsed_content": result
    }
    state["messages"].append("Parser: Documents processed")
    state["next_agent"] = "end"

    print("\n✓ Parser agent completed")
    print("="*60 + "\n")

    return state


def chat_agent_node(state: AgentState) -> AgentState:
    """Chat agent node - conversational interface with document context."""
    print("\n" + "="*60)
    print("💬 CHAT AGENT: Starting conversation")
    print("="*60 + "\n")

    user_message = state.get("user_message", "")
    session_id = state.get("session_id", "default")

    # Get parsed context from document manager
    doc_context = get_parsed_context()
    state["document_context"] = doc_context[:500] + "..." if len(doc_context) > 500 else doc_context

    # Return streaming generator
    state["response"] = chat_with_documents(user_message, session_id)
    state["messages"].append(f"Chat: Processing message - {user_message[:50]}...")
    state["next_agent"] = "end"

    print("✓ Chat agent initialized - streaming response")
    print("="*60 + "\n")

    return state


def scraper_agent_node(state: AgentState) -> AgentState:
    """Scraper agent node - uploads documents to Gemini."""
    print("\n" + "="*60)
    print("🔍 SCRAPER AGENT: Uploading documents to Gemini")
    print("="*60 + "\n")

    from .document_manager import upload_documents_to_gemini
    files = upload_documents_to_gemini()

    state["response"] = {
        "status": "success",
        "message": f"Uploaded {len(files)} documents to Gemini",
        "files": [f.name for f in files]
    }
    state["messages"].append("Scraper: Documents uploaded")
    state["next_agent"] = "end"

    print("\n✓ Scraper agent completed")
    print("="*60 + "\n")

    return state


def simulation_agent_node(state: AgentState) -> AgentState:
    """Simulation agent - generates map visualizations (placeholder)."""
    print("\n" + "="*60)
    print("🗺️  SIMULATION AGENT: Generating visualization")
    print("="*60 + "\n")

    # TODO: Implement simulation logic
    # - Parse policy document for geographic data
    # - Generate Mapbox API calls
    # - Stream JSON deltas for real-time updates

    state["response"] = {
        "status": "pending",
        "message": "Simulation agent not yet implemented",
        "data": {}
    }
    state["messages"].append("Simulation: Placeholder response")
    state["next_agent"] = "end"

    print("⚠️  Simulation agent placeholder")
    print("="*60 + "\n")

    return state


def debate_agent_node(state: AgentState) -> AgentState:
    """Debate agents - multi-agent analysis of pros/cons (placeholder)."""
    print("\n" + "="*60)
    print("⚖️  DEBATE AGENTS: Analyzing policy implications")
    print("="*60 + "\n")

    # TODO: Implement debate logic
    # - Create multiple agent perspectives
    # - Run structured debate
    # - Return pros/cons analysis

    state["response"] = {
        "status": "pending",
        "message": "Debate agents not yet implemented",
        "analysis": {}
    }
    state["messages"].append("Debate: Placeholder response")
    state["next_agent"] = "end"

    print("⚠️  Debate agents placeholder")
    print("="*60 + "\n")

    return state


def aggregator_agent_node(state: AgentState) -> AgentState:
    """Aggregator agent - compiles reports (placeholder)."""
    print("\n" + "="*60)
    print("📊 AGGREGATOR AGENT: Compiling report")
    print("="*60 + "\n")

    # TODO: Implement aggregation logic
    # - Compile simulation results
    # - Integrate debate analysis
    # - Generate PDF report

    state["response"] = {
        "status": "pending",
        "message": "Aggregator agent not yet implemented",
        "report": {}
    }
    state["messages"].append("Aggregator: Placeholder response")
    state["next_agent"] = "end"

    print("⚠️  Aggregator agent placeholder")
    print("="*60 + "\n")

    return state


def route_next(state: AgentState) -> Literal["parser", "chat", "scraper", "simulation", "debate", "aggregator", "end"]:
    """Router function that determines next node based on supervisor decision."""
    next_agent = state.get("next_agent", "end")
    print(f"🔀 ROUTER: Next destination -> {next_agent}")
    return next_agent


# Build the LangGraph workflow
def create_workflow() -> StateGraph:
    """Create the LangGraph workflow with all agents."""

    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("supervisor", supervisor_agent)
    workflow.add_node("parser", parser_agent_node)
    workflow.add_node("chat", chat_agent_node)
    workflow.add_node("scraper", scraper_agent_node)
    workflow.add_node("simulation", simulation_agent_node)
    workflow.add_node("debate", debate_agent_node)
    workflow.add_node("aggregator", aggregator_agent_node)

    # Set entry point
    workflow.set_entry_point("supervisor")

    # Add conditional routing from supervisor
    workflow.add_conditional_edges(
        "supervisor",
        route_next,
        {
            "parser": "parser",
            "chat": "chat",
            "scraper": "scraper",
            "simulate": "simulation",
            "debate": "debate",
            "aggregator": "aggregator",
            "end": END
        }
    )

    # All agents end after completion
    workflow.add_edge("parser", END)
    workflow.add_edge("chat", END)
    workflow.add_edge("scraper", END)
    workflow.add_edge("simulation", END)
    workflow.add_edge("debate", END)
    workflow.add_edge("aggregator", END)

    return workflow.compile()


# Global workflow instance
_workflow = None

def get_workflow():
    """Get or create workflow instance."""
    global _workflow
    if _workflow is None:
        _workflow = create_workflow()
    return _workflow


def orchestrate(action: str = "parse", **kwargs) -> dict | Generator:
    """
    Main orchestration entry point using LangGraph.

    Args:
        action: The action to perform (parse, chat, scrape, simulate, debate, aggregate)
        **kwargs: Additional parameters (message, session_id, etc.)

    Returns:
        dict or Generator depending on the action
    """
    print("\n" + "="*80)
    print("🚀 URBAN POLICY SIMULATION ORCHESTRATOR")
    print("="*80)

    # Initialize state
    initial_state = AgentState(
        messages=[],
        action=action,
        user_message=kwargs.get("message", ""),
        session_id=kwargs.get("session_id", "default"),
        document_context="",
        next_agent="",
        response="",
        metadata=kwargs
    )

    # Run the workflow
    workflow = get_workflow()

    try:
        final_state = workflow.invoke(initial_state)

        print("\n" + "="*80)
        print("✅ ORCHESTRATION COMPLETE")
        print("="*80)
        print(f"Path taken: {' -> '.join(final_state['messages'])}")
        print("="*80 + "\n")

        return final_state["response"]

    except Exception as e:
        print(f"\n❌ ORCHESTRATION ERROR: {e}\n")
        return {
            "status": "error",
            "message": f"Orchestration failed: {str(e)}"
        }


if __name__ == "__main__":
    # Test the orchestrator
    print("Testing orchestrator with parse action...")
    result = orchestrate(action="parse")
    print(f"\nResult: {result.get('status', 'unknown')}")

    print("\n" + "="*80 + "\n")

    print("Testing orchestrator with chat action...")
    for chunk in orchestrate(action="chat", message="Summarize the main points"):
        print(chunk, end='', flush=True)
