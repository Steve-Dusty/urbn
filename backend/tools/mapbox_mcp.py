"""
Mapbox MCP Backend Service Module

Provides MCP-like tools for generating maximum context-relevant map indicators.
Integrates with orchestration system to transform parsed policy data into
rich geospatial visualizations.

Mapbox APIs Used:
- Geocoding API: Address → coordinates
- Tilesets API: Building footprints, road networks, land parcels
- Isochrone API: Travel-time zones
- Directions/Matrix API: Traffic routes and flow patterns
"""

import os
import requests
from typing import Dict, List, Tuple, Optional, Any
from dotenv import load_dotenv
import json

load_dotenv()

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

if not MAPBOX_ACCESS_TOKEN:
    print("�  WARNING: MAPBOX_ACCESS_TOKEN not found in .env")

# ============================================================================
# GEOCODING TOOLS
# ============================================================================

def geocode_location(location: str) -> Optional[Dict[str, Any]]:
    """
    Convert address/location name to coordinates using Mapbox Geocoding API.

    Args:
        location: Address, neighborhood, or place name

    Returns:
        {
            "coordinates": [longitude, latitude],
            "place_name": "Full formatted address",
            "bbox": [min_lng, min_lat, max_lng, max_lat],  # Bounding box
            "context": ["San Francisco", "California", "United States"]
        }
    """
    try:
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(location)}.json"
        params = {
            "access_token": MAPBOX_ACCESS_TOKEN,
            "limit": 1
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data.get("features"):
            print(f"�  No geocoding results for: {location}")
            return None

        feature = data["features"][0]

        return {
            "coordinates": feature["center"],  # [lng, lat]
            "place_name": feature["place_name"],
            "bbox": feature.get("bbox"),
            "context": [ctx["text"] for ctx in feature.get("context", [])]
        }
    except Exception as e:
        print(f"❌ Geocoding error for {location}: {e}")
        return None


def geocode_multiple_locations(locations: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Geocode multiple locations at once.

    Returns:
        {
            "Mission District": { "coordinates": [...], ... },
            "SOMA": { "coordinates": [...], ... },
            ...
        }
    """
    results = {}
    for location in locations:
        geocoded = geocode_location(location)
        if geocoded:
            results[location] = geocoded
            print(f" Geocoded: {location} → {geocoded['coordinates']}")
        else:
            print(f" Failed to geocode: {location}")

    return results


# ============================================================================
# BUILDING FOOTPRINT TOOLS
# ============================================================================

def get_building_footprints_in_bbox(bbox: List[float], limit: int = 100) -> Dict[str, Any]:
    """
    Get building footprints within a bounding box using Mapbox Tilesets API.

    Args:
        bbox: [min_lng, min_lat, max_lng, max_lat]
        limit: Max number of buildings to return

    Returns:
        GeoJSON FeatureCollection with building polygons
    """
    # NOTE: Mapbox Tilesets API requires a tileset ID and specific access
    # For this implementation, we'll generate synthetic building data
    # based on the bounding box to demonstrate the structure

    # In production, you would:
    # 1. Use Mapbox Tilesets API with a building tileset
    # 2. Or use OpenStreetMap Overpass API for building footprints
    # 3. Or use Mapbox's Dataset API to query custom datasets

    try:
        # Generate sample building footprints in the bbox
        min_lng, min_lat, max_lng, max_lat = bbox

        # Create a grid of synthetic buildings
        buildings = []
        step_lng = (max_lng - min_lng) / 10
        step_lat = (max_lat - min_lat) / 10

        for i in range(min(limit // 10, 10)):
            for j in range(min(limit // 10, 10)):
                if len(buildings) >= limit:
                    break

                center_lng = min_lng + (i + 0.5) * step_lng
                center_lat = min_lat + (j + 0.5) * step_lat

                # Create a small building polygon
                size = 0.0001  # Small building size
                building_polygon = [
                    [center_lng - size, center_lat - size],
                    [center_lng + size, center_lat - size],
                    [center_lng + size, center_lat + size],
                    [center_lng - size, center_lat + size],
                    [center_lng - size, center_lat - size]
                ]

                buildings.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [building_polygon]
                    },
                    "properties": {
                        "building": "yes",
                        "height": 15 + (i + j) * 3,  # Varied heights
                        "levels": 3 + (i + j) // 2
                    }
                })

        return {
            "type": "FeatureCollection",
            "features": buildings
        }
    except Exception as e:
        print(f"❌ Error getting building footprints: {e}")
        return {"type": "FeatureCollection", "features": []}


def get_buildings_around_point(coordinates: List[float], radius_meters: int = 500) -> Dict[str, Any]:
    """
    Get building footprints around a point within specified radius.

    Args:
        coordinates: [longitude, latitude]
        radius_meters: Radius in meters

    Returns:
        GeoJSON FeatureCollection with building polygons
    """
    # Convert radius to approximate degree offset (rough approximation)
    degree_offset = radius_meters / 111000  # ~111km per degree at equator

    lng, lat = coordinates
    bbox = [
        lng - degree_offset,
        lat - degree_offset,
        lng + degree_offset,
        lat + degree_offset
    ]

    return get_building_footprints_in_bbox(bbox)


# ============================================================================
# ROAD NETWORK TOOLS
# ============================================================================

def get_road_network_in_bbox(bbox: List[float]) -> Dict[str, Any]:
    """
    Get road network within a bounding box.

    Returns:
        GeoJSON FeatureCollection with road LineStrings
    """
    try:
        min_lng, min_lat, max_lng, max_lat = bbox

        # Generate sample road network
        roads = []

        # Horizontal roads
        for i in range(5):
            lat = min_lat + (max_lat - min_lat) * i / 4
            roads.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[min_lng, lat], [max_lng, lat]]
                },
                "properties": {
                    "road_type": "primary" if i == 2 else "secondary",
                    "name": f"Street {i+1}"
                }
            })

        # Vertical roads
        for i in range(5):
            lng = min_lng + (max_lng - min_lng) * i / 4
            roads.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lng, min_lat], [lng, max_lat]]
                },
                "properties": {
                    "road_type": "secondary",
                    "name": f"Avenue {chr(65+i)}"
                }
            })

        return {
            "type": "FeatureCollection",
            "features": roads
        }
    except Exception as e:
        print(f"❌ Error getting road network: {e}")
        return {"type": "FeatureCollection", "features": []}


def get_roads_around_point(coordinates: List[float], radius_meters: int = 500) -> Dict[str, Any]:
    """Get road network around a point."""
    degree_offset = radius_meters / 111000
    lng, lat = coordinates
    bbox = [lng - degree_offset, lat - degree_offset, lng + degree_offset, lat + degree_offset]
    return get_road_network_in_bbox(bbox)


# ============================================================================
# ISOCHRONE TOOLS (Travel-Time Zones)
# ============================================================================

def generate_isochrone_zones(
    coordinates: List[float],
    travel_times: List[int] = [5, 10, 15],
    profile: str = "driving"
) -> Dict[str, Any]:
    """
    Generate isochrone (travel-time) zones using Mapbox Isochrone API.

    Args:
        coordinates: [longitude, latitude] center point
        travel_times: List of travel times in minutes (e.g., [5, 10, 15])
        profile: "driving", "walking", or "cycling"

    Returns:
        GeoJSON FeatureCollection with polygon zones for each travel time
    """
    try:
        lng, lat = coordinates
        contours_minutes = ",".join(map(str, travel_times))

        url = f"https://api.mapbox.com/isochrone/v1/mapbox/{profile}/{lng},{lat}"
        params = {
            "contours_minutes": contours_minutes,
            "polygons": "true",
            "access_token": MAPBOX_ACCESS_TOKEN
        }

        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        # Add helpful properties to each feature
        for feature in data.get("features", []):
            contour = feature["properties"].get("contour", 0)
            feature["properties"]["travel_time"] = contour
            feature["properties"]["label"] = f"{contour} min {profile}"

            # Color coding by time
            if contour <= 5:
                feature["properties"]["color"] = "#22c55e"  # Green
            elif contour <= 10:
                feature["properties"]["color"] = "#eab308"  # Yellow
            else:
                feature["properties"]["color"] = "#ef4444"  # Red

        print(f" Generated {len(data.get('features', []))} isochrone zones")
        return data

    except Exception as e:
        print(f"❌ Isochrone error: {e}")
        # Return empty GeoJSON if API fails
        return {"type": "FeatureCollection", "features": []}


# ============================================================================
# TRAFFIC & ROUTING TOOLS
# ============================================================================

def calculate_route(
    origin: List[float],
    destination: List[float],
    profile: str = "driving-traffic"
) -> Dict[str, Any]:
    """
    Calculate route between two points using Mapbox Directions API.

    Args:
        origin: [longitude, latitude]
        destination: [longitude, latitude]
        profile: "driving", "driving-traffic", "walking", "cycling"

    Returns:
        GeoJSON Feature with route LineString + metadata
    """
    try:
        origin_str = f"{origin[0]},{origin[1]}"
        dest_str = f"{destination[0]},{destination[1]}"

        url = f"https://api.mapbox.com/directions/v5/mapbox/{profile}/{origin_str};{dest_str}"
        params = {
            "geometries": "geojson",
            "overview": "full",
            "access_token": MAPBOX_ACCESS_TOKEN
        }

        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        if not data.get("routes"):
            print(f"�  No route found")
            return None

        route = data["routes"][0]

        return {
            "type": "Feature",
            "geometry": route["geometry"],
            "properties": {
                "distance": route["distance"],  # meters
                "duration": route["duration"],  # seconds
                "profile": profile
            }
        }
    except Exception as e:
        print(f"❌ Routing error: {e}")
        return None


def generate_traffic_flow_routes(locations: List[Tuple[List[float], List[float]]]) -> Dict[str, Any]:
    """
    Generate multiple traffic flow routes.

    Args:
        locations: List of (origin, destination) coordinate pairs

    Returns:
        GeoJSON FeatureCollection with all routes
    """
    routes = []
    for origin, destination in locations:
        route = calculate_route(origin, destination)
        if route:
            routes.append(route)

    return {
        "type": "FeatureCollection",
        "features": routes
    }


# ============================================================================
# HEATMAP GENERATION TOOLS
# ============================================================================

def create_impact_heatmap(
    center: List[float],
    intensity: float,
    radius_meters: int = 1000,
    points: int = 50
) -> Dict[str, Any]:
    """
    Create heatmap points for policy impact visualization.

    Args:
        center: [longitude, latitude] center of impact
        intensity: 0.0 to 1.0 (impact magnitude)
        radius_meters: Radius of impact zone
        points: Number of heatmap points to generate

    Returns:
        GeoJSON FeatureCollection with weighted points for heatmap
    """
    import math
    import random

    lng, lat = center
    degree_radius = radius_meters / 111000

    heatmap_points = []

    for _ in range(points):
        # Generate random points within radius (circular distribution)
        angle = random.uniform(0, 2 * math.pi)
        distance = random.uniform(0, degree_radius)

        point_lng = lng + distance * math.cos(angle)
        point_lat = lat + distance * math.sin(angle)

        # Weight decreases with distance from center (Gaussian-like)
        dist_from_center = distance / degree_radius
        weight = intensity * (1 - dist_from_center ** 2)

        heatmap_points.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point_lng, point_lat]
            },
            "properties": {
                "weight": max(0, weight)
            }
        })

    return {
        "type": "FeatureCollection",
        "features": heatmap_points
    }


def create_multi_zone_heatmap(zones: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Create heatmap for multiple impact zones.

    Args:
        zones: List of zone dicts with {center, intensity, radius_meters}

    Returns:
        Combined GeoJSON FeatureCollection
    """
    all_points = []

    for zone in zones:
        heatmap = create_impact_heatmap(
            zone["center"],
            zone.get("intensity", 0.8),
            zone.get("radius_meters", 1000),
            zone.get("points", 30)
        )
        all_points.extend(heatmap["features"])

    return {
        "type": "FeatureCollection",
        "features": all_points
    }


# ============================================================================
# IMPACT ZONE GENERATION
# ============================================================================

def create_circular_impact_zone(
    center: List[float],
    radius_meters: int,
    properties: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create circular polygon for impact zone.

    Args:
        center: [longitude, latitude]
        radius_meters: Radius in meters
        properties: Custom properties (impact_type, magnitude, color, label)

    Returns:
        GeoJSON Feature with Polygon
    """
    import math

    lng, lat = center
    degree_radius = radius_meters / 111000

    # Generate circle polygon (36 points)
    coordinates = []
    for i in range(37):  # 36 segments + close the loop
        angle = (i / 36) * 2 * math.pi
        point_lng = lng + degree_radius * math.cos(angle)
        point_lat = lat + degree_radius * math.sin(angle)
        coordinates.append([point_lng, point_lat])

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [coordinates]
        },
        "properties": properties
    }


def create_impact_zones_from_locations(
    locations: Dict[str, Dict[str, Any]],
    default_radius: int = 500,
    impact_type: str = "policy_impact"
) -> Dict[str, Any]:
    """
    Create impact zones for all geocoded locations.

    Args:
        locations: Dict from geocode_multiple_locations()
        default_radius: Default radius in meters
        impact_type: Type of impact

    Returns:
        GeoJSON FeatureCollection with impact zone polygons
    """
    zones = []

    for location_name, location_data in locations.items():
        coordinates = location_data["coordinates"]

        zone = create_circular_impact_zone(
            coordinates,
            default_radius,
            {
                "location": location_name,
                "impact_type": impact_type,
                "magnitude": 0.75,
                "color": "#3b82f6",
                "label": f"{location_name} Impact Zone"
            }
        )
        zones.append(zone)

    return {
        "type": "FeatureCollection",
        "features": zones
    }


# ============================================================================
# MARKER GENERATION
# ============================================================================

def create_marker(
    coordinates: List[float],
    marker_type: str,
    properties: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create a map marker (Point feature).

    Args:
        coordinates: [longitude, latitude]
        marker_type: "construction", "demolition", "sentiment", etc.
        properties: Custom properties

    Returns:
        GeoJSON Feature (Point)
    """
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": coordinates
        },
        "properties": {
            "marker_type": marker_type,
            **properties
        }
    }


def create_construction_markers(locations: Dict[str, Dict[str, Any]], units_per_site: int = 100) -> Dict[str, Any]:
    """Create construction site markers for all locations."""
    markers = []

    for location_name, location_data in locations.items():
        marker = create_marker(
            location_data["coordinates"],
            "construction",
            {
                "location": location_name,
                "units": units_per_site,
                "status": "planned",
                "icon": "construction",
                "color": "#22c55e",
                "label": f"New Construction: {units_per_site} units"
            }
        )
        markers.append(marker)

    return {
        "type": "FeatureCollection",
        "features": markers
    }


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def calculate_bbox_for_locations(locations: Dict[str, Dict[str, Any]], padding: float = 0.01) -> List[float]:
    """
    Calculate bounding box that encompasses all locations.

    Args:
        locations: Dict from geocode_multiple_locations()
        padding: Extra padding in degrees

    Returns:
        [min_lng, min_lat, max_lng, max_lat]
    """
    if not locations:
        return [-122.5, 37.7, -122.3, 37.8]  # Default SF bbox

    lngs = [loc["coordinates"][0] for loc in locations.values()]
    lats = [loc["coordinates"][1] for loc in locations.values()]

    return [
        min(lngs) - padding,
        min(lats) - padding,
        max(lngs) + padding,
        max(lats) + padding
    ]


def get_center_from_locations(locations: Dict[str, Dict[str, Any]]) -> List[float]:
    """Get center point from multiple locations."""
    if not locations:
        return [-122.4194, 37.7749]  # Default SF center

    lngs = [loc["coordinates"][0] for loc in locations.values()]
    lats = [loc["coordinates"][1] for loc in locations.values()]

    return [
        sum(lngs) / len(lngs),
        sum(lats) / len(lats)
    ]


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("Testing Mapbox MCP Tools...")

    # Test geocoding
    print("\n1. Testing geocoding...")
    location = geocode_location("Mission District, San Francisco")
    if location:
        print(f" Geocoded: {location['place_name']}")
        print(f"  Coordinates: {location['coordinates']}")

    # Test isochrone
    print("\n2. Testing isochrone zones...")
    if location:
        isochrone = generate_isochrone_zones(location["coordinates"], [5, 10, 15], "walking")
        print(f" Generated {len(isochrone['features'])} isochrone zones")

    # Test heatmap
    print("\n3. Testing heatmap generation...")
    if location:
        heatmap = create_impact_heatmap(location["coordinates"], 0.9, 1000, 30)
        print(f" Generated heatmap with {len(heatmap['features'])} points")

    print("\n All tests completed")
