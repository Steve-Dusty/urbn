"""
Custom Agent Creator - Create and chat with custom agents.

Each agent has:
- name: The agent's name (e.g., "News Reporter")
- description: What the agent does (e.g., "talks about policies like a news reporter")

When chatting with an agent:
- Agent receives the parsed document context
- Agent receives its name and description (defines its persona/role)
- Agent chats with that specific persona
"""

import os
from dotenv import load_dotenv
from typing import Generator, Dict, List, Optional
import google.generativeai as genai
from .document_manager import get_parsed_context, get_uploaded_files
import uuid
from datetime import datetime

load_dotenv()

# Configure API key
API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

# In-memory storage for agents (key: agent_id, value: agent dict)
_agents: Dict[str, Dict] = {}

# Chat histories per agent (key: (agent_id, session_id), value: list of messages)
_chat_histories: Dict[tuple, List] = {}


def create_agent(name: str, description: str) -> Dict:
    """
    Create a new custom agent.
    
    Args:
        name: The agent's name (e.g., "News Reporter")
        description: What the agent does (e.g., "talks about policies like a news reporter")
    
    Returns:
        Dict with agent info: {id, name, description, created_at}
    """
    agent_id = str(uuid.uuid4())
    
    agent = {
        "id": agent_id,
        "name": name,
        "description": description,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    _agents[agent_id] = agent
    
    print(f"\n{'='*60}")
    print(f"✅ AGENT CREATED: {name}")
    print(f"ID: {agent_id}")
    print(f"Description: {description}")
    print(f"{'='*60}\n")
    
    return agent


def get_agent(agent_id: str) -> Optional[Dict]:
    """Get an agent by ID."""
    return _agents.get(agent_id)


def list_agents() -> List[Dict]:
    """List all agents."""
    return list(_agents.values())


def delete_agent(agent_id: str) -> bool:
    """Delete an agent."""
    if agent_id in _agents:
        del _agents[agent_id]
        # Also clear chat histories for this agent
        keys_to_delete = [key for key in _chat_histories.keys() if key[0] == agent_id]
        for key in keys_to_delete:
            del _chat_histories[key]
        print(f"🗑️  Deleted agent: {agent_id}")
        return True
    return False


def chat_with_agent(
    agent_id: str,
    message: str,
    session_id: str = "default"
) -> Generator[str, None, None]:
    """
    Chat with a custom agent.
    
    The agent will:
    1. Receive the parsed document context
    2. Use its name and description as its persona/role
    3. Chat with that specific persona
    
    Args:
        agent_id: The agent's ID
        message: User's message
        session_id: Chat session identifier
    
    Yields:
        Response chunks for streaming
    """
    # Get agent
    agent = get_agent(agent_id)
    if not agent:
        yield f"Error: Agent with ID {agent_id} not found."
        return
    
    agent_name = agent["name"]
    agent_description = agent["description"]
    
    print(f"\n{'='*60}")
    print(f"💬 CHAT WITH AGENT: {agent_name}")
    print(f"Agent ID: {agent_id}")
    print(f"Session: {session_id}")
    print(f"Message: {message}")
    print(f"{'='*60}\n")
    
    # Get parsed context from document manager
    parsed_context = get_parsed_context()
    
    # Get uploaded files for full context
    uploaded_files = get_uploaded_files()
    
    if not parsed_context and not uploaded_files:
        yield "No documents uploaded yet. Please upload a PDF first to provide context for the agent."
        return
    
    # Initialize chat history if needed
    history_key = (agent_id, session_id)
    if history_key not in _chat_histories:
        _chat_histories[history_key] = []
        print(f"✓ Created new chat session: {session_id} for agent: {agent_name}")
    
    # Create model
    model = genai.GenerativeModel("models/gemini-2.0-flash")
    
    # Build system prompt with agent persona and document context
    system_prompt = f"""You are {agent_name}.

Your role and persona: {agent_description}

IMPORTANT: You have access to the FULL content of ALL uploaded policy documents. The complete document content is provided below. You have complete access to everything. NEVER ask "which document" or say you need more information - you have ALL the information already.

DOCUMENT CONTENT:
{parsed_context if parsed_context else "Documents are being analyzed..."}

Your instructions:
- Respond as {agent_name} would respond, following your persona: {agent_description}
- Use the document content above to inform your responses
- Reference specific data points, locations, and policy details from the documents
- Stay in character as {agent_name}
- Be direct and informative - you have all the information you need
- NEVER say you need more information or ask which document. Just answer based on the full content provided above.

Remember: You are {agent_name}, and your role is: {agent_description}"""
    
    # Build messages with history
    messages = []
    
    # Add system context (first time only)
    if not _chat_histories[history_key]:
        messages.append({"role": "user", "parts": [system_prompt]})
        messages.append({
            "role": "model",
            "parts": [f"I understand. I am {agent_name}, and I will respond as: {agent_description}. I have access to all the policy documents. How can I help you?"]
        })
    
    # Add chat history
    for msg in _chat_histories[history_key]:
        messages.append({"role": msg["role"], "parts": [msg["content"]]})
    
    # Add current user message
    messages.append({"role": "user", "parts": [message]})
    
    try:
        print(f"🔄 Generating response as {agent_name} with {len(uploaded_files)} document(s)...")
        
        # Create chat with history
        chat = model.start_chat(history=messages[:-1])  # All except last message
        
        # Send message with streaming - INCLUDE THE ACTUAL FILES for full context
        # This gives Gemini access to the complete document content
        if uploaded_files:
            message_parts = [*uploaded_files, message]
        else:
            message_parts = [message]
        
        response = chat.send_message(message_parts, stream=True)
        
        # Stream the response
        full_response = ""
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                print(chunk.text, end='', flush=True)
                yield chunk.text
        
        # Save to history
        _chat_histories[history_key].append({"role": "user", "content": message})
        _chat_histories[history_key].append({"role": "model", "content": full_response})
        
        print("\n\n✅ Response completed")
    
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        print(f"\n❌ {error_msg}")
        yield error_msg


def clear_chat(agent_id: str, session_id: str = "default"):
    """Clear chat history for an agent session."""
    history_key = (agent_id, session_id)
    if history_key in _chat_histories:
        del _chat_histories[history_key]
        print(f"✓ Cleared chat session: {session_id} for agent: {agent_id}")
        return True
    return False


def get_chat_history(agent_id: str, session_id: str = "default") -> List[Dict]:
    """Get chat history for an agent session."""
    history_key = (agent_id, session_id)
    return _chat_histories.get(history_key, [])


if __name__ == "__main__":
    # Test
    print("Testing agent creator...")
    
    # Create a test agent
    agent = create_agent(
        name="News Reporter",
        description="talks about policies like a news reporter, using journalistic language and focusing on public impact"
    )
    
    print(f"\nCreated agent: {agent}")
    print(f"\nAll agents: {list_agents()}")
    
    # Test chat (requires documents to be uploaded first)
    # for chunk in chat_with_agent(agent["id"], "What are the main points of the policy?"):
    #     pass

