"""
Simple in-memory cache for simulation data.
Persists simulation state across requests without database complexity.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import json

# In-memory cache storage
_simulation_cache: Dict[str, Dict[str, Any]] = {}


def save_simulation_state(session_id: str, state: Dict[str, Any]) -> None:
    """
    Save simulation state to in-memory cache.
    
    Args:
        session_id: Unique session identifier
        state: State data to save
    """
    _simulation_cache[session_id] = {
        **state,
        "updated_at": datetime.now().isoformat()
    }
    print(f"💾 Saved simulation state for session: {session_id}")


def get_simulation_state(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Get simulation state from cache.
    
    Args:
        session_id: Unique session identifier
    
    Returns:
        State data or None if not found
    """
    state = _simulation_cache.get(session_id)
    if state:
        print(f"📂 Retrieved simulation state for session: {session_id}")
    return state


def update_simulation_state(session_id: str, updates: Dict[str, Any]) -> None:
    """
    Update specific fields in simulation state.
    
    Args:
        session_id: Unique session identifier
        updates: Fields to update
    """
    if session_id in _simulation_cache:
        _simulation_cache[session_id].update(updates)
        _simulation_cache[session_id]["updated_at"] = datetime.now().isoformat()
        print(f"🔄 Updated simulation state for session: {session_id}")
    else:
        # Create new state if doesn't exist
        save_simulation_state(session_id, updates)


def delete_simulation_state(session_id: str) -> None:
    """
    Delete simulation state from cache.
    
    Args:
        session_id: Unique session identifier
    """
    if session_id in _simulation_cache:
        del _simulation_cache[session_id]
        print(f"🗑️  Deleted simulation state for session: {session_id}")


def list_all_sessions() -> list[str]:
    """
    List all session IDs in cache.
    
    Returns:
        List of session IDs
    """
    return list(_simulation_cache.keys())


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Returns:
        Dictionary with cache stats
    """
    return {
        "total_sessions": len(_simulation_cache),
        "sessions": list(_simulation_cache.keys())
    }


def clear_all_cache() -> None:
    """
    Clear all cached simulation states.
    """
    _simulation_cache.clear()
    print("🧹 Cleared all simulation cache")


if __name__ == "__main__":
    # Test the cache
    print("Testing simulation cache...")
    
    # Save state
    save_simulation_state("test_session", {
        "city": "San Francisco",
        "policy_doc": "test.pdf",
        "metrics": {"population": 1000000}
    })
    
    # Retrieve state
    state = get_simulation_state("test_session")
    print(f"Retrieved state: {state}")
    
    # Update state
    update_simulation_state("test_session", {"metrics": {"population": 1000001}})
    
    # Get updated state
    updated_state = get_simulation_state("test_session")
    print(f"Updated state: {updated_state}")
    
    # Stats
    stats = get_cache_stats()
    print(f"Cache stats: {stats}")

