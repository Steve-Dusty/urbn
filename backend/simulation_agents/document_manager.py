"""
Document Manager - Single source of truth for all document processing.

This module handles:
1. Uploading documents to Gemini (once)
2. Caching uploaded files
3. Providing access to parser_agent and chat_agent
4. NO DUPLICATION!
"""

import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, List

load_dotenv()

# Configure Google GenAI
API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

# Global storage for uploaded files (shared across all agents)
_uploaded_files: Dict[str, any] = {}
_parsed_context: Dict[str, str] = {}


def get_documents_dir() -> Path:
    """Get the documents directory path."""
    return Path(__file__).parent.parent / "documents"


def upload_documents_to_gemini(force_refresh: bool = False) -> List[any]:
    """
    Upload all documents to Gemini and cache them.

    Args:
        force_refresh: If True, re-upload even if cached

    Returns:
        List of uploaded Gemini file objects
    """
    global _uploaded_files

    documents_dir = get_documents_dir()

    if not documents_dir.exists():
        print("⚠️  Documents directory does not exist")
        return []

    files = [f for f in documents_dir.glob("*") if f.is_file()]

    if not files:
        print("⚠️  No documents found")
        return []

    print(f"\n{'='*60}")
    print(f"📚 DOCUMENT MANAGER: Processing {len(files)} document(s)")
    print(f"{'='*60}\n")

    uploaded = []

    for file_path in files:
        file_key = str(file_path)

        # Use cached version unless force refresh
        if file_key in _uploaded_files and not force_refresh:
            print(f"✓ Using cached: {file_path.name}")
            uploaded.append(_uploaded_files[file_key])
            continue

        try:
            print(f"⬆️  Uploading: {file_path.name}")
            uploaded_file = genai.upload_file(str(file_path))
            _uploaded_files[file_key] = uploaded_file
            uploaded.append(uploaded_file)
            print(f"✅ Uploaded: {file_path.name} -> {uploaded_file.uri}")

        except Exception as e:
            print(f"❌ Error uploading {file_path.name}: {e}")

    print(f"\n✓ Total uploaded files: {len(uploaded)}")
    print(f"{'='*60}\n")

    return uploaded


def get_uploaded_files() -> List[any]:
    """Get all uploaded files (uploads if not cached)."""
    if not _uploaded_files:
        return upload_documents_to_gemini()
    return list(_uploaded_files.values())


def set_parsed_context(file_name: str, context: str):
    """Store parsed context from parser_agent."""
    global _parsed_context
    _parsed_context[file_name] = context
    print(f"💾 Stored parsed context for: {file_name}")


def get_parsed_context() -> str:
    """Get all parsed context as a single string."""
    if not _parsed_context:
        return ""

    return "\n\n".join([
        f"=== {name} ===\n{content}"
        for name, content in _parsed_context.items()
    ])


def get_all_context() -> str:
    """
    Get comprehensive context combining:
    - Parsed structured data from parser_agent
    - Raw uploaded files available for Gemini
    """
    parsed = get_parsed_context()

    if not parsed:
        return "No parsed context available. Upload documents first."

    return parsed


def refresh_all():
    """Force refresh all documents and clear cache."""
    global _uploaded_files, _parsed_context
    _uploaded_files.clear()
    _parsed_context.clear()
    print("🔄 Cleared all caches")
    return upload_documents_to_gemini(force_refresh=True)


def get_document_stats() -> dict:
    """Get statistics about uploaded documents."""
    return {
        "uploaded_count": len(_uploaded_files),
        "parsed_count": len(_parsed_context),
        "uploaded_files": list(_uploaded_files.keys()),
        "parsed_files": list(_parsed_context.keys())
    }


if __name__ == "__main__":
    # Test the document manager
    print("Testing Document Manager...")

    files = upload_documents_to_gemini()
    print(f"\nUploaded {len(files)} files")

    stats = get_document_stats()
    print(f"\nStats: {stats}")
