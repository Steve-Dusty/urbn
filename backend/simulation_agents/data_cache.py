"""
Data Cache - Caches expensive operations for simulation.

This cache stores:
1. Policy Analysis results (by document hash/name)
2. City Data results (by city name)
3. Map Visualization results (by policy analysis hash)

Cache Strategy:
- Since you're only using 1-2 PDFs for demo, we cache by document name
- Cache is invalidated when documents change (by checking file modification time)
- All cached data is stored in-memory for fast access

How it works:
1. First run: Fetch data from APIs → Store in cache → Return data
2. Subsequent runs: Check cache → If valid, return cached data → If invalid, fetch fresh
3. Cache key: Document name + city name (for city data) or document name (for policy analysis)
"""

import os
import hashlib
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timedelta
import json

# In-memory cache storage
_policy_analysis_cache: Dict[str, Dict[str, Any]] = {}
_city_data_cache: Dict[str, Dict[str, Any]] = {}
_map_visualization_cache: Dict[str, Dict[str, Any]] = {}

# Cache metadata (stores file modification times for invalidation)
_cache_metadata: Dict[str, Dict[str, Any]] = {}


def get_documents_dir() -> Path:
    """Get the documents directory path."""
    return Path(__file__).parent.parent / "documents"


def get_document_hash() -> str:
    """
    Generate a hash based on document names and modification times.
    This ensures cache is invalidated when documents change.
    
    Returns:
        Hash string representing current document state
    """
    documents_dir = get_documents_dir()
    if not documents_dir.exists():
        return "no_documents"
    
    files = sorted([f for f in documents_dir.glob("*") if f.is_file()])
    if not files:
        return "no_documents"
    
    # Create hash from file names and modification times
    hash_input = "|".join([
        f"{f.name}:{f.stat().st_mtime}" for f in files
    ])
    
    return hashlib.md5(hash_input.encode()).hexdigest()


def get_cache_key_for_policy_analysis() -> str:
    """Get cache key for policy analysis (based on document hash)."""
    return f"policy_analysis:{get_document_hash()}"


def get_cache_key_for_city_data(city: str) -> str:
    """Get cache key for city data (city name + document hash for context)."""
    return f"city_data:{city}:{get_document_hash()}"


def get_cache_key_for_map_visualization(policy_analysis: Dict[str, Any]) -> str:
    """Get cache key for map visualization (based on policy analysis hash)."""
    # Create hash from policy analysis content
    policy_str = json.dumps(policy_analysis, sort_keys=True)
    policy_hash = hashlib.md5(policy_str.encode()).hexdigest()
    return f"map_viz:{policy_hash}"


# ==================== Policy Analysis Cache ====================

def get_cached_policy_analysis() -> Optional[Dict[str, Any]]:
    """
    Get cached policy analysis if available and valid.
    
    Returns:
        Cached policy analysis or None if not cached/invalid
    """
    cache_key = get_cache_key_for_policy_analysis()
    
    if cache_key in _policy_analysis_cache:
        cached_data = _policy_analysis_cache[cache_key]
        
        # Check if cache is still valid (documents haven't changed)
        current_hash = get_document_hash()
        cached_hash = cached_data.get("document_hash")
        
        if cached_hash == current_hash:
            print(f"✅ Using cached policy analysis (key: {cache_key[:20]}...)")
            return cached_data.get("data")
        else:
            print(f"🔄 Policy analysis cache invalidated (documents changed)")
            # Remove invalid cache
            del _policy_analysis_cache[cache_key]
    
    return None


def cache_policy_analysis(data: Dict[str, Any]) -> None:
    """
    Cache policy analysis results.
    
    Args:
        data: Policy analysis data to cache
    """
    cache_key = get_cache_key_for_policy_analysis()
    current_hash = get_document_hash()
    
    _policy_analysis_cache[cache_key] = {
        "data": data,
        "document_hash": current_hash,
        "cached_at": datetime.now().isoformat()
    }
    
    print(f"💾 Cached policy analysis (key: {cache_key[:20]}...)")


# ==================== City Data Cache ====================

def get_cached_city_data(city: str) -> Optional[Dict[str, Any]]:
    """
    Get cached city data if available.
    
    Args:
        city: City name
    
    Returns:
        Cached city data or None if not cached
    """
    cache_key = get_cache_key_for_city_data(city)
    
    if cache_key in _city_data_cache:
        cached_data = _city_data_cache[cache_key]
        
        # City data doesn't depend on documents, so we can cache it longer
        # But we'll still check if it's recent (within 24 hours)
        cached_at = datetime.fromisoformat(cached_data.get("cached_at", datetime.now().isoformat()))
        age = datetime.now() - cached_at
        
        if age < timedelta(hours=24):
            print(f"✅ Using cached city data for {city}")
            return cached_data.get("data")
        else:
            print(f"🔄 City data cache expired for {city} (older than 24 hours)")
            del _city_data_cache[cache_key]
    
    return None


def cache_city_data(city: str, data: Dict[str, Any]) -> None:
    """
    Cache city data results.
    
    Args:
        city: City name
        data: City data to cache
    """
    cache_key = get_cache_key_for_city_data(city)
    
    _city_data_cache[cache_key] = {
        "data": data,
        "cached_at": datetime.now().isoformat()
    }
    
    print(f"💾 Cached city data for {city}")


# ==================== Map Visualization Cache ====================

def get_cached_map_visualization(policy_analysis: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Get cached map visualization if available.
    
    Args:
        policy_analysis: Policy analysis data (used to generate cache key)
    
    Returns:
        Cached map visualization or None if not cached
    """
    cache_key = get_cache_key_for_map_visualization(policy_analysis)
    
    if cache_key in _map_visualization_cache:
        cached_data = _map_visualization_cache[cache_key]
        
        # Check if policy analysis matches (by comparing hash)
        cached_policy_hash = cached_data.get("policy_hash")
        current_policy_str = json.dumps(policy_analysis, sort_keys=True)
        current_policy_hash = hashlib.md5(current_policy_str.encode()).hexdigest()
        
        if cached_policy_hash == current_policy_hash:
            print(f"✅ Using cached map visualization (key: {cache_key[:20]}...)")
            return cached_data.get("data")
        else:
            print(f"🔄 Map visualization cache invalidated (policy analysis changed)")
            del _map_visualization_cache[cache_key]
    
    return None


def cache_map_visualization(policy_analysis: Dict[str, Any], data: Dict[str, Any]) -> None:
    """
    Cache map visualization results.
    
    Args:
        policy_analysis: Policy analysis data (used to generate cache key)
        data: Map visualization data to cache
    """
    cache_key = get_cache_key_for_map_visualization(policy_analysis)
    policy_str = json.dumps(policy_analysis, sort_keys=True)
    policy_hash = hashlib.md5(policy_str.encode()).hexdigest()
    
    _map_visualization_cache[cache_key] = {
        "data": data,
        "policy_hash": policy_hash,
        "cached_at": datetime.now().isoformat()
    }
    
    print(f"💾 Cached map visualization (key: {cache_key[:20]}...)")


# ==================== Cache Management ====================

def clear_all_caches() -> None:
    """Clear all cached data."""
    global _policy_analysis_cache, _city_data_cache, _map_visualization_cache
    _policy_analysis_cache.clear()
    _city_data_cache.clear()
    _map_visualization_cache.clear()
    print("🧹 Cleared all data caches")


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Returns:
        Dictionary with cache stats
    """
    return {
        "policy_analysis": {
            "count": len(_policy_analysis_cache),
            "keys": list(_policy_analysis_cache.keys())
        },
        "city_data": {
            "count": len(_city_data_cache),
            "keys": list(_city_data_cache.keys())
        },
        "map_visualization": {
            "count": len(_map_visualization_cache),
            "keys": list(_map_visualization_cache.keys())
        }
    }


if __name__ == "__main__":
    # Test the cache
    print("Testing data cache...")
    
    # Test policy analysis cache
    test_policy = {"policy_intent": "Test policy", "target_city": "San Francisco"}
    cache_policy_analysis(test_policy)
    cached = get_cached_policy_analysis()
    print(f"Cached policy: {cached}")
    
    # Test city data cache
    test_city_data = {"city": "San Francisco", "population": 1000000}
    cache_city_data("San Francisco", test_city_data)
    cached_city = get_cached_city_data("San Francisco")
    print(f"Cached city data: {cached_city}")
    
    # Stats
    stats = get_cache_stats()
    print(f"Cache stats: {stats}")

