"""
Simulation Agent - Real-time policy impact simulation with streaming updates.

This agent simulates the impact of policy changes over time, showing:
- Agent activities (housing development, infrastructure, zoning changes)
- Environmental changes (traffic flow, population shifts, economic impact)
- Real-time metrics updates
- Visual feedback for policy implementation

Streams JSON updates in real-time for frontend visualization.
"""

import os
import json
import time
from typing import Dict, Any, Generator
import google.generativeai as genai
from dotenv import load_dotenv

from .document_manager import get_parsed_context, get_uploaded_files
from .policy_analysis_agent import analyze_policy_document_sync
from .city_data_agent import collect_city_data_sync
from .mapbox_agent import generate_map_visualization
from .thoughts_stream_agent import emit_thought, AgentType, ThoughtType

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def simulate_policy_impact_stream(
    policy_analysis: Dict[str, Any] = None,
    city_data: Dict[str, Any] = None,
    map_visualization: Dict[str, Any] = None,
    simulation_type: str = "Urban Traffic",
    granularity: str = "Macro",
    time_horizon: int = 10
) -> Generator[Dict[str, Any], None, None]:
    """
    Stream real-time simulation updates showing policy impact over time.

    Args:
        policy_analysis: Policy analysis data (if None, will fetch)
        city_data: City data (if None, will fetch)
        map_visualization: Map visualization data (if None, will fetch)
        simulation_type: Type of simulation (Urban Traffic, Housing, etc.)
        granularity: Macro or Micro level simulation
        time_horizon: Years to simulate (default 10)

    Yields:
        Dict with simulation updates:
        {
            "type": "agent_activity" | "metric_update" | "environment_change" | "phase_complete",
            "timestamp": float,
            "phase": str,
            "agent": str,
            "activity": str,
            "metrics": {...},
            "visualization": {...},
            "message": str
        }
    """
    print("\n" + "="*70)
    print("🎬 SIMULATION AGENT: Starting real-time policy impact simulation")
    print("="*70)

    emit_thought(
        agent_type=AgentType.SIMULATION_AGENT,
        thought_type=ThoughtType.ACTION,
        message=f"Starting {simulation_type} simulation ({granularity} level, {time_horizon} year horizon)",
        metadata={"simulation_type": simulation_type, "granularity": granularity, "time_horizon": time_horizon}
    )

    # Get context if not provided
    if not policy_analysis:
        print("📄 Fetching policy analysis...")
        policy_result = analyze_policy_document_sync()
        if policy_result.get("status") == "success":
            policy_analysis = policy_result.get("analysis", {})
        else:
            policy_analysis = {}

    if not city_data:
        print("🏙️  Fetching city data...")
        city_name = policy_analysis.get("target_city", "San Francisco")
        city_data = collect_city_data_sync(city=city_name)

    if not map_visualization:
        print("🗺️  Fetching map visualization...")
        map_result = generate_map_visualization(policy_data=policy_analysis)
        if map_result.get("status") == "success":
            map_visualization = map_result
        else:
            map_visualization = {}

    # Extract key information
    policy_intent = policy_analysis.get("policy_intent", "Policy implementation")
    affected_areas = policy_analysis.get("affected_areas", [])
    key_metrics = policy_analysis.get("key_metrics", {})
    impact_predictions = policy_analysis.get("impact_predictions", {})
    
    city_name = city_data.get("city", "Unknown City")
    base_metrics = city_data.get("numbers", {})
    
    # Simulation phases
    phases = [
        {"name": "Initialization", "duration": 2, "description": "Setting up simulation environment"},
        {"name": "Policy Analysis", "duration": 3, "description": "Analyzing policy implications"},
        {"name": "Infrastructure Planning", "duration": 4, "description": "Planning infrastructure changes"},
        {"name": "Housing Development", "duration": 5, "description": "Simulating housing construction"},
        {"name": "Transportation Impact", "duration": 4, "description": "Analyzing traffic and transit changes"},
        {"name": "Economic Effects", "duration": 3, "description": "Calculating economic impact"},
        {"name": "Community Impact", "duration": 3, "description": "Assessing community effects"},
        {"name": "Final Assessment", "duration": 2, "description": "Compiling final results"}
    ]

    # Agent types for simulation
    agents = [
        {"name": "Urban Planner", "icon": "🏗️", "color": "#3b82f6"},
        {"name": "Transportation Engineer", "icon": "🚇", "color": "#10b981"},
        {"name": "Housing Developer", "icon": "🏠", "color": "#f59e0b"},
        {"name": "Economic Analyst", "icon": "📊", "color": "#8b5cf6"},
        {"name": "Community Liaison", "icon": "👥", "color": "#ec4899"},
        {"name": "Environmental Specialist", "icon": "🌳", "color": "#22c55e"}
    ]

    # Initialize metrics
    current_metrics = {
        "population": base_metrics.get("population_number", 1000000),
        "housing_units": base_metrics.get("housing_number", 500000),
        "traffic_congestion": base_metrics.get("traffic_percentage", 30),
        "gdp_growth": base_metrics.get("gdp_percentage", 2.5),
        "affordability_index": 65,
        "air_quality": 75,
        "public_satisfaction": 60
    }

    # Yield initial state
    yield {
        "type": "simulation_start",
        "timestamp": time.time(),
        "phase": "Initialization",
        "message": f"🎬 Starting {simulation_type} simulation for {city_name}",
        "policy_intent": policy_intent,
        "affected_areas": affected_areas,
        "simulation_type": simulation_type,
        "granularity": granularity,
        "time_horizon": time_horizon,
        "metrics": current_metrics.copy(),
        "agents": agents
    }

    phase_index = 0
    total_duration = sum(p["duration"] for p in phases)
    elapsed_time = 0

    # Simulate each phase
    for phase_index, phase in enumerate(phases):
        phase_name = phase["name"]
        phase_duration = phase["duration"]
        
        emit_thought(
            agent_type=AgentType.SIMULATION_AGENT,
            thought_type=ThoughtType.ACTION,
            message=f"Phase {phase_index + 1}/{len(phases)}: {phase_name}",
            metadata={"phase": phase_name, "phase_index": phase_index}
        )

        # Yield phase start
        yield {
            "type": "phase_start",
            "timestamp": time.time(),
            "phase": phase_name,
            "phase_index": phase_index,
            "total_phases": len(phases),
            "message": f"📋 Phase {phase_index + 1}: {phase_name}",
            "description": phase["description"]
        }

        # Simulate activities within this phase
        # Micro: More detailed steps, smaller incremental changes
        # Macro: Fewer high-level steps, larger aggregate changes
        steps_per_phase = 5 if granularity == "Micro" else 3
        
        # Adjust metric change magnitude based on granularity
        # Micro: Smaller, more frequent changes (more realistic)
        # Macro: Larger, less frequent changes (aggregated)
        change_multiplier = 0.5 if granularity == "Micro" else 1.5
        
        for step in range(steps_per_phase):
            # Select random agent for this step
            import random
            agent = random.choice(agents)
            
            # Generate agent activity based on granularity
            # Micro: More specific, detailed activities
            # Macro: High-level, strategic activities
            if granularity == "Micro":
                activities = {
                    "Urban Planner": [
                        "Reviewing specific zoning code section 12.3.4 for residential density",
                        "Analyzing building permit application #2024-0456",
                        "Coordinating with Planning Department on Mission District overlay",
                        "Drafting site-specific development plan for 16th & Valencia",
                        "Meeting with property owner at 1234 Market Street"
                    ],
                    "Transportation Engineer": [
                        "Modeling traffic flow at 16th & Mission intersection during rush hour",
                        "Analyzing bike lane capacity on Valencia Street (0.5 mile segment)",
                        "Reviewing Muni bus route 14 stop frequency at 8am-9am",
                        "Calculating signal timing optimization for 5-block corridor",
                        "Assessing pedestrian crossing safety at specific intersections"
                    ],
                    "Housing Developer": [
                        "Securing construction permit for 45-unit building at 567 Mission St",
                        "Breaking ground on foundation for Building A, Phase 1",
                        "Coordinating with contractor for concrete pour on Tuesday",
                        "Managing project timeline: 30% complete, on schedule",
                        "Completing framing for units 101-105 in Building B"
                    ],
                    "Economic Analyst": [
                        "Calculating GDP impact: $2.3M from construction phase",
                        "Analyzing job creation: 45 construction jobs, 12 permanent",
                        "Assessing tax revenue: $125K annual property tax increase",
                        "Modeling economic growth: 0.15% local GDP increase",
                        "Evaluating investment returns: 8.2% ROI for investors"
                    ],
                    "Community Liaison": [
                        "Conducting public meeting at Mission Community Center (45 attendees)",
                        "Gathering feedback: 23 support, 8 concerns, 14 neutral",
                        "Addressing resident concern about construction noise at 7am",
                        "Coordinating outreach: 150 door hangers distributed",
                        "Building community support: 68% approval rating"
                    ],
                    "Environmental Specialist": [
                        "Assessing air quality: PM2.5 levels at 12.3 μg/m³ (below 15 threshold)",
                        "Evaluating green space: 0.3 acres needed, 0.5 acres allocated",
                        "Analyzing carbon footprint: 45 tons CO2 offset from green building",
                        "Planning sustainability: 15% energy reduction from solar panels",
                        "Monitoring environmental metrics: All targets met for Q1"
                    ]
                }
            else:  # Macro
                activities = {
                    "Urban Planner": [
                        "Analyzing city-wide zoning regulations",
                        "Reviewing comprehensive building codes",
                        "Planning regional infrastructure layout",
                        "Coordinating with multiple city departments",
                        "Drafting strategic development plans"
                    ],
                    "Transportation Engineer": [
                        "Modeling city-wide traffic flow patterns",
                        "Designing comprehensive transit routes",
                        "Analyzing regional road capacity",
                        "Planning city-wide bike lane network",
                        "Optimizing signal timing across corridors"
                    ],
                    "Housing Developer": [
                        "Securing permits for multiple construction projects",
                        "Breaking ground on major development sites",
                        "Coordinating with multiple contractors",
                        "Managing portfolio of project timelines",
                        "Completing housing units across development sites"
                    ],
                    "Economic Analyst": [
                        "Calculating city-wide GDP impact",
                        "Analyzing regional job creation",
                        "Assessing aggregate tax revenue",
                        "Modeling overall economic growth",
                        "Evaluating investment portfolio returns"
                    ],
                    "Community Liaison": [
                        "Conducting city-wide public meetings",
                        "Gathering comprehensive community feedback",
                        "Addressing major resident concerns",
                        "Coordinating large-scale outreach",
                        "Building broad community support"
                    ],
                    "Environmental Specialist": [
                        "Assessing city-wide air quality impact",
                        "Evaluating regional green space needs",
                        "Analyzing comprehensive carbon footprint",
                        "Planning city-wide sustainability measures",
                        "Monitoring aggregate environmental metrics"
                    ]
                }

            activity = random.choice(activities.get(agent["name"], ["Working on policy implementation"]))
            
            # Update metrics based on activity and granularity
            # Micro: Smaller, more granular changes
            # Macro: Larger, aggregated changes
            base_changes = {
                "Urban Planner": {"housing_units": random.randint(50, 200), "gdp_growth": 0.1},
                "Transportation Engineer": {"traffic_congestion": -random.randint(1, 5), "public_satisfaction": random.randint(1, 3)},
                "Housing Developer": {"housing_units": random.randint(100, 500), "affordability_index": random.randint(1, 5)},
                "Economic Analyst": {"gdp_growth": random.uniform(0.1, 0.3), "population": random.randint(100, 500)},
                "Community Liaison": {"public_satisfaction": random.randint(2, 8), "affordability_index": random.randint(1, 3)},
                "Environmental Specialist": {"air_quality": random.randint(1, 5), "public_satisfaction": random.randint(1, 4)}
            }

            changes = base_changes.get(agent["name"], {})
            for metric, change in changes.items():
                if metric in current_metrics:
                    adjusted_change = change * change_multiplier
                    if metric == "traffic_congestion":
                        current_metrics[metric] = max(0, current_metrics[metric] + adjusted_change)
                    elif metric == "gdp_growth":
                        current_metrics[metric] = max(0, current_metrics[metric] + adjusted_change)
                    else:
                        current_metrics[metric] = max(0, current_metrics[metric] + int(adjusted_change))

            # Yield agent activity
            yield {
                "type": "agent_activity",
                "timestamp": time.time(),
                "phase": phase_name,
                "phase_index": phase_index,
                "step": step + 1,
                "total_steps": steps_per_phase,
                "agent": agent["name"],
                "agent_icon": agent["icon"],
                "agent_color": agent["color"],
                "activity": activity,
                "message": f"{agent['icon']} {agent['name']}: {activity}",
                "granularity": granularity,
                "metrics": current_metrics.copy(),
                "progress": ((phase_index * steps_per_phase + step + 1) / (len(phases) * steps_per_phase)) * 100
            }

            time.sleep(0.5)  # Small delay for streaming effect

        # Yield phase completion
        yield {
            "type": "phase_complete",
            "timestamp": time.time(),
            "phase": phase_name,
            "phase_index": phase_index,
            "message": f"✅ Phase {phase_index + 1} complete: {phase_name}",
            "metrics": current_metrics.copy(),
            "progress": ((phase_index + 1) / len(phases)) * 100
        }

        elapsed_time += phase_duration

    # Generate final summary using Gemini
    print("\n🤖 Generating final simulation summary...")
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
    
    # Adjust summary detail level based on granularity
    detail_level = "detailed, specific" if granularity == "Micro" else "high-level, strategic"
    summary_length = "3-4 sentences with specific numbers and locations" if granularity == "Micro" else "2-3 sentences with aggregate outcomes"
    
    summary_prompt = f"""
    Based on this policy simulation ({granularity} level), generate a {detail_level} summary:

    Policy: {policy_intent}
    City: {city_name}
    Affected Areas: {', '.join(affected_areas) if affected_areas else 'Multiple areas'}
    Simulation Type: {simulation_type}
    Granularity: {granularity} ({'detailed, site-specific analysis' if granularity == 'Micro' else 'high-level, city-wide analysis'})
    Time Horizon: {time_horizon} years

    Final Metrics:
    - Population: {current_metrics['population']:,}
    - Housing Units: {current_metrics['housing_units']:,}
    - Traffic Congestion: {current_metrics['traffic_congestion']}%
    - GDP Growth: {current_metrics['gdp_growth']}%
    - Affordability Index: {current_metrics['affordability_index']}/100
    - Air Quality: {current_metrics['air_quality']}/100
    - Public Satisfaction: {current_metrics['public_satisfaction']}/100

    Generate a {summary_length} of the policy impact and key outcomes.
    {'Include specific locations, numbers, and detailed impacts.' if granularity == 'Micro' else 'Focus on aggregate city-wide impacts and strategic outcomes.'}
    """

    try:
        response = model.generate_content(summary_prompt)
        final_summary = response.text.strip()
    except Exception as e:
        final_summary = f"Policy simulation completed. Key changes observed in {city_name} over {time_horizon} years."

    # Yield final results
    yield {
        "type": "simulation_complete",
        "timestamp": time.time(),
        "message": f"🎉 Simulation complete! {simulation_type} impact analyzed for {city_name}",
        "summary": final_summary,
        "final_metrics": current_metrics.copy(),
        "policy_intent": policy_intent,
        "affected_areas": affected_areas,
        "time_horizon": time_horizon,
        "progress": 100
    }

    emit_thought(
        agent_type=AgentType.SIMULATION_AGENT,
        thought_type=ThoughtType.DECISION,
        message=f"Simulation complete: {simulation_type} impact analyzed",
        metadata={"final_metrics": current_metrics, "time_horizon": time_horizon}
    )

    print("\n" + "="*70)
    print("✅ SIMULATION COMPLETE")
    print("="*70 + "\n")


def run_simulation_stream(
    simulation_type: str = "Urban Traffic",
    granularity: str = "Macro",
    time_horizon: int = 10
) -> Generator[Dict[str, Any], None, None]:
    """
    Main entry point for streaming simulation.
    
    Args:
        simulation_type: Type of simulation
        granularity: Macro or Micro
        time_horizon: Years to simulate
    
    Yields:
        Streaming simulation updates
    """
    return simulate_policy_impact_stream(
        policy_analysis=None,  # Will fetch automatically
        city_data=None,  # Will fetch automatically
        map_visualization=None,  # Will fetch automatically
        simulation_type=simulation_type,
        granularity=granularity,
        time_horizon=time_horizon
    )


if __name__ == "__main__":
    print("Testing Simulation Agent...\n")
    
    for update in run_simulation_stream(simulation_type="Urban Traffic", granularity="Macro", time_horizon=10):
        print(f"[{update['type']}] {update.get('message', '')}")
        if update.get('metrics'):
            print(f"  Metrics: {update['metrics']}")

