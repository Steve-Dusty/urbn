'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { agentsService } from '../services/storage';

export function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.agentId as string;
  
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agent
  useEffect(() => {
    if (agentId) {
      loadAgent();
    }
  }, [agentId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgent = async () => {
    try {
      setLoadingAgent(true);
      const agentData = await agentsService.get(agentId);
      if (!agentData) {
        alert('Agent not found');
        router.push('/agents');
        return;
      }
      setAgent(agentData);
      
      // Add welcome message
      setMessages([{
        role: 'assistant',
        content: `👋 Hi! I'm ${agentData.name}. ${agentData.description}\n\nI have access to all the policy documents you've uploaded. How can I help you today?`
      }]);
    } catch (error) {
      console.error('Error loading agent:', error);
      alert('Failed to load agent');
      router.push('/agents');
    } finally {
      setLoadingAgent(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Stream response from agent (through Next.js API route)
      const response = await fetch(`/api?endpoint=agents&path=${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: 'default'
        })
      });

      if (!response.ok) {
        throw new Error('Chat failed');
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      // Add assistant message placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      let assistantMessage = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
              if (data.chunk) {
                assistantMessage += data.chunk;
                // Update the last message in real-time
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = assistantMessage;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing chat data:', e, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again!'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear all chat messages?')) {
      setMessages([{
        role: 'assistant',
        content: `👋 Hi! I'm ${agent?.name}. ${agent?.description}\n\nI have access to all the policy documents you've uploaded. How can I help you today?`
      }]);
    }
  };

  if (loadingAgent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading agent...</div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/agents')}
              className="text-white/60 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <p className="text-sm text-white/60">{agent.description}</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="text-white/60 hover:text-white transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Messages - Scrollable container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 min-h-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={handleSend} className="flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${agent.name}...`}
              className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

