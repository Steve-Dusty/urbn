import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Upload, MapPin, Send, Users, Building2, Car, TrendingUp, Zap, Map as MapIcon, X, FileText } from 'lucide-react';
import { DynamicSimulationMap } from '../components/DynamicSimulationMap';
import { useWebSocket } from '../hooks/useWebSocket';
import { simulationsService, policyDocsService } from '../services/storage';

export function SimulationsPage() {
  const [city, setCity] = useState('San Francisco, CA');
  const [runningSimulation, setRunningSimulation] = useState<string | null>(null);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [uploadedPolicyDoc, setUploadedPolicyDoc] = useState<File | null>(null);
  
  // Left Modal State
  const [simulationFocus, setSimulationFocus] = useState('Urban Traffic');
  const [perspectiveMode, setPerspectiveMode] = useState<'Macro' | 'Micro'>('Macro');
  const [population] = useState(850000);
  const [is3D, setIs3D] = useState(true);
  const [showAgentStream, setShowAgentStream] = useState(false); // Collapsed by default
  const [showPolicyAnalysis, setShowPolicyAnalysis] = useState(false); // Modal closed by default
  const [showChat, setShowChat] = useState(false); // Chat closed by default

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I can help you visualize policy impacts on the map. Try asking:\n\n• \"Show me traffic on King Street\"\n• \"Add 500 housing units in Mission District\"\n• \"Demolish Salesforce Tower\"\n• \"What happens if we remove parking on 16th St?\"\n• \"Highlight the Tenderloin area\""
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const { messages } = useWebSocket();

  // Listen to WebSocket messages and update simulation results
  useEffect(() => {
    if (!runningSimulation) return;

    const simMessages = messages.filter(
      (m) => m.channel === `simulation:${runningSimulation}`
    );

    if (simMessages.length > 0) {
      const latestMessage = simMessages[simMessages.length - 1];
      
      if (latestMessage.data.results) {
        setSimulationResults(latestMessage.data.results);
      }
      
      if (latestMessage.data.type === 'completed' || latestMessage.data.status === 'completed') {
        if (latestMessage.data.results) {
          setSimulationResults({
            ...latestMessage.data.results,
            metrics: latestMessage.data.metrics || latestMessage.data.results.metrics
          });
        }
        
        setTimeout(() => {
          setRunningSimulation(null);
          alert('✅ Simulation completed! Check the map for visual changes!');
        }, 2000);
      }
    }
  }, [messages, runningSimulation]);


  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      // Parse command and trigger map action
      const lowerInput = userMessage.toLowerCase();
      let mapAction: any = null;
      let response = '';

      if (lowerInput.includes('traffic') || lowerInput.includes('congestion')) {
        response = `🚗 Analyzing traffic patterns...`;
        mapAction = { type: 'highlight-roads', target: 'traffic' };
      } else if (lowerInput.includes('housing') || lowerInput.includes('units')) {
        const units = userMessage.match(/\d+/)?.[0] || '500';
        response = `🏠 Adding ${units} housing units to the simulation...`;
        mapAction = { type: 'add-housing', units: parseInt(units), location: city };
      } else if (lowerInput.includes('demolish') || lowerInput.includes('destroy')) {
        response = `💥 Preparing demolition visualization...`;
        mapAction = { type: 'demolish-specific', target: 'Salesforce Tower' };
      } else if (lowerInput.includes('heatmap')) {
        response = `🔥 Generating impact heatmap...`;
        mapAction = { type: 'show-heatmap' };
      } else {
        response = `🤔 I can help you explore policy impacts! Try asking about traffic, housing, demolitions, or heatmaps.`;
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: response, mapAction }]);
      
      if (mapAction) {
        handleMapCommand(mapAction);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again!'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleMapCommand = (command: any) => {
    console.log('🗺️ Map command received:', command);
    
    const instantUpdate: any = {
      metrics: {
        changes: {}
      }
    };

    switch (command.type) {
      case 'add-housing':
        instantUpdate.metrics.changes.housingAffordability = {
          percentage: command.impact || 15,
          description: `Adding ${command.units} units in ${command.location}`
        };
        instantUpdate.chatCommand = command;
        break;
      
      case 'highlight-roads':
        instantUpdate.metrics.changes.trafficFlow = {
          percentage: 10,
          description: `Analyzing ${command.target}`
        };
        instantUpdate.chatCommand = command;
        break;
      
      case 'highlight-area':
        instantUpdate.metrics.changes.focus = {
          percentage: 100,
          description: `Highlighting ${command.location}`
        };
        instantUpdate.chatCommand = command;
        break;
      
      case 'show-heatmap':
        if (simulationResults) {
          setSimulationResults({...simulationResults});
        }
        return;
      
      case 'demolish-specific':
        instantUpdate.metrics.changes.demolition = {
          percentage: -100,
          description: `Demolishing ${command.target}`
        };
        instantUpdate.triggerDemolition = true;
        instantUpdate.chatCommand = command;
        break;
      
      default:
        instantUpdate.chatCommand = command;
    }

    setSimulationResults(instantUpdate);
  };

  const startSimulation = async () => {
    if (!uploadedPolicyDoc) {
      alert('⚠️ Please upload a policy document first!');
      return;
    }
    
    try {
      // Create simulation record
      const simulation = await simulationsService.create({
        city,
        policyDoc: {
          filename: uploadedPolicyDoc.name,
          uploadedAt: new Date().toISOString()
        },
        parameters: {
          timeHorizon: 10,
          analysisDepth: 'detailed',
          focusAreas: []
        }
      });
      
      setRunningSimulation(simulation.id);
      setSimulationResults(null);
      
      // TODO: When backend is ready, this will trigger actual simulation
      // For now, we'll simulate it with WebSocket messages
      alert('✅ Simulation started! Watch the map for live updates!');
    } catch (error) {
      console.error('Error starting simulation:', error);
      alert('Failed to start simulation');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Upload policy document
        await policyDocsService.upload(file);
        setUploadedPolicyDoc(file);
        alert(`✅ Policy document uploaded: ${file.name}`);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file');
      }
    }
  };

  // Get simulation messages for right modal
  const simMessages = runningSimulation 
    ? messages.filter((m) => m.channel === `simulation:${runningSimulation}`)
    : [];

  // Mock agent messages for demo
  const mockAgentMessages = [
    { data: { agent: 'SimulationAgent', message: 'Analyzing housing density in Mission District...' } },
    { data: { agent: 'SimulationAgent', message: 'District X density ↑ 4%' } },
    { data: { agent: 'DebateAgent', message: 'Positive: Increased housing supply reduces rent pressure' } },
    { data: { agent: 'DebateAgent', message: 'Negative: Potential displacement of existing residents' } },
    { data: { agent: 'AggregatorAgent', message: 'Compiling draft report with pros/cons analysis...' } },
    { data: { agent: 'ConsultingAgent', message: 'Recommendation: Phased rollout over 18 months' } },
    { data: { agent: 'SimulationAgent', message: 'Traffic flow improved by 8% in target zones' } },
    { data: { agent: 'AggregatorAgent', message: 'Report generated: 5 key findings identified' } }
  ];

  // Use mock messages if no real messages exist
  const displayMessages = simMessages.length > 0 ? simMessages : (runningSimulation ? mockAgentMessages : []);

  return (
    <div className="relative min-h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-2xl"></div>
          <div className="relative px-8 py-6 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-3 text-white/80 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Enter city..."
                />
              </div>

              {/* 3D/2D Toggle */}
              <button
                onClick={() => setIs3D(!is3D)}
                className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2 hover:bg-white/20 transition flex items-center gap-2"
                title={is3D ? "Switch to 2D" : "Switch to 3D"}
              >
                {is3D ? (
                  <>
                    <MapIcon className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold text-sm">3D</span>
                  </>
                ) : (
                  <>
                    <MapIcon className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold text-sm">2D</span>
                  </>
                )}
              </button>

              {/* Create Agents Button */}
              <Link
                to="/agents"
                className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2 hover:bg-white/20 transition flex items-center gap-2"
              >
                <Zap className="w-5 h-5 text-white" />
                <span className="text-white font-semibold text-sm">Create Agents</span>
              </Link>

              <label className="group relative cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl opacity-40 group-hover:opacity-70 blur transition"></div>
                <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-6 py-3 hover:bg-white/20 transition flex items-center gap-3">
                  <Upload className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">
                    {uploadedPolicyDoc ? uploadedPolicyDoc.name : 'Upload Policy'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Mapbox Canvas - Center Background */}
      <div className="absolute inset-0 z-0">
        <DynamicSimulationMap
          city={city}
          simulationData={simulationResults}
          messages={messages}
          simulationId={runningSimulation}
          is3D={is3D}
          onToggle3D={() => setIs3D(!is3D)}
        />
      </div>

      {/* Left Side - Floating Statistics Boxes */}
      <div className="fixed left-6 top-24 z-40 flex flex-col gap-4">
        {/* General City Statistics - Small Boxes (2x3 grid) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Policy Analysis - Top Left - Always Visible */}
          <button
            onClick={() => setShowPolicyAnalysis(true)}
            className="w-[150px] rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 shadow-lg p-4 hover:bg-neutral-800/90 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-white/70 text-xs font-medium">Policy Analysis</span>
            </div>
            <div className="text-white text-2xl font-bold">
              {uploadedPolicyDoc ? 'Ready' : 'N/A'}
            </div>
            <div className="text-blue-400 text-xs mt-1">
              {simulationResults ? 'Analyzed' : uploadedPolicyDoc ? 'Uploaded' : 'No doc'}
            </div>
          </button>

          <div className="w-[150px] rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-white/70 text-xs font-medium">Population</span>
            </div>
            <div className="text-white text-2xl font-bold">{population.toLocaleString()}</div>
            <div className="text-green-400 text-xs mt-1">+2.3% YoY</div>
          </div>

          <div className="w-[150px] rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-white/70 text-xs font-medium">Housing Units</span>
            </div>
            <div className="text-white text-2xl font-bold">387K</div>
            <div className="text-green-400 text-xs mt-1">+1.8% YoY</div>
          </div>

          <div className="w-[150px] rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-orange-400" />
              <span className="text-white/70 text-xs font-medium">Traffic Flow</span>
            </div>
            <div className="text-white text-2xl font-bold">45%</div>
            <div className="text-red-400 text-xs mt-1">-3.2% YoY</div>
          </div>

          <div className="w-[150px] rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white/70 text-xs font-medium">GDP Growth</span>
            </div>
            <div className="text-white text-2xl font-bold">3.1%</div>
            <div className="text-green-400 text-xs mt-1">+0.5% YoY</div>
          </div>
        </div>


        {/* Simulation Configuration - Compact */}
        <div className="w-[320px] rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 shadow-lg p-5">
          <h4 className="text-white font-bold text-sm mb-3">⚙️ Configuration</h4>
          <div className="space-y-3">
            <select
              value={simulationFocus}
              onChange={(e) => setSimulationFocus(e.target.value)}
              className="w-full bg-neutral-800/50 border border-neutral-600 rounded-lg px-3 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500"
            >
              <option>Urban Traffic</option>
              <option>Infrastructure</option>
              <option>Housing</option>
              <option>Environmental Impact</option>
              <option>Zoning</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setPerspectiveMode('Macro')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition ${
                  perspectiveMode === 'Macro'
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-800/50 text-white/70'
                }`}
              >
                Macro
              </button>
              <button
                onClick={() => setPerspectiveMode('Micro')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition ${
                  perspectiveMode === 'Micro'
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-800/50 text-white/70'
                }`}
              >
                Micro
              </button>
            </div>
            <button
              onClick={startSimulation}
              disabled={!uploadedPolicyDoc || !!runningSimulation}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition text-sm"
            >
              <Play className="w-4 h-4" />
              {runningSimulation ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Icon Button - Floating */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-50 group"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition animate-pulse"></div>
          <div className="relative w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
            <Send className="w-8 h-8 text-white" />
          </div>
        </button>
      )}

      {/* Chat Popup - When Open */}
      {showChat && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px]">
          <div className="relative h-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-2xl opacity-75"></div>
            <div className="relative h-full bg-black/95 backdrop-blur-3xl border-2 border-white/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-white font-bold text-lg">Chat with Map</h3>
                    <p className="text-white/60 text-xs">Ask me to change anything!</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-white/60 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-white/10 border border-white/20 text-white/90'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/20 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder="Ask me to change the map..."
                    disabled={chatLoading}
                    className="flex-1 px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="group relative"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
                    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Document Analysis Modal - Full Screen Center */}
      {(uploadedPolicyDoc || simulationResults) && showPolicyAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-[90vw] max-w-[800px] h-[80vh] bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <h2 className="text-white font-bold text-2xl">📄 Policy Document Analysis</h2>
              </div>
              <button
                onClick={() => setShowPolicyAnalysis(false)}
                className="text-white/60 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {uploadedPolicyDoc ? (
                <>
                  <div>
                    <h3 className="text-white/70 text-sm font-semibold mb-2">Document</h3>
                    <div className="text-white text-xl font-bold">{uploadedPolicyDoc.name}</div>
                  </div>

                  <div>
                    <h3 className="text-white/70 text-sm font-semibold mb-2">Focus Area</h3>
                    <div className="text-white/90 text-base">
                      {simulationFocus === 'Urban Traffic' && 'Traffic infrastructure improvements and congestion reduction'}
                      {simulationFocus === 'Infrastructure' && 'Public infrastructure development and maintenance'}
                      {simulationFocus === 'Housing' && 'Affordable housing development and zoning changes'}
                      {simulationFocus === 'Environmental Impact' && 'Environmental sustainability and emissions reduction'}
                      {simulationFocus === 'Zoning' && 'Zoning regulations and land use policies'}
                    </div>
                  </div>

                  {simulationResults?.metrics?.changes && (
                    <div>
                      <h3 className="text-white/70 text-sm font-semibold mb-4">Key Metrics Impact</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                          <div className="text-white/60 text-sm mb-1">Housing Affordability</div>
                          <div className="text-green-400 text-3xl font-bold">
                            +{simulationResults.metrics.changes.housingAffordability?.percentage?.toFixed(1) || '0.0'}%
                          </div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                          <div className="text-white/60 text-sm mb-1">Traffic Flow</div>
                          <div className="text-green-400 text-3xl font-bold">
                            +{simulationResults.metrics.changes.trafficFlow?.percentage?.toFixed(1) || '0.0'}%
                          </div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                          <div className="text-white/60 text-sm mb-1">Air Quality</div>
                          <div className="text-green-400 text-3xl font-bold">
                            +{simulationResults.metrics.changes.airQuality?.percentage?.toFixed(1) || '0.0'}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-white/40 text-center py-12">
                  Upload a policy document to see analysis
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent Stream Popup - Center Bottom (Cluely Style) - Always Visible */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="relative">
            {/* Arrow pointing down */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-neutral-900/90"></div>
            
            {/* Popup Container */}
            <div 
              className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-2xl shadow-2xl p-4 min-w-[400px] max-w-[600px] max-h-[300px] flex flex-col cursor-pointer transition-all"
              onClick={() => setShowAgentStream(!showAgentStream)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <h4 className="text-white font-bold text-sm">🤖 Agentic Thoughts Stream</h4>
                </div>
                <div className="text-white/60 text-xs">
                  {displayMessages.length > 0 ? `${displayMessages.length} messages` : 'Waiting for agents...'}
                </div>
              </div>

              {/* Messages */}
              {showAgentStream && (
                <div className="overflow-y-auto space-y-1 font-mono text-xs max-h-[240px]">
                  {displayMessages.length > 0 ? (
                    displayMessages.slice(-20).map((msg, i) => {
                      const agentName = msg.data.agent || 'System';
                      const message = msg.data.message || msg.data.token || 'Processing...';
                      return (
                        <div key={i} className="text-green-300 flex items-start gap-2 py-1 px-2 rounded hover:bg-neutral-800/50">
                          <span className="text-green-400 mt-0.5">▶</span>
                          <span className="flex-1">
                            <span className="text-purple-400">[{agentName}]</span> {message}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-white/40 text-xs italic py-4 text-center">
                      Agents will stream their thoughts here as they process the simulation...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

