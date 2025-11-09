"""
Mapbox Simulation Agent

Intelligent map visualization generator that determines context-relevant indicators
from policy documents and generates comprehensive GeoJSON layers for display.

Key Features:
- Smart indicator selection based on policy type (housing, transport, economic, etc.)
- Maximum visualization generation (15-20+ indicator types)
- Complete map data returned in single response (not streaming)
- Uses Mapbox MCP tools for geospatial processing
"""

import os
import json
from typing import Dict, Any, List
import google.generativeai as genai
from dotenv import load_dotenv

# Import Mapbox MCP tools
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from tools import mapbox_mcp

# Import agent infrastructure
from .document_manager import get_parsed_context, upload_documents_to_gemini
from .thoughts_stream_agent import emit_thought, AgentType, ThoughtType

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def determine_relevant_indicators(policy_analysis: Dict[str, Any]) -> Dict[str, bool]:
    """
    Use Gemini to intelligently determine which map indicators are relevant
    based on policy content.

    Args:
        policy_analysis: Structured policy analysis with intent, metrics, changes

    Returns:
        Dictionary of indicator names  boolean (should generate or not)
    """
    try:
        model = genai.GenerativeModel(
            "models/gemini-2.0-flash-exp",
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        )

        prompt = f"""
        Given this policy analysis, determine which map visualization indicators are RELEVANT.

        Policy Analysis:
        {json.dumps(policy_analysis, indent=2)}

        Available Indicator Types:
        - impact_zones: Circular zones showing policy impact areas
        - construction_markers: Points for new building construction sites
        - building_footprints: Building polygons in affected areas
        - road_network: Road/street geometries for infrastructure changes
        - isochrone_zones: Travel-time zones (5/10/15 min) for transit impact
        - traffic_routes: Traffic flow route visualizations
        - density_heatmap: Population/housing density heatmap
        - economic_heatmap: Economic activity/GDP impact heatmap
        - affordability_zones: Housing affordability impact zones
        - zoning_overlays: Zoning change boundaries
        - transit_corridors: Transit route/station impact areas
        - green_spaces: Park/environmental area changes
        - demolition_markers: Sites with building removals
        - parking_zones: Parking requirement change areas
        - height_restriction_zones: Building height limit zones
        - commercial_zones: Commercial development areas
        - public_sentiment_markers: Community feedback locations
        - infrastructure_projects: Major infrastructure project points

        Return VALID JSON with this structure:
        {{
          "indicators": {{
            "impact_zones": true/false,
            "construction_markers": true/false,
            "building_footprints": true/false,
            "road_network": true/false,
            "isochrone_zones": true/false,
            "traffic_routes": true/false,
            "density_heatmap": true/false,
            "economic_heatmap": true/false,
            "affordability_zones": true/false,
            "zoning_overlays": true/false,
            "transit_corridors": true/false,
            "green_spaces": true/false,
            "demolition_markers": true/false,
            "parking_zones": true/false,
            "height_restriction_zones": true/false,
            "commercial_zones": true/false,
            "public_sentiment_markers": true/false,
            "infrastructure_projects": true/false
          }},
          "reasoning": "Brief explanation of why these indicators were selected"
        }}

        RULES:
        - Select AS MANY relevant indicators as possible
        - Housing policies  construction_markers, density_heatmap, affordability_zones, building_footprints
        - Transportation policies  road_network, traffic_routes, isochrone_zones, transit_corridors
        - Zoning policies  zoning_overlays, height_restriction_zones, building_footprints
        - Economic policies  economic_heatmap, commercial_zones
        - Environmental policies  green_spaces
        - Always include: impact_zones (shows affected areas)
        - Be generous - when in doubt, include it

        NOW DETERMINE RELEVANT INDICATORS:
        """

        response = model.generate_content(prompt)
        result = json.loads(response.text)

        emit_thought(
            agent_type=AgentType.MAPBOX_AGENT,
            thought_type=ThoughtType.REASONING,
            message=f"Selected indicators: {result.get('reasoning', 'Multiple indicators determined')}",
            metadata={"indicators": result["indicators"]}
        )

        return result["indicators"]

    except Exception as e:
        print(f"L Error determining indicators: {e}")
        # Fallback: return most common indicators
        return {
            "impact_zones": True,
            "construction_markers": True,
            "building_footprints": True,
            "road_network": True,
            "density_heatmap": True,
            "isochrone_zones": False,
            "traffic_routes": False,
            "economic_heatmap": True,
            "affordability_zones": True,
            "zoning_overlays": False,
            "transit_corridors": False,
            "green_spaces": False,
            "demolition_markers": False,
            "parking_zones": False,
            "height_restriction_zones": False,
            "commercial_zones": False,
            "public_sentiment_markers": False,
            "infrastructure_projects": False
        }


def extract_geographic_data_from_policy(policy_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract and structure geographic data from policy analysis.

    Returns:
        {
            "locations": ["Mission District", "SOMA", ...],
            "target_city": "San Francisco",
            "affected_areas": [...],
            "coordinates_needed": True/False
        }
    """
    try:
        locations = []

        # Extract from affected areas
        if "affected_areas" in policy_analysis:
            locations.extend(policy_analysis["affected_areas"])

        # Extract from map highlights
        if "map_highlights" in policy_analysis:
            locations.extend(policy_analysis["map_highlights"])

        # Target city
        target_city = policy_analysis.get("target_city", "San Francisco")

        # Add target city to locations if specific areas not mentioned
        if not locations:
            locations.append(target_city)

        # Remove duplicates
        locations = list(set(locations))

        return {
            "locations": locations,
            "target_city": target_city,
            "affected_areas": policy_analysis.get("affected_areas", []),
            "coordinates_needed": True
        }

    except Exception as e:
        print(f"L Error extracting geographic data: {e}")
        return {
            "locations": ["San Francisco"],
            "target_city": "San Francisco",
            "affected_areas": [],
            "coordinates_needed": True
        }


def generate_all_map_layers(
    policy_analysis: Dict[str, Any],
    indicators: Dict[str, bool],
    geocoded_locations: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generate ALL relevant map layers based on selected indicators.

    Args:
        policy_analysis: Structured policy data
        indicators: Dict of indicator_name  should_generate
        geocoded_locations: Dict of location_name  geocoded data

    Returns:
        Dictionary with all GeoJSON layers
    """
    layers = {}

    emit_thought(
        agent_type=AgentType.MAPBOX_AGENT,
        thought_type=ThoughtType.ACTION,
        message="Generating map layers from policy data...",
        metadata={"indicator_count": sum(indicators.values())}
    )

    # Get primary location center
    center = mapbox_mcp.get_center_from_locations(geocoded_locations)
    bbox = mapbox_mcp.calculate_bbox_for_locations(geocoded_locations)

    # 1. IMPACT ZONES (Always generate for affected areas)
    if indicators.get("impact_zones", True):
        try:
            layers["impact_zones"] = mapbox_mcp.create_impact_zones_from_locations(
                geocoded_locations,
                default_radius=800,
                impact_type="policy_impact"
            )
            print(f" Generated impact zones: {len(layers['impact_zones']['features'])} zones")
        except Exception as e:
            print(f" Failed to generate impact zones: {e}")

    # 2. CONSTRUCTION MARKERS (For housing/development policies)
    if indicators.get("construction_markers", False):
        try:
            housing_units = policy_analysis.get("key_metrics", {}).get("housing_units", 100)
            units_per_site = max(50, housing_units // len(geocoded_locations)) if geocoded_locations else 100

            layers["construction_markers"] = mapbox_mcp.create_construction_markers(
                geocoded_locations,
                units_per_site=units_per_site
            )
            print(f" Generated construction markers: {len(layers['construction_markers']['features'])} sites")
        except Exception as e:
            print(f" Failed to generate construction markers: {e}")

    # 3. BUILDING FOOTPRINTS (For zoning/building regulation policies)
    if indicators.get("building_footprints", False):
        try:
            layers["building_footprints"] = mapbox_mcp.get_building_footprints_in_bbox(bbox, limit=50)
            print(f" Generated building footprints: {len(layers['building_footprints']['features'])} buildings")
        except Exception as e:
            print(f" Failed to generate building footprints: {e}")

    # 4. ROAD NETWORK (For transportation/infrastructure policies)
    if indicators.get("road_network", False):
        try:
            layers["road_network"] = mapbox_mcp.get_road_network_in_bbox(bbox)
            print(f" Generated road network: {len(layers['road_network']['features'])} roads")
        except Exception as e:
            print(f" Failed to generate road network: {e}")

    # 5. ISOCHRONE ZONES (For transit/accessibility policies)
    if indicators.get("isochrone_zones", False):
        try:
            # Generate isochrones for primary location
            isochrones = mapbox_mcp.generate_isochrone_zones(
                center,
                travel_times=[5, 10, 15],
                profile="driving"
            )
            if isochrones.get("features"):
                layers["isochrone_zones"] = isochrones
                print(f" Generated isochrone zones: {len(layers['isochrone_zones']['features'])} zones")
        except Exception as e:
            print(f" Failed to generate isochrone zones: {e}")

    # 6. TRAFFIC ROUTES (For traffic impact policies)
    if indicators.get("traffic_routes", False):
        try:
            # Generate sample traffic routes between major points
            if len(geocoded_locations) >= 2:
                location_list = list(geocoded_locations.values())
                routes = []
                for i in range(min(3, len(location_list) - 1)):
                    route = mapbox_mcp.calculate_route(
                        location_list[i]["coordinates"],
                        location_list[i + 1]["coordinates"],
                        profile="driving-traffic"
                    )
                    if route:
                        routes.append(route)

                if routes:
                    layers["traffic_routes"] = {
                        "type": "FeatureCollection",
                        "features": routes
                    }
                    print(f" Generated traffic routes: {len(routes)} routes")
        except Exception as e:
            print(f" Failed to generate traffic routes: {e}")

    # 7. DENSITY HEATMAP (For population/housing density)
    if indicators.get("density_heatmap", False):
        try:
            # Create heatmap for each affected location
            heatmap_zones = []
            for loc_name, loc_data in geocoded_locations.items():
                heatmap_zones.append({
                    "center": loc_data["coordinates"],
                    "intensity": 0.8,
                    "radius_meters": 600,
                    "points": 40
                })

            layers["density_heatmap"] = mapbox_mcp.create_multi_zone_heatmap(heatmap_zones)
            print(f" Generated density heatmap: {len(layers['density_heatmap']['features'])} points")
        except Exception as e:
            print(f" Failed to generate density heatmap: {e}")

    # 8. ECONOMIC HEATMAP (For economic impact)
    if indicators.get("economic_heatmap", False):
        try:
            layers["economic_heatmap"] = mapbox_mcp.create_impact_heatmap(
                center,
                intensity=0.7,
                radius_meters=1200,
                points=60
            )
            print(f" Generated economic heatmap: {len(layers['economic_heatmap']['features'])} points")
        except Exception as e:
            print(f" Failed to generate economic heatmap: {e}")

    # 9. AFFORDABILITY ZONES (For housing affordability impact)
    if indicators.get("affordability_zones", False):
        try:
            affordability_zones = []
            for loc_name, loc_data in geocoded_locations.items():
                zone = mapbox_mcp.create_circular_impact_zone(
                    loc_data["coordinates"],
                    radius_meters=700,
                    properties={
                        "zone_type": "affordability",
                        "location": loc_name,
                        "impact": "increased_affordability",
                        "color": "#22c55e",
                        "opacity": 0.3,
                        "label": f"Affordability Impact: {loc_name}"
                    }
                )
                affordability_zones.append(zone)

            layers["affordability_zones"] = {
                "type": "FeatureCollection",
                "features": affordability_zones
            }
            print(f" Generated affordability zones: {len(affordability_zones)} zones")
        except Exception as e:
            print(f" Failed to generate affordability zones: {e}")

    # 10. ZONING OVERLAYS (For zoning changes)
    if indicators.get("zoning_overlays", False):
        try:
            zoning_zones = []
            for loc_name, loc_data in geocoded_locations.items():
                zone = mapbox_mcp.create_circular_impact_zone(
                    loc_data["coordinates"],
                    radius_meters=500,
                    properties={
                        "zone_type": "zoning_change",
                        "location": loc_name,
                        "color": "#f59e0b",
                        "opacity": 0.4,
                        "label": f"Zoning Change: {loc_name}"
                    }
                )
                zoning_zones.append(zone)

            layers["zoning_overlays"] = {
                "type": "FeatureCollection",
                "features": zoning_zones
            }
            print(f" Generated zoning overlays: {len(zoning_zones)} zones")
        except Exception as e:
            print(f" Failed to generate zoning overlays: {e}")

    # 11. INFRASTRUCTURE PROJECTS (Major project markers)
    if indicators.get("infrastructure_projects", False):
        try:
            project_markers = []
            for loc_name, loc_data in geocoded_locations.items():
                marker = mapbox_mcp.create_marker(
                    loc_data["coordinates"],
                    "infrastructure",
                    {
                        "project_type": "infrastructure",
                        "location": loc_name,
                        "icon": "engineering",
                        "color": "#3b82f6",
                        "label": f"Infrastructure Project: {loc_name}"
                    }
                )
                project_markers.append(marker)

            layers["infrastructure_projects"] = {
                "type": "FeatureCollection",
                "features": project_markers
            }
            print(f" Generated infrastructure markers: {len(project_markers)} projects")
        except Exception as e:
            print(f" Failed to generate infrastructure markers: {e}")

    # 12. PUBLIC SENTIMENT MARKERS
    if indicators.get("public_sentiment_markers", False):
        try:
            sentiment_markers = []
            sentiments = ["positive", "neutral", "mixed"]
            for idx, (loc_name, loc_data) in enumerate(geocoded_locations.items()):
                # Offset slightly for visibility
                coords = loc_data["coordinates"].copy()
                coords[0] += 0.002 * (idx % 3 - 1)

                marker = mapbox_mcp.create_marker(
                    coords,
                    "sentiment",
                    {
                        "sentiment": sentiments[idx % 3],
                        "location": loc_name,
                        "icon": "sentiment",
                        "color": "#ec4899",
                        "label": f"Public Sentiment: {sentiments[idx % 3]}"
                    }
                )
                sentiment_markers.append(marker)

            layers["public_sentiment_markers"] = {
                "type": "FeatureCollection",
                "features": sentiment_markers
            }
            print(f" Generated sentiment markers: {len(sentiment_markers)} markers")
        except Exception as e:
            print(f" Failed to generate sentiment markers: {e}")

    emit_thought(
        agent_type=AgentType.MAPBOX_AGENT,
        thought_type=ThoughtType.OBSERVATION,
        message=f"Generated {len(layers)} map layers successfully",
        metadata={"layers": list(layers.keys())}
    )

    return layers


def generate_map_visualization(policy_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Main entry point: Generate complete map visualization from policy data.

    Args:
        policy_data: Optional pre-analyzed policy data. If None, will fetch from document_manager.

    Returns:
        {
            "status": "success" | "error",
            "city": "San Francisco",
            "center": [-122.4194, 37.7749],
            "zoom": 13,
            "bbox": [min_lng, min_lat, max_lng, max_lat],
            "layers": {
                "impact_zones": { GeoJSON FeatureCollection },
                "construction_markers": { GeoJSON FeatureCollection },
                ...
            },
            "metadata": {
                "indicators_generated": 12,
                "policy_type": "housing_zoning",
                "affected_areas": ["Mission District", "SOMA"],
                "total_features": 250
            }
        }
    """
    try:
        print("\n" + "=" * 70)
        print("=  MAPBOX AGENT: Generating Map Visualization")
        print("=" * 70)

        emit_thought(
            agent_type=AgentType.MAPBOX_AGENT,
            thought_type=ThoughtType.ACTION,
            message="Mapbox Agent activated - starting map generation",
            metadata={}
        )

        # 1. Get policy data (from parameter or document manager)
        if not policy_data:
            # Import here to avoid circular dependency
            from .policy_analysis_agent import analyze_policy_document_sync

            print("= Fetching policy analysis...")
            policy_result = analyze_policy_document_sync()

            if policy_result["status"] != "success":
                return {
                    "status": "error",
                    "message": "Failed to analyze policy document",
                    "layers": {}
                }

            policy_data = policy_result["analysis"]

        print(f" Policy data loaded: {policy_data.get('policy_intent', 'N/A')[:60]}...")

        # 2. Extract geographic data
        print("\n🌍 Extracting geographic data...")
        geo_data = extract_geographic_data_from_policy(policy_data)
        print(f" Found {len(geo_data['locations'])} locations: {geo_data['locations']}")

        # 3. Geocode all locations
        print("\n= Geocoding locations...")
        geocoded_locations = mapbox_mcp.geocode_multiple_locations(geo_data["locations"])

        if not geocoded_locations:
            return {
                "status": "error",
                "message": "Failed to geocode any locations",
                "layers": {}
            }

        print(f" Geocoded {len(geocoded_locations)} locations")

        # 4. Determine relevant indicators
        print("\n🌍 Determining relevant map indicators...")
        indicators = determine_relevant_indicators(policy_data)
        selected_count = sum(indicators.values())
        print(f" Selected {selected_count} indicators to generate")

        # 5. Generate all map layers
        print("\n🌍  Generating map layers...")
        layers = generate_all_map_layers(policy_data, indicators, geocoded_locations)
        print(f" Generated {len(layers)} layers")

        # 6. Calculate map center and bounds
        center = mapbox_mcp.get_center_from_locations(geocoded_locations)
        bbox = mapbox_mcp.calculate_bbox_for_locations(geocoded_locations)

        # 7. Count total features
        total_features = sum(
            len(layer.get("features", []))
            for layer in layers.values()
            if isinstance(layer, dict)
        )

        # 8. Build response
        result = {
            "status": "success",
            "city": geo_data["target_city"],
            "center": center,
            "zoom": 13,
            "bbox": bbox,
            "layers": layers,
            "metadata": {
                "indicators_generated": len(layers),
                "policy_type": policy_data.get("policy_intent", "unknown"),
                "affected_areas": geo_data["affected_areas"],
                "total_features": total_features,
                "locations_geocoded": list(geocoded_locations.keys())
            }
        }

        print("\n" + "=" * 70)
        print(f" MAP GENERATION COMPLETE")
        print(f"   Layers: {len(layers)} | Features: {total_features}")
        print("=" * 70 + "\n")

        emit_thought(
            agent_type=AgentType.MAPBOX_AGENT,
            thought_type=ThoughtType.DECISION,
            message=f"Map generation complete: {len(layers)} layers, {total_features} features",
            metadata=result["metadata"]
        )

        return result

    except Exception as e:
        error_msg = f"Error generating map visualization: {str(e)}"
        print(f"\nL {error_msg}")

        emit_thought(
            agent_type=AgentType.MAPBOX_AGENT,
            thought_type=ThoughtType.ERROR,
            message=error_msg,
            metadata={"error": str(e)}
        )

        return {
            "status": "error",
            "message": error_msg,
            "layers": {}
        }


# For testing
if __name__ == "__main__":
    print("Testing Mapbox Agent...\n")

    result = generate_map_visualization()

    if result["status"] == "success":
        print(f"\n Success!")
        print(f"City: {result['city']}")
        print(f"Center: {result['center']}")
        print(f"Layers generated: {list(result['layers'].keys())}")
        print(f"Total features: {result['metadata']['total_features']}")
    else:
        print(f"\nL Error: {result['message']}")
