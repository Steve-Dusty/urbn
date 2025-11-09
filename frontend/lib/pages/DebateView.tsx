'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Play, MessageSquare } from 'lucide-react';
import { VerticalSidebar } from '../components/VerticalSidebar';
import { debatesApi, simulationsApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function DebateView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const debateId = params?.debateId as string;
  const simulationId = searchParams?.get('simulationId');

  const [rounds, setRounds] = useState(3);
  const [filter, setFilter] = useState<string>('all');

  const { messages, subscribe } = useWebSocket();

  const { data: simulation } = useQuery({
    queryKey: ['simulation', simulationId],
    queryFn: () => simulationsApi.get(simulationId!).then((res) => res.data),
    enabled: !!simulationId,
  });

  const { data: debate } = useQuery({
    queryKey: ['debate', debateId],
    queryFn: () => debatesApi.get(debateId!).then((res) => res.data),
    enabled: !!debateId,
  });

  useEffect(() => {
    if (debateId) {
      subscribe(`debate:${debateId}`);
    }
  }, [debateId]);

  const startDebate = async () => {
    if (!simulationId || !simulation) return;

    const debateAgent = await debatesApi.list(simulationId).then((res) => res.data[0]);
    
    const result = await debatesApi.create({
      simulationId,
      agentId: debateAgent?.agentId || simulation.agentId,
      rounds,
    });

    window.location.href = `/debate/${result.data.id}`;
  };

  const debateMessages = debate?.arguments?.messages || [];
  const filteredMessages = filter === 'all' 
    ? debateMessages 
    : debateMessages.filter((m: any) => m.side === filter);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Vertical Sidebar */}
      <VerticalSidebar />

      {/* Particles Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}></div>
      </div>

      {/* Gradient Overlays */}
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-orange-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-pink-600/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-16 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
              <MessageSquare className="w-10 h-10" />
              Policy Debate
            </h1>
            {simulation && (
              <p className="text-white/80 mt-2 text-lg tracking-wide">
                {simulation.city}
              </p>
            )}
          </div>
          {!debateId && (
            <button
              onClick={startDebate}
              className="group relative"
              disabled={!simulationId}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
              <div className="relative flex items-center gap-3 px-8 py-4 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all disabled:opacity-50">
                <Play className="w-6 h-6 text-white" />
                <span className="text-white font-bold text-lg">Start Debate</span>
              </div>
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex">
        {/* Left Panel - Configuration */}
        <div className="w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-white/10 p-6 overflow-auto">
          <div className="space-y-6">
            {!debateId && (
              <>
                <div>
                  <label className="block text-sm font-bold text-white mb-3">
                    🔢 Number of Rounds
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  />
                </div>

                <div className="p-4 bg-blue-600/20 backdrop-blur-lg rounded-xl border border-blue-400/30">
                  <h3 className="font-bold text-sm text-white mb-2">
                    💡 How It Works
                  </h3>
                  <p className="text-xs text-blue-100">
                    Two AI agents will debate the policy from opposing perspectives:
                    one arguing FOR (development, growth) and one AGAINST (environment, community).
                  </p>
                </div>
              </>
            )}

            {debate && (
              <>
                <div>
                  <label className="block text-sm font-bold text-white mb-3">
                    🔍 Filter Arguments
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  >
                    <option value="all">All Arguments</option>
                    <option value="pro">Pro Only</option>
                    <option value="con">Con Only</option>
                  </select>
                </div>

                {debate.riskScores && (
                  <div className="p-4 bg-slate-700/50 backdrop-blur-lg rounded-xl border border-white/10">
                    <h3 className="font-bold text-white text-sm mb-3">⚠️ Risk Assessment</h3>
                    <div className="space-y-2">
                      {Object.entries(debate.riskScores).map(([key, value]: [string, any]) => (
                        typeof value === 'number' && (
                          <div key={key}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="capitalize text-gray-200">{key}</span>
                              <span className="text-white font-bold">{(value * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  value > 0.7 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                  value > 0.4 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                                style={{ width: `${value * 100}%` }}
                              />
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {debate.riskScores?.concerns && (
                  <div className="p-4 bg-red-600/20 backdrop-blur-lg rounded-xl border border-red-400/30">
                    <h3 className="font-bold text-sm text-white mb-2">
                      ⚠️ Key Concerns
                    </h3>
                    <ul className="space-y-1">
                      {debate.riskScores.concerns.slice(0, 3).map((concern: string, i: number) => (
                        <li key={i} className="text-xs text-red-100">• {concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Center - Debate Messages */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900">
          <div className="max-w-4xl mx-auto space-y-6">
            {filteredMessages.map((msg: any, i: number) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border-2 shadow-xl ${
                  msg.side === 'pro'
                    ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-lg border-green-400/50'
                    : 'bg-gradient-to-br from-red-600/20 to-orange-600/20 backdrop-blur-lg border-red-400/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    msg.side === 'pro'
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                      : 'bg-gradient-to-br from-red-500 to-orange-500'
                  }`}>
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className={`font-bold text-lg ${
                      msg.side === 'pro' ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {msg.side === 'pro' ? 'PRO' : 'CON'}
                    </span>
                    <p className="text-xs text-gray-400">Round {msg.round}</p>
                  </div>
                </div>
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            ))}

            {/* Live streaming messages */}
            {messages
              .filter((m) => m.channel === `debate:${debateId}`)
              .map((msg, i) => (
                <div key={`stream-${i}`} className="text-sm text-blue-300 font-mono">
                  {msg.data.token && <span>{msg.data.token}</span>}
                </div>
              ))}

            {filteredMessages.length === 0 && !debateId && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <p className="text-gray-300 text-lg">
                  Select a simulation and click "Start Debate" to begin
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Summary */}
        <div className="w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-white/10 p-6 overflow-auto">
          <h3 className="font-bold text-white text-xl mb-4">📊 Summary</h3>

          {debate?.sentiment && (
            <div className="space-y-4">
              <div className="p-4 bg-green-600/20 backdrop-blur-lg rounded-xl border border-green-400/30">
                <h4 className="font-bold text-white text-sm mb-3">✅ Pro Position</h4>
                <div className="text-xs space-y-2">
                  <p className="text-gray-200"><span className="text-gray-400">Tone:</span> <span className="font-bold">{debate.sentiment.pro?.tone}</span></p>
                  <p className="text-gray-200">
                    <span className="text-gray-400">Confidence:</span> <span className="font-bold">{((debate.sentiment.pro?.confidence || 0) * 100).toFixed(0)}%</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {debate.sentiment.pro?.themes?.map((theme: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-600/20 backdrop-blur-lg rounded-xl border border-red-400/30">
                <h4 className="font-bold text-white text-sm mb-3">❌ Con Position</h4>
                <div className="text-xs space-y-2">
                  <p className="text-gray-200"><span className="text-gray-400">Tone:</span> <span className="font-bold">{debate.sentiment.con?.tone}</span></p>
                  <p className="text-gray-200">
                    <span className="text-gray-400">Confidence:</span> <span className="font-bold">{((debate.sentiment.con?.confidence || 0) * 100).toFixed(0)}%</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {debate.sentiment.con?.themes?.map((theme: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


