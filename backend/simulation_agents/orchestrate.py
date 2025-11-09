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

from typing import TypedDict, Literal, Generator
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import os
from dotenv import load_dotenv

from .parser_agent import parse_documents
from .simple_chat_agent import chat_with_documents
from .document_manager import get_parsed_context
from .city_data_agent import city_data_agent_stream, collect_city_data_sync
from .policy_analysis_agent import analyze_policy_document_stream, analyze_policy_document_sync
from .mapbox_agent import generate_map_visualization
from .simulation_agent import run_simulation_stream
from .thoughts_stream_agent import (
    get_thoughts_stream,
    emit_thought,
    AgentType,
    ThoughtType,
    ThoughtPatterns
)

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

    elif action == "city_data":
        next_agent = "city_data"
        print("🏙️  Routing to: CITY DATA AGENT (collect population, housing, traffic, GDP)")

    elif action == "policy_analysis":
        next_agent = "policy_analysis"
        print("📄 Routing to: POLICY ANALYSIS AGENT (extract policy intent and parameters)")

    elif action == "thoughts_stream":
        next_agent = "thoughts_stream"
        print("💭 Routing to: THOUGHTS STREAM (get agent reasoning stream)")

    elif action == "generate_map":
        next_agent = "mapbox"
        print("🗺️  Routing to: MAPBOX AGENT (generate map visualizations from policy)")

    elif action == "run_simulation":
        next_agent = "simulation_stream"
        print("🎬 Routing to: SIMULATION STREAM AGENT (real-time policy impact simulation)")

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
- city_data: Collect city statistics (population, housing, traffic, GDP) using Tavily
- policy_analysis: Analyze policy document intent and extract simulation parameters
- thoughts_stream: Get live stream of agent reasoning and decisions
- generate_map: Generate map visualization with context-relevant indicators from policy

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


def simulation_stream_agent_node(state: AgentState) -> AgentState:
    """Simulation Stream agent - streams real-time policy impact simulation."""
    print("\n" + "="*60)
    print("🎬 SIMULATION STREAM AGENT: Starting real-time simulation")
    print("="*60 + "\n")

    # Get simulation parameters from metadata
    metadata = state.get("metadata", {})
    simulation_type = metadata.get("simulation_type", "Urban Traffic")
    granularity = metadata.get("granularity", "Macro")
    time_horizon = metadata.get("time_horizon", 10)

    emit_thought(
        agent_type=AgentType.SIMULATION,
        thought_type=ThoughtType.ACTION,
        message=f"Starting {simulation_type} simulation ({granularity} level)",
        metadata={"simulation_type": simulation_type, "granularity": granularity}
    )

    # Return streaming generator - this will be yielded by the backend
    state["response"] = run_simulation_stream(
        simulation_type=simulation_type,
        granularity=granularity,
        time_horizon=time_horizon
    )
    state["messages"].append(f"SimulationStream: Starting {simulation_type} simulation")
    state["next_agent"] = "end"

    print("✓ Simulation stream initialized")
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


def city_data_agent_node(state: AgentState) -> AgentState:
    """City Data agent - collects city statistics using Tavily API."""
    print("\n" + "="*60)
    print("🏙️  CITY DATA AGENT: Collecting city statistics")
    print("="*60 + "\n")

    # Emit thought
    ThoughtPatterns.city_data_searching(
        state.get("metadata", {}).get("city", "unknown"),
        "all metrics"
    )

    # Get city from state metadata or extract from document context
    city = state.get("metadata", {}).get("city", None)

    # Get parsed context from document manager
    doc_context = get_parsed_context()

    # Check if we should stream or return sync
    stream = state.get("metadata", {}).get("stream", False)

    if stream:
        # Return streaming generator for real-time updates
        state["response"] = city_data_agent_stream(city=city, document_context=doc_context)
        state["messages"].append("CityData: Streaming city data collection")
    else:
        # Return synchronous result
        result = collect_city_data_sync(city=city, document_context=doc_context)
        state["response"] = result
        state["messages"].append(f"CityData: Collected data for {result.get('city', 'unknown')}")

        # Emit thoughts for found data
        if result.get("status") == "success" and result.get("numbers"):
            nums = result["numbers"]
            if nums.get("population_number"):
                ThoughtPatterns.city_data_found(result["city"], "population", f"{nums['population_number']:,}")
            if nums.get("housing_number"):
                ThoughtPatterns.city_data_found(result["city"], "housing", f"{nums['housing_number']:,} units")

    state["next_agent"] = "end"

    print("✓ City Data agent initialized")
    print("="*60 + "\n")

    return state


def policy_analysis_agent_node(state: AgentState) -> AgentState:
    """Policy Analysis agent - extracts policy intent and simulation parameters."""
    print("\n" + "="*60)
    print("📄 POLICY ANALYSIS AGENT: Analyzing policy document")
    print("="*60 + "\n")

    # Get file name from metadata if provided
    file_name = state.get("metadata", {}).get("file_name", None)

    # Emit thought
    ThoughtPatterns.policy_analyzing(file_name or "policy document")

    # Check if we should stream or return sync
    stream = state.get("metadata", {}).get("stream", False)

    if stream:
        # Return streaming generator for real-time updates
        state["response"] = analyze_policy_document_stream(file_name=file_name)
        state["messages"].append("PolicyAnalysis: Streaming policy analysis")
    else:
        # Return synchronous result
        result = analyze_policy_document_sync(file_name=file_name)
        state["response"] = result
        state["messages"].append(f"PolicyAnalysis: Analyzed {result.get('file_name', 'document')}")

        # Emit thought with policy intent
        if result.get("status") == "success" and result.get("analysis"):
            intent = result["analysis"].get("policy_intent", "")
            if intent:
                ThoughtPatterns.policy_intent_extracted(intent)

    state["next_agent"] = "end"

    print("✓ Policy Analysis agent completed")
    print("="*60 + "\n")

    return state


def thoughts_stream_agent_node(state: AgentState) -> AgentState:
    """Thoughts Stream agent - returns recent agent thoughts."""
    print("\n" + "="*60)
    print("💭 THOUGHTS STREAM AGENT: Retrieving agent thoughts")
    print("="*60 + "\n")

    # Get parameters
    limit = state.get("metadata", {}).get("limit", 20)
    agent_type = state.get("metadata", {}).get("agent_type", None)

    thoughts_manager = get_thoughts_stream()

    if agent_type:
        try:
            agent_enum = AgentType[agent_type.upper()]
            thoughts = thoughts_manager.get_thoughts_by_agent(agent_enum, limit=limit)
        except KeyError:
            thoughts = thoughts_manager.get_recent_thoughts(limit=limit)
    else:
        thoughts = thoughts_manager.get_recent_thoughts(limit=limit)

    state["response"] = {
        "status": "success",
        "thoughts": thoughts,
        "count": len(thoughts)
    }
    state["messages"].append(f"ThoughtsStream: Retrieved {len(thoughts)} thoughts")
    state["next_agent"] = "end"

    print(f"✓ Retrieved {len(thoughts)} thoughts")
    print("="*60 + "\n")

    return state


def mapbox_agent_node(state: AgentState) -> AgentState:
    """Mapbox agent - generates map visualizations with maximum context-relevant indicators."""
    print("\n" + "="*60)
    print("🗺️  MAPBOX AGENT: Generating map visualization")
    print("="*60 + "\n")

    # Emit thought
    emit_thought(
        agent_type=AgentType.MAPBOX_AGENT,
        thought_type=ThoughtType.ACTION,
        message="Mapbox Agent activated - generating map layers from policy data",
        metadata={}
    )

    # Get optional policy data from metadata
    policy_data = state.get("metadata", {}).get("policy_data", None)

    # Generate map visualization
    result = generate_map_visualization(policy_data=policy_data)

    state["response"] = result
    state["messages"].append(f"Mapbox: Generated {result.get('metadata', {}).get('indicators_generated', 0)} map layers")
    state["next_agent"] = "end"

    if result.get("status") == "success":
        metadata = result.get("metadata", {})
        print(f"✓ Map generation complete")
        print(f"  City: {result.get('city', 'N/A')}")
        print(f"  Layers: {metadata.get('indicators_generated', 0)}")
        print(f"  Features: {metadata.get('total_features', 0)}")
    else:
        print(f"✗ Map generation failed: {result.get('message', 'Unknown error')}")

    print("="*60 + "\n")

    return state


def route_next(state: AgentState) -> Literal["parser", "chat", "scraper", "simulation", "simulation_stream", "debate", "aggregator", "city_data", "policy_analysis", "thoughts_stream", "mapbox", "end"]:
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
    workflow.add_node("simulation_stream", simulation_stream_agent_node)
    workflow.add_node("debate", debate_agent_node)
    workflow.add_node("aggregator", aggregator_agent_node)
    workflow.add_node("city_data", city_data_agent_node)
    workflow.add_node("policy_analysis", policy_analysis_agent_node)
    workflow.add_node("thoughts_stream", thoughts_stream_agent_node)
    workflow.add_node("mapbox", mapbox_agent_node)

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
            "simulation_stream": "simulation_stream",
            "debate": "debate",
            "aggregator": "aggregator",
            "city_data": "city_data",
            "policy_analysis": "policy_analysis",
            "thoughts_stream": "thoughts_stream",
            "mapbox": "mapbox",
            "end": END
        }
    )

    # All agents end after completion
    workflow.add_edge("parser", END)
    workflow.add_edge("chat", END)
    workflow.add_edge("scraper", END)
    workflow.add_edge("simulation", END)
    workflow.add_edge("simulation_stream", END)
    workflow.add_edge("debate", END)
    workflow.add_edge("aggregator", END)
    workflow.add_edge("city_data", END)
    workflow.add_edge("policy_analysis", END)
    workflow.add_edge("thoughts_stream", END)
    workflow.add_edge("mapbox", END)

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
