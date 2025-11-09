import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Zap } from 'lucide-react';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { agentsService } from '../services/storage';

export function AgentsDashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await agentsService.list();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (agentData: any) => {
    try {
      const newAgent = await agentsService.create(agentData);
      setAgents([...agents, newAgent]);
      setShowAgentModal(false);
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent');
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'SIMULATION': return '🔬';
      case 'DEBATE': return '💬';
      case 'AGGREGATOR': return '📄';
      case 'SUPERVISOR': return '🎯';
      case 'PROPAGANDA': return '📢';
      default: return '🤖';
    }
  };

  const getAgentGradient = (type: string) => {
    switch (type) {
      case 'SIMULATION': return 'from-green-600 to-emerald-600';
      case 'DEBATE': return 'from-orange-600 to-red-600';
      case 'AGGREGATOR': return 'from-purple-600 to-pink-600';
      case 'SUPERVISOR': return 'from-blue-600 to-cyan-600';
      case 'PROPAGANDA': return 'from-pink-600 to-rose-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="relative min-h-screen bg-black">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="flex items-center gap-3 text-white/80 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>

            <button
              onClick={() => setShowAgentModal(true)}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3">
                <Plus className="w-6 h-6" />
                Create New Agent
              </div>
            </button>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-6xl font-black text-white mb-6">AI Agents</h1>
            <p className="text-2xl text-white/60">Create and manage intelligent policy agents</p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="relative z-10 px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          {agents.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/50">
                <Zap className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">No Agents Yet</h2>
              <p className="text-xl text-white/60 mb-8">
                Create your first AI agent to get started
              </p>
              <button
                onClick={() => setShowAgentModal(true)}
                className="group relative inline-block"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3">
                  <Plus className="w-6 h-6" />
                  Create Your First Agent
                </div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group relative"
                >
                  <div className={`absolute -inset-1 rounded-3xl blur-xl opacity-0 group-hover:opacity-75 transition ${
                    agent.type === 'SIMULATION' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                    agent.type === 'DEBATE' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                    agent.type === 'AGGREGATOR' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                    agent.type === 'SUPERVISOR' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' :
                    'bg-gradient-to-r from-pink-600 to-rose-600'
                  }`}></div>
                  <div className="relative bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:border-white/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${
                        agent.type === 'SIMULATION' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                        agent.type === 'DEBATE' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                        agent.type === 'AGGREGATOR' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                        agent.type === 'SUPERVISOR' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                        'bg-gradient-to-br from-pink-500 to-rose-500'
                      }`}>
                        {getAgentIcon(agent.type)}
                      </div>
                      <span className={`px-4 py-2 text-sm font-bold rounded-full ${
                        agent.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{agent.name}</h3>
                    <p className="text-white/60 mb-4">{agent.role}</p>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm font-medium">
                        {agent.type}
                      </span>
                      <span className="text-white/50 text-sm">
                        {agent._count?.simulations || 0} runs
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {showAgentModal && (
        <CreateAgentModal
          onClose={() => setShowAgentModal(false)}
          onSuccess={handleCreateAgent}
        />
      )}
    </div>
  );
}

