import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronDown, MapPin, Zap, Users, Play, Upload, 
  Activity, TrendingUp, FileText, MessageSquare, BarChart3
} from 'lucide-react';
import { DynamicSimulationMap } from '../components/DynamicSimulationMap';
import { MapChatSidebar } from '../components/MapChatSidebar';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { AddAgentModal } from '../components/AddAgentModal';
import { UploadPolicyModal } from '../components/UploadPolicyModal';
import { projectsApi, agentsApi, simulationsApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function UnifiedApp() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [city, setCity] = useState('San Francisco, CA');
  const [runningSimulation, setRunningSimulation] = useState<string | null>(null);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [chatMapCommands, setChatMapCommands] = useState<any[]>([]);

  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsApi.list();
      return res.data;
    }
  });

  const { data: agents, refetch: refetchAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await agentsApi.list();
      return res.data;
    }
  });

  const { messages } = useWebSocket();

  // Listen to WebSocket messages and update simulation results
  useEffect(() => {
    if (!runningSimulation) return;

    const simMessages = messages.filter(
      (m) => m.channel === `simulation:${runningSimulation}`
    );

    if (simMessages.length > 0) {
      const latestMessage = simMessages[simMessages.length - 1];
      
      // Check for results in the message
      if (latestMessage.data.results) {
        console.log('📊 Simulation results received:', latestMessage.data.results);
        setSimulationResults(latestMessage.data.results);
      }
      
      // Check if completed
      if (latestMessage.data.type === 'completed' || latestMessage.data.status === 'completed') {
        console.log('✅ Simulation completed!');
        console.log('📊 Completion data:', latestMessage.data);
        
        // Set results immediately from WebSocket message
        if (latestMessage.data.results) {
          console.log('📊 Setting results from WebSocket:', latestMessage.data.results);
          setSimulationResults({
            ...latestMessage.data.results,
            metrics: latestMessage.data.metrics || latestMessage.data.results.metrics
          });
        }
        
        // Also fetch final results from API as backup
        simulationsApi.get(runningSimulation).then(res => {
          console.log('📊 Final simulation data from API:', res.data);
          if (res.data.metrics) {
            setSimulationResults(res.data);
          }
        }).catch(err => {
          console.error('Failed to fetch simulation results:', err);
        });
        
        setTimeout(() => {
          setRunningSimulation(null);
          refetchProjects();
          alert('✅ Simulation completed! Check the map for visual changes!');
        }, 2000);
      }
    }
  }, [messages, runningSimulation, refetchProjects]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMapCommand = (command: any) => {
    console.log('🗺️ Map command received:', command);
    console.log('📋 Command details:', command);
    
    // Create instant visual update based on command
    const instantUpdate: any = {
      metrics: {
        changes: {}
      }
    };

    switch (command.type) {
      case 'build-specific':
        // Build a specific new building
        instantUpdate.metrics.changes.housingAffordability = {
          percentage: command.height / 5, // Taller = more impact
          description: `Building ${command.height}-story tower at ${command.location}`
        };
        instantUpdate.buildCommand = {
          type: 'new-building',
          height: command.height,
          location: command.location,
          units: command.units
        };
        instantUpdate.chatCommand = command;
        break;
      
      case 'demolish-specific':
        // Demolish specific building (Salesforce Tower)
        instantUpdate.metrics.changes.demolition = {
          percentage: -100,
          description: `Demolishing ${command.target}`
        };
        instantUpdate.demolishCommand = {
          type: 'specific-building',
          target: command.target,
          coordinates: command.coordinates
        };
        instantUpdate.triggerDemolition = true;
        instantUpdate.chatCommand = command;
        break;
      
      case 'demolish-area':
        // Demolish entire area
        instantUpdate.metrics.changes.demolition = {
          percentage: -80,
          description: `Mass demolition in ${command.area || command.target}`
        };
        instantUpdate.demolishCommand = {
          type: 'area',
          area: command.area,
          coordinates: command.coordinates
        };
        instantUpdate.triggerDemolition = true;
        instantUpdate.chatCommand = command;
        break;
      
      case 'add-housing':
        instantUpdate.metrics.changes.housingAffordability = {
          percentage: command.impact || 15,
          description: `Adding ${command.units} units in ${command.location}`
        };
        instantUpdate.chatCommand = command;
        break;
      
      case 'analyze-traffic':
      case 'highlight-roads':
        instantUpdate.metrics.changes.trafficFlow = {
          percentage: 10,
          description: `Analyzing traffic on ${command.street || command.target}`
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
        // Just refresh the current data to trigger heatmap
        if (simulationResults) {
          setSimulationResults({...simulationResults});
        }
        return;
      
      default:
        instantUpdate.chatCommand = command;
    }

    // Update map with chat-driven results
    setSimulationResults(instantUpdate);
    setChatMapCommands(prev => [...prev, command]);
  };

  const testVisualEffects = () => {
    // INSTANTLY show visual effects with mock data
    const mockResults = {
      metrics: {
        changes: {
          housingAffordability: { percentage: 18.5, description: 'Significant improvement in affordable housing' },
          trafficFlow: { percentage: 12.3, description: 'Reduced congestion due to new transit' },
          airQuality: { percentage: 15.7, description: 'Improved air quality from reduced vehicle use' },
          publicTransitUsage: { percentage: 22.1, description: 'Major increase in transit ridership' }
        }
      },
      policyMaker: 'San Francisco City Council',
      source: 'Affordable Housing Initiative 2025',
      detailedBreakdown: {
        specificLocations: [
          'Mission District @ 16th St BART',
          'SOMA @ 3rd & King',
          'Treasure Island',
          'Tenderloin',
          'Financial District'
        ],
        affectedRoads: ['16th Street', 'King Street', '3rd Street', 'Bay Bridge'],
        bottlenecks: ['King St @ 4th St intersection', 'Bay Bridge westbound']
      }
    };

    setSimulationResults(mockResults);
    setRunningSimulation('test-simulation-' + Date.now());
    scrollToSection('map');
    
    // Simulate WebSocket messages
    setTimeout(() => {
      console.log('📊 TEST: Visual effects activated!');
      console.log('🎯 Detailed breakdown:', mockResults.detailedBreakdown);
    }, 500);
  };

  const startSimulation = async () => {
    if (!selectedProject) {
      alert('⚠️ Please select a project first!');
      return;
    }
    
    // Fetch project agents
    try {
      const projectAgentsRes = await projectsApi.get(selectedProject);
      const projectAgents = projectAgentsRes.data.agents || [];
      
      if (projectAgents.length === 0) {
        alert('⚠️ No agents assigned to this project!\n\nClick "Add Agents" to assign AI agents first.');
        return;
      }
      
      // Pick first SIMULATION agent, or fallback to first agent
      const simulationAgent = projectAgents.find((pa: any) => pa.agent.type === 'SIMULATION');
      const agentToUse = simulationAgent?.agent || projectAgents[0]?.agent;
      
      if (!agentToUse) {
        alert('⚠️ No valid agent found!');
        return;
      }
      
      setSimulationResults(null);
      const response = await simulationsApi.create({
        projectId: selectedProject,
        agentId: agentToUse.id,
        city,
        parameters: {
          timeHorizon: 10,
          focusAreas: [],
          analysisDepth: 'detailed'
        }
      });
      setRunningSimulation(response.data.id);
      
      // Scroll to map to watch it
      scrollToSection('map');
      
      alert('✅ Simulation started! Watch the map for live updates!');
    } catch (error: any) {
      console.error('Simulation failed:', error);
      
      let errorMessage = '❌ Simulation failed:\n\n';
      
      if (error.response?.status === 500) {
        errorMessage += 'Server Error. Check:\n';
        errorMessage += '1. Backend is running\n';
        errorMessage += '2. Database is connected\n';
        errorMessage += '3. GEMINI_API_KEY is valid\n\n';
        errorMessage += 'Error: ' + (error.response?.data?.message || 'Unknown');
      } else if (error.response?.status === 404) {
        errorMessage += 'Project or agent not found.';
      } else if (!error.response) {
        errorMessage += 'Cannot connect to backend.\nMake sure backend is running on http://localhost:3001';
      } else {
        errorMessage += error.response?.data?.message || error.message || 'Unknown error';
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className="relative bg-black">
      {/* SECTION 1: HERO LANDING */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-8 max-w-6xl">
          <div className="mb-8 inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/50 animate-pulse">
              <MapPin className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-8xl font-black text-white mb-6 tracking-tight">
            URBAN
          </h1>
          
          <p className="text-3xl text-white/70 mb-4 font-light tracking-wide">
            AI-Powered Policy Simulation
          </p>
          
          <div className="relative inline-block mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
            <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl px-12 py-6">
              <p className="text-white/90 text-xl font-light leading-relaxed max-w-3xl">
                Simulate government policies with AI agents. <br/>
                Real data. Real impact. Real-time analysis.
              </p>
            </div>
          </div>

          <div className="flex gap-6 justify-center mb-16">
            <button
              onClick={() => scrollToSection('map')}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 px-12 py-5 rounded-2xl font-bold text-xl text-white flex items-center gap-3">
                <MapPin className="w-6 h-6" />
                Explore Map
              </div>
            </button>

            <button
              onClick={() => scrollToSection('projects')}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-green-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-black border-2 border-white/30 px-12 py-5 rounded-2xl font-bold text-xl text-white flex items-center gap-3 hover:border-white/60 transition">
                <Zap className="w-6 h-6" />
                Get Started
              </div>
            </button>
          </div>

          {/* Scroll Indicator */}
          <button
            onClick={() => scrollToSection('map')}
            className="animate-bounce"
          >
            <ChevronDown className="w-12 h-12 text-white/50 mx-auto" />
          </button>
        </div>
      </section>

      {/* SECTION 2: FULL-SCREEN MAP */}
      <section id="map" className="relative h-screen">
        {/* Map AI Chat Sidebar - LEFT SIDE */}
        <MapChatSidebar onMapCommand={handleMapCommand} />
        
        <div className="absolute inset-0 left-[400px]">
          <DynamicSimulationMap
            city={city}
            simulationData={simulationResults}
            messages={messages}
            simulationId={runningSimulation}
          />
        </div>

        {/* Live Simulation Feed - TOP CENTER (above chat sidebar) */}
        {runningSimulation && (
          <div className="absolute top-8 left-[420px] z-20 w-96">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-emerald-600 to-cyan-600 rounded-3xl blur-xl opacity-75 animate-pulse"></div>
              <div className="relative bg-black/90 backdrop-blur-3xl border border-white/30 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-500"></div>
                  <h3 className="text-white font-bold text-xl">🔬 SIMULATION RUNNING</h3>
                </div>
                
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-200 text-sm font-semibold">
                    💡 Watch the map change in real-time as impacts are calculated!
                  </p>
                </div>
                
                {/* Live Messages */}
                <div className="space-y-2 max-h-64 overflow-auto font-mono text-sm">
                  {messages
                    .filter((m) => m.channel === `simulation:${runningSimulation}`)
                    .slice(-15)
                    .map((msg, i) => (
                      <div key={i} className="text-green-300 flex items-start gap-2 animate-in fade-in slide-in-from-right duration-300">
                        <span className="text-green-400 mt-1">▶</span>
                        <span>{msg.data.message || msg.data.token || 'Processing...'}</span>
                      </div>
                    ))}
                </div>

                {/* Results Preview with VISUAL INDICATORS */}
                {simulationResults && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                      📊 Live Impact on Map
                    </h4>
                    <div className="space-y-3">
                      {simulationResults.metrics && Object.entries(simulationResults.metrics.changes || {}).map(([key, value]: [string, any]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white/70 text-sm capitalize flex items-center gap-2">
                              {key === 'housingAffordability' && '🏠'}
                              {key === 'trafficFlow' && '🚗'}
                              {key === 'airQuality' && '🌱'}
                              {key === 'publicTransitUsage' && '🚇'}
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className={`font-bold text-lg ${value.percentage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {value.percentage > 0 ? '+' : ''}{value.percentage?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative h-2 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                value.percentage > 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-orange-400'
                              }`}
                              style={{ 
                                width: `${Math.min(Math.abs(value.percentage), 100)}%`,
                                boxShadow: value.percentage > 0 ? '0 0 10px rgba(34, 197, 94, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                      <p className="text-blue-200 text-xs font-semibold">
                        🗺️ Colored zones on map show policy impact areas
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DECLUTTERED - No left controls */}

        {/* Scroll to Next */}
        <button
          onClick={() => scrollToSection('projects')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce"
        >
          <div className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-full p-4">
            <ChevronDown className="w-8 h-8 text-white" />
          </div>
        </button>
      </section>

      {/* SECTION 3: PROJECTS */}
      <section id="projects" className="relative min-h-screen bg-gradient-to-b from-black via-purple-950/20 to-black py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black text-white mb-6">Your Projects</h2>
            <p className="text-2xl text-white/60">Manage policy simulations and scenarios</p>
          </div>

          <div className="flex justify-center mb-12">
            <button
              onClick={() => setShowProjectModal(true)}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3">
                <Activity className="w-6 h-6" />
                Create New Project
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects?.map((project: any) => (
              <div
                key={project.id}
                onClick={() => {
                  setSelectedProject(project.id);
                  refetchProjects(); // Refresh to get latest counts
                }}
                className={`group relative cursor-pointer ${
                  selectedProject === project.id ? 'ring-4 ring-purple-500' : ''
                }`}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-75 transition"></div>
                <div className="relative bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:border-white/40 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl">
                      📁
                    </div>
                    {selectedProject === project.id && (
                      <div className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 rounded-full text-purple-300 text-xs font-bold">
                        SELECTED
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{project.name}</h3>
                  <p className="text-white/60 mb-4 line-clamp-2">{project.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        (project._count?.agents || 0) > 0 ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className="text-white/70 font-semibold">{project._count?.agents || 0} agents</span>
                    </div>
                    <span className="text-white/30">•</span>
                    <span className="text-white/50">{project._count?.simulations || 0} sims</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedProject && (
            <div className="mt-12 text-center space-x-6">
              <button
                onClick={() => setShowAddAgentModal(true)}
                className="group relative inline-block"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-black border-2 border-white/30 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3 hover:border-white/60 transition">
                  <Users className="w-6 h-6" />
                  Add Agents
                </div>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="group relative inline-block"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-black border-2 border-white/30 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3 hover:border-white/60 transition">
                  <Upload className="w-6 h-6" />
                  Upload Policy
                </div>
              </button>

              <button
                onClick={startSimulation}
                className="group relative inline-block"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3">
                  <Play className="w-6 h-6" />
                  Run Simulation
                </div>
              </button>

              <button
                onClick={testVisualEffects}
                className="group relative inline-block"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-black border-2 border-pink-400/50 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3 hover:border-pink-400 transition">
                  <Activity className="w-6 h-6" />
                  TEST Visual Effects
                </div>
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <div className="inline-block px-6 py-3 bg-purple-500/20 border border-purple-400/30 rounded-xl">
              <p className="text-purple-200 text-sm">
                💡 <strong>Pro Tip:</strong> Click "TEST Visual Effects" to instantly see heatmaps, buildings, and animations!
              </p>
            </div>
          </div>
        </div>

        {/* Scroll to Next */}
        <button
          onClick={() => scrollToSection('agents')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        >
          <div className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-full p-4">
            <ChevronDown className="w-8 h-8 text-white" />
          </div>
        </button>
      </section>

      {/* SECTION 4: AI AGENTS */}
      <section id="agents" className="relative min-h-screen bg-gradient-to-b from-black via-blue-950/20 to-black py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black text-white mb-6">AI Agents</h2>
            <p className="text-2xl text-white/60">Intelligent policy analysis and simulation</p>
          </div>

          <div className="flex justify-center mb-12">
            <button
              onClick={() => setShowAgentModal(true)}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-3">
                <Zap className="w-6 h-6" />
                Create New Agent
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {agents?.map((agent: any) => (
              <div key={agent.id} className="group relative">
                <div className={`absolute -inset-1 rounded-3xl blur-xl opacity-0 group-hover:opacity-75 transition ${
                  agent.type === 'SIMULATION' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                  agent.type === 'DEBATE' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                  agent.type === 'AGGREGATOR' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                  'bg-gradient-to-r from-blue-600 to-cyan-600'
                }`}></div>
                <div className="relative bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:border-white/40 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${
                      agent.type === 'SIMULATION' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                      agent.type === 'DEBATE' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                      agent.type === 'AGGREGATOR' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                      'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}>
                      {agent.type === 'SIMULATION' ? '🔬' :
                       agent.type === 'DEBATE' ? '💬' :
                       agent.type === 'AGGREGATOR' ? '📄' : '🎯'}
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
        </div>

        {/* Scroll to Top */}
        <button
          onClick={() => scrollToSection('hero')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-full p-4 rotate-180">
            <ChevronDown className="w-8 h-8 text-white" />
          </div>
        </button>
      </section>

      {/* MODALS */}
      {showProjectModal && (
        <CreateProjectModal
          onClose={() => setShowProjectModal(false)}
          onSuccess={() => {
            refetchProjects();
            setShowProjectModal(false);
          }}
        />
      )}

      {showAgentModal && (
        <CreateAgentModal
          onClose={() => setShowAgentModal(false)}
          onSuccess={() => {
            refetchAgents();
            setShowAgentModal(false);
          }}
        />
      )}

      {selectedProject && showAddAgentModal && (
        <AddAgentModal
          projectId={selectedProject}
          onClose={() => setShowAddAgentModal(false)}
          onSuccess={() => {
            refetchProjects(); // Refresh project list to show updated agent count
            setShowAddAgentModal(false);
            alert('✅ Agents added to project successfully!');
          }}
        />
      )}

      {selectedProject && showUploadModal && (
        <UploadPolicyModal
          projectId={selectedProject}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            alert('✅ Policy document uploaded successfully!');
          }}
        />
      )}

    </div>
  );
}

