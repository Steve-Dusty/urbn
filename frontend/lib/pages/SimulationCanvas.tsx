'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Play, Upload, Settings, Activity, TrendingUp } from 'lucide-react';
import { EnhancedMapView } from '../components/EnhancedMapView';
import { VerticalSidebar } from '../components/VerticalSidebar';
import { simulationsApi, projectsApi, uploadApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function SimulationCanvas() {
  const params = useParams();
  const searchParams = useSearchParams();
  const simulationId = params?.simulationId as string;
  const projectId = searchParams?.get('projectId');

  const [city, setCity] = useState('San Francisco, CA');
  const [selectedPolicyDoc, setSelectedPolicyDoc] = useState('');
  const [timeHorizon, setTimeHorizon] = useState(10);
  const [analysisDepth, setAnalysisDepth] = useState<'basic' | 'detailed' | 'comprehensive'>('detailed');
  const [selectedLayers, setSelectedLayers] = useState(['traffic', 'buildings', 'housing']);

  const { messages, subscribe } = useWebSocket();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then((res) => res.data),
    enabled: !!projectId,
  });

  const { data: policyDocs } = useQuery({
    queryKey: ['policyDocs', projectId],
    queryFn: () => uploadApi.listByProject(projectId!).then((res) => res.data),
    enabled: !!projectId,
  });

  const { data: simulation } = useQuery({
    queryKey: ['simulation', simulationId],
    queryFn: () => simulationsApi.get(simulationId!).then((res) => res.data),
    enabled: !!simulationId,
  });

  useEffect(() => {
    if (simulationId) {
      subscribe(`simulation:${simulationId}`);
    }
  }, [simulationId]);

  const runSimulation = async () => {
    if (!projectId) return;

    const simulationAgent = project?.agents?.find(
      (pa: any) => pa.agent.type === 'SIMULATION'
    );

    if (!simulationAgent) {
      alert('No simulation agent assigned to this project');
      return;
    }

    const result = await simulationsApi.create({
      projectId,
      agentId: simulationAgent.agent.id,
      policyDocId: selectedPolicyDoc || undefined,
      city,
      parameters: {
        timeHorizon,
        analysisDepth,
        focusAreas: selectedLayers,
      },
    });

    // Navigate to the new simulation
    window.location.href = `/simulation/${result.data.id}`;
  };

  const toggleLayer = (layer: string) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Vertical Sidebar */}
      <VerticalSidebar />

      {/* Particles Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'drift 20s linear infinite'
        }}></div>
      </div>

      {/* Gradient Overlays */}
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-16 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
                {simulationId ? (
                  <>
                    <Activity className="w-10 h-10" />
                    Simulation Results
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-10 h-10" />
                    Policy Simulation
                  </>
                )}
              </h1>
              {project && (
                <p className="text-white/80 mt-2 text-lg tracking-wide">{project.name}</p>
              )}
            </div>
            {!simulationId && (
              <button
                onClick={runSimulation}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
                <div className="relative flex items-center gap-3 px-8 py-4 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all">
                  <Play className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-white font-bold text-lg">Run Simulation</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex">
        {/* Left Panel - Liquid Glass Configuration */}
        <div className="w-96 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/20 to-blue-600/20 backdrop-blur-3xl border-r border-white/20"></div>
          <div className="relative h-full p-8 overflow-auto">
          <div className="space-y-6">
            {/* Policy Document - Glass Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
                  📄 Policy Document
                </label>
                <select
                  value={selectedPolicyDoc}
                  onChange={(e) => setSelectedPolicyDoc(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all backdrop-blur-sm"
                  disabled={!!simulationId}
                >
                  <option value="">Select document...</option>
                  {policyDocs?.map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City - Glass Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
                  📍 City / Location
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all backdrop-blur-sm"
                  placeholder="e.g., New York, NY"
                  disabled={!!simulationId}
                />
              </div>
            </div>

            {/* Time Horizon */}
            <div>
              <label className="block text-sm font-bold text-white mb-3">
                ⏱️ Time Horizon: <span className="text-purple-400">{timeHorizon} years</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                disabled={!!simulationId}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1yr</span>
                <span>25yrs</span>
                <span>50yrs</span>
              </div>
            </div>

            {/* Analysis Depth */}
            <div>
              <label className="block text-sm font-bold text-white mb-3">
                🔬 Analysis Depth
              </label>
              <div className="space-y-2">
                {[
                  { value: 'basic', label: 'Basic', desc: 'Quick overview' },
                  { value: 'detailed', label: 'Detailed', desc: 'Recommended' },
                  { value: 'comprehensive', label: 'Comprehensive', desc: 'Full analysis' }
                ].map((depth) => (
                  <label key={depth.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    analysisDepth === depth.value
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 ring-2 ring-purple-400'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}>
                    <input
                      type="radio"
                      value={depth.value}
                      checked={analysisDepth === depth.value}
                      onChange={(e) => setAnalysisDepth(e.target.value as any)}
                      disabled={!!simulationId}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <span className="text-white font-medium">{depth.label}</span>
                      <p className="text-xs text-gray-300">{depth.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Map Layers - Colorful Glass Cards */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-orange-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-4">
                  🗺️ Data Layers
                </label>
                <div className="space-y-3">
                  {[
                    { id: 'traffic', label: 'Live Traffic', icon: '🚗', colors: ['#10b981', '#fbbf24', '#ef4444'] },
                    { id: 'buildings', label: '3D Buildings', icon: '🏢', colors: ['#8b5cf6', '#ec4899'] },
                    { id: 'housing', label: 'Housing', icon: '🏠', colors: ['#3b82f6', '#06b6d4'] },
                    { id: 'emissions', label: 'Air Quality', icon: '🌱', colors: ['#22c55e', '#84cc16'] },
                    { id: 'equity', label: 'Equity', icon: '⚖️', colors: ['#a855f7', '#ec4899'] }
                  ].map((layer) => (
                    <label 
                      key={layer.id} 
                      className={`group/item relative flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedLayers.includes(layer.id)
                          ? 'scale-105'
                          : 'hover:scale-102'
                      }`}
                    >
                      {selectedLayers.includes(layer.id) && (
                        <div 
                          className="absolute inset-0 rounded-xl blur-lg opacity-60"
                          style={{
                            background: `linear-gradient(135deg, ${layer.colors[0]}, ${layer.colors[layer.colors.length - 1]})`
                          }}
                        ></div>
                      )}
                      <div 
                        className={`relative w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selectedLayers.includes(layer.id)
                            ? 'bg-white/15 backdrop-blur-xl border-white/40'
                            : 'bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLayers.includes(layer.id)}
                          onChange={() => toggleLayer(layer.id)}
                          className="sr-only"
                        />
                        <div className="text-3xl">{layer.icon}</div>
                        <div className="flex-1">
                          <span className="text-white font-bold block">{layer.label}</span>
                          {selectedLayers.includes(layer.id) && (
                            <div className="h-1 mt-2 rounded-full overflow-hidden bg-black/40">
                              <div 
                                className="h-full rounded-full"
                                style={{
                                  background: `linear-gradient(to right, ${layer.colors.join(', ')})`,
                                  animation: 'shimmer 2s ease-in-out infinite'
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulation Status */}
            {simulation && (
              <div className={`p-4 rounded-xl border-2 ${
                simulation.status === 'COMPLETED'
                  ? 'bg-green-500/20 border-green-500'
                  : simulation.status === 'RUNNING'
                  ? 'bg-blue-500/20 border-blue-500 animate-pulse'
                  : simulation.status === 'FAILED'
                  ? 'bg-red-500/20 border-red-500'
                  : 'bg-gray-500/20 border-gray-500'
              }`}>
                <h3 className="font-bold text-white text-sm mb-2">⚡ Status</h3>
                <span className={`px-4 py-2 text-sm font-bold rounded-lg inline-block ${
                  simulation.status === 'COMPLETED'
                    ? 'bg-green-500 text-white'
                    : simulation.status === 'RUNNING'
                    ? 'bg-blue-500 text-white'
                    : simulation.status === 'FAILED'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {simulation.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center - Enhanced Map */}
        <div className="flex-1 relative">
          <EnhancedMapView
            city={city}
            layers={selectedLayers}
            simulationData={simulation?.results}
          />
        </div>

        {/* Right Panel - Colorful Glass Stream */}
        <div className="w-96 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 to-purple-600/20 backdrop-blur-3xl border-l border-white/20"></div>
          <div className="relative h-full p-8 overflow-auto">
          <div className="group relative mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl opacity-30 blur"></div>
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg uppercase tracking-wide">
                {simulationId ? 'Live Analysis' : 'Configure'}
              </h3>
            </div>
          </div>

          {simulationId && (
            <div className="space-y-6">
              {/* Live Stream - Colorful Glass */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-30 blur-lg"></div>
                <div className="relative bg-black/40 backdrop-blur-2xl rounded-2xl p-5 border border-white/20 max-h-96 overflow-auto">
                  <div className="space-y-2 font-mono text-sm">
                    {messages
                      .filter((m) => m.channel === `simulation:${simulationId}`)
                      .map((msg, i) => (
                        <div key={i}>
                          {msg.data.message && (
                            <p className="text-green-300 flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                              {msg.data.message}
                            </p>
                          )}
                          {msg.data.token && (
                            <span className="text-cyan-300">{msg.data.token}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Metrics - Vibrant Glass Cards */}
              {simulation?.metrics && (
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 rounded-2xl opacity-40 blur-lg"></div>
                  <div className="relative bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6">
                    <h4 className="font-bold text-white text-lg mb-5 flex items-center gap-3 uppercase tracking-wide">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      Impact Metrics
                    </h4>
                    <div className="space-y-4">
                      {Object.entries(simulation.metrics.changes || {}).map(([key, value]: [string, any]) => (
                        <div key={key} className="relative">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white capitalize font-semibold">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className={`font-bold text-xl ${
                              value.percentage > 0 ? 'text-green-300' : 'text-red-300'
                            }`}>
                              {value.percentage > 0 ? '+' : ''}{value.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                            <div
                              className={`h-full rounded-full shadow-lg ${
                                value.percentage > 0
                                  ? 'shadow-green-500/50'
                                  : 'shadow-red-500/50'
                              }`}
                              style={{ 
                                width: `${Math.abs(value.percentage)}%`,
                                background: value.percentage > 0
                                  ? 'linear-gradient(to right, #10b981, #34d399, #6ee7b7)'
                                  : 'linear-gradient(to right, #ef4444, #f87171, #fca5a5)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!simulationId && (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl opacity-30 blur-xl"></div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-2xl shadow-purple-500/50">
                  🚀
                </div>
                <p className="text-white text-lg font-medium">
                  Configure simulation
                  <br />
                  <span className="text-white/60">and click Run!</span>
                </p>
              </div>
            </div>
          )}
          </div>
          </div>
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative">
          <EnhancedMapView
            city={city}
            layers={selectedLayers}
            simulationData={simulation?.results}
          />
        </div>

        {/* Right Panel - Colorful Glass Stream */}
        <div className="w-96 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 to-purple-600/20 backdrop-blur-3xl border-l border-white/20"></div>
          <div className="relative h-full p-8 overflow-auto">
          <div className="group relative mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl opacity-30 blur"></div>
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg uppercase tracking-wide">
                {simulationId ? 'Live Analysis' : 'Configure'}
              </h3>
            </div>
          </div>

          {simulationId && (
            <div className="space-y-6">
              {/* Live Stream - Colorful Glass */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-30 blur-lg"></div>
                <div className="relative bg-black/40 backdrop-blur-2xl rounded-2xl p-5 border border-white/20 max-h-96 overflow-auto">
                  <div className="space-y-2 font-mono text-sm">
                    {messages
                      .filter((m) => m.channel === `simulation:${simulationId}`)
                      .map((msg, i) => (
                        <div key={i}>
                          {msg.data.message && (
                            <p className="text-green-300 flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                              {msg.data.message}
                            </p>
                          )}
                          {msg.data.token && (
                            <span className="text-cyan-300">{msg.data.token}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Metrics - Vibrant Glass Cards */}
              {simulation?.metrics && (
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 rounded-2xl opacity-40 blur-lg"></div>
                  <div className="relative bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6">
                    <h4 className="font-bold text-white text-lg mb-5 flex items-center gap-3 uppercase tracking-wide">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      Impact Metrics
                    </h4>
                    <div className="space-y-4">
                      {Object.entries(simulation.metrics.changes || {}).map(([key, value]: [string, any]) => (
                        <div key={key} className="relative">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white capitalize font-semibold">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className={`font-bold text-xl ${
                              value.percentage > 0 ? 'text-green-300' : 'text-red-300'
                            }`}>
                              {value.percentage > 0 ? '+' : ''}{value.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                            <div
                              className={`h-full rounded-full shadow-lg ${
                                value.percentage > 0
                                  ? 'shadow-green-500/50'
                                  : 'shadow-red-500/50'
                              }`}
                              style={{ 
                                width: `${Math.abs(value.percentage)}%`,
                                background: value.percentage > 0
                                  ? 'linear-gradient(to right, #10b981, #34d399, #6ee7b7)'
                                  : 'linear-gradient(to right, #ef4444, #f87171, #fca5a5)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!simulationId && (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl opacity-30 blur-xl"></div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-2xl shadow-purple-500/50">
                  🚀
                </div>
                <p className="text-white text-lg font-medium">
                  Configure simulation
                  <br />
                  <span className="text-white/60">and click Run!</span>
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}


