"""
Chat Agent - Conversational interface with policy documents.

Uses document_manager to access:
1. Uploaded Gemini files (for native multimodal chat)
2. Parsed context from parser_agent (structured data)

NO PyPDFLoader - everything goes through document_manager!
"""

import os
from dotenv import load_dotenv
from typing import Generator
import google.generativeai as genai
from .document_manager import get_uploaded_files, get_parsed_context, upload_documents_to_gemini

load_dotenv()

# Configure API key
API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

# Store chat histories
chat_histories = {}


def chat_with_documents(message: str, session_id: str = "default") -> Generator[str, None, None]:
    """
    Chat with documents using Gemini's multimodal capabilities + parsed context.

    Args:
        message: User's question
        session_id: Chat session identifier

    Yields:
        Response chunks for streaming
    """
    global chat_histories

    print(f"\n{'='*60}")
    print(f"💬 CHAT AGENT: Processing message")
    print(f"Session: {session_id}")
    print(f"Message: {message}")
    print(f"{'='*60}\n")

    # Get uploaded files from document manager
    uploaded_files = get_uploaded_files()

    if not uploaded_files:
        yield "No documents uploaded yet. Please upload a PDF first."
        return

    # Get parsed context from parser agent
    parsed_context = get_parsed_context()

    # If no parsed context, run parser first!
    if not parsed_context:
        print("⚠️  No parsed context found - running parser agent first...")
        from .parser_agent import parse_documents
        parse_documents()
        parsed_context = get_parsed_context()
        print("✓ Parser completed, context loaded")

    # Initialize chat history if needed
    if session_id not in chat_histories:
        chat_histories[session_id] = []
        print(f"✓ Created new chat session: {session_id}")

    # Create model with chat history
    model = genai.GenerativeModel("models/gemini-2.0-flash")

    # Build the prompt with parsed context
    system_prompt = f"""You are a helpful AI assistant for urban policy simulation and analysis.

IMPORTANT: The FULL content of ALL uploaded policy documents is provided below. You have complete access to everything. NEVER ask "which document" or say you need more information - you have ALL the information already.

DOCUMENT CONTENT:
{parsed_context if parsed_context else "Documents are being analyzed..."}

Your role:
- Directly answer questions about the documents using the content above
- Explain policy implications
- Help with urban planning simulations
- Reference specific data points and locations
- Be direct and informative - you have all the information you need

NEVER say you need more information or ask which document. Just answer the question based on the full content provided above."""

    # Build messages with history
    messages = []

    # Add system context
    messages.append({"role": "user", "parts": [system_prompt]})
    messages.append({"role": "model", "parts": ["I understand. I'll help you analyze these policy documents for urban planning simulation. What would you like to know?"]})

    # Add chat history
    for msg in chat_histories[session_id]:
        messages.append({"role": msg["role"], "parts": [msg["content"]]})

    # Add current user message
    messages.append({"role": "user", "parts": [message]})

    try:
        print(f"🔄 Generating response with {len(uploaded_files)} document(s)...")

        # Create chat with history
        chat = model.start_chat(history=messages[:-1])  # All except last message

        # Send message with streaming - INCLUDE THE ACTUAL FILES for full context
        # This gives Gemini access to the complete document content
        message_parts = [*uploaded_files, message]
        response = chat.send_message(message_parts, stream=True)

        # Stream the response
        full_response = ""
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                print(chunk.text, end='', flush=True)
                yield chunk.text

        # Save to history
        chat_histories[session_id].append({"role": "user", "content": message})
        chat_histories[session_id].append({"role": "model", "content": full_response})

        print("\n\n✅ Response completed")

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        print(f"\n❌ {error_msg}")
        yield error_msg


def refresh_documents():
    """Force refresh of document context."""
    from .document_manager import refresh_all
    refresh_all()
    print("✓ Documents refreshed")


def clear_chat(session_id: str = "default"):
    """Clear a chat session."""
    if session_id in chat_histories:
        del chat_histories[session_id]
        print(f"✓ Cleared chat session: {session_id}")
        return True
    return False


if __name__ == "__main__":
    # Test
    print("Testing chat agent...")
    for chunk in chat_with_documents("Summarize the main points of the documents"):
        pass  # Already printed in function
