import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Play, Users, FileText, BarChart3, Upload, 
  Settings, Layers, MapPin, Zap, MessageSquare 
} from 'lucide-react';
import { EnhancedMapView } from '../components/EnhancedMapView';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { AddAgentModal } from '../components/AddAgentModal';
import { UploadPolicyModal } from '../components/UploadPolicyModal';
import { useQuery } from '@tanstack/react-query';
import { api, projectsApi, agentsApi, uploadApi, simulationsApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function UnifiedDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedLayers, setSelectedLayers] = useState(['buildings', 'traffic']);
  const [city, setCity] = useState('San Francisco, CA');
  const [simulationRunning, setSimulationRunning] = useState(false);
  
  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch data
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsApi.list();
      return res.data;
    }
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await agentsApi.list();
      return res.data;
    }
  });

  const { data: policyDocs } = useQuery({
    queryKey: ['policyDocs', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      const res = await uploadApi.listByProject(selectedProject);
      return res.data;
    },
    enabled: !!selectedProject
  });

  const { messages } = useWebSocket();

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const startSimulation = async () => {
    if (!selectedProject) {
      alert('Please select a project first!');
      return;
    }
    
    try {
      setSimulationRunning(true);
      await simulationsApi.create({
        projectId: selectedProject,
        city,
        timeHorizon: 10
      });
    } catch (error) {
      console.error('Simulation failed:', error);
      setSimulationRunning(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* FULL SCREEN MAPBOX */}
      <div className="absolute inset-0">
        <EnhancedMapView
          city={city}
          layers={selectedLayers}
          simulationData={null}
        />
      </div>

      {/* TOP BAR - Liquid Glass */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-2xl"></div>
          <div className="relative px-8 py-6 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">URBAN</h1>
                <p className="text-xs text-white/60">AI Policy Simulation</p>
              </div>
            </div>

            {/* City Selector - Glass */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-30 blur"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-transparent border-none outline-none text-white placeholder-white/40 w-64"
                  placeholder="Enter city..."
                />
              </div>
            </div>

            {/* Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl opacity-40 group-hover:opacity-70 blur transition"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition">
                {menuOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* LEFT FLOATING PANEL - Quick Actions */}
      <div className="absolute left-6 top-32 z-40 space-y-4">
        {[
          { id: 'projects', icon: Users, label: 'Projects', color: 'from-blue-600 to-cyan-600' },
          { id: 'agents', icon: Zap, label: 'Agents', color: 'from-purple-600 to-pink-600' },
          { id: 'simulate', icon: Play, label: 'Run', color: 'from-green-600 to-emerald-600' },
          { id: 'layers', icon: Layers, label: 'Layers', color: 'from-orange-600 to-yellow-600' },
        ].map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => action.id === 'simulate' ? startSimulation() : togglePanel(action.id)}
            className="group relative"
          >
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${action.color} rounded-2xl opacity-40 group-hover:opacity-70 blur transition`}></div>
            <div className="relative bg-black/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 w-16 h-16 flex items-center justify-center">
              <action.icon className="w-7 h-7 text-white" />
            </div>
            <div className="absolute left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
              <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2 whitespace-nowrap">
                <span className="text-sm text-white font-semibold">{action.label}</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* RIGHT SIDE MENU - Slide In */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="absolute right-0 top-0 bottom-0 w-96 z-50"
          >
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-l from-black via-black/95 to-transparent backdrop-blur-3xl border-l border-white/10"></div>
              <div className="relative h-full p-8 overflow-auto">
                <h2 className="text-2xl font-bold text-white mb-8">Control Panel</h2>
                
                <div className="space-y-6">
                  {/* Projects Section */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-30 blur"></div>
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Projects</h3>
                        <button
                          onClick={() => setShowProjectModal(true)}
                          className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg text-sm text-white transition"
                        >
                          + New
                        </button>
                      </div>
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white"
                      >
                        <option value="">Select project...</option>
                        {projects?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Agents Section */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-30 blur"></div>
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Agents</h3>
                        <button
                          onClick={() => setShowAgentModal(true)}
                          className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-sm text-white transition"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {agents?.map((agent: any) => (
                          <div key={agent.id} className="flex items-center gap-3 p-2 bg-black/30 rounded-lg">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm text-white">{agent.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl opacity-30 blur"></div>
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                      <h3 className="text-lg font-bold text-white mb-4">Documents</h3>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="w-full px-4 py-3 bg-orange-600/30 hover:bg-orange-600/50 rounded-xl text-white transition flex items-center justify-center gap-2"
                      >
                        <Upload className="w-5 h-5" />
                        Upload Policy
                      </button>
                    </div>
                  </div>

                  {/* Live Feed */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-30 blur"></div>
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                      <h3 className="text-lg font-bold text-white mb-4">Live Feed</h3>
                      <div className="space-y-2 max-h-64 overflow-auto font-mono text-xs">
                        {messages.slice(-10).reverse().map((msg, i) => (
                          <div key={i} className="text-green-300 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 animate-pulse"></div>
                            <span>{msg.data.message || msg.data.token}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING PANELS (when clicked from left sidebar) */}
      <AnimatePresence>
        {activePanel === 'projects' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute left-32 top-32 z-40 w-96"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl opacity-40 blur-xl"></div>
              <div className="relative bg-black/80 backdrop-blur-3xl border border-white/20 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Projects</h3>
                  <button onClick={() => setActivePanel(null)}>
                    <X className="w-5 h-5 text-white/60 hover:text-white transition" />
                  </button>
                </div>
                <div className="space-y-3">
                  {projects?.map((project: any) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project.id);
                        setCity(project.city || 'San Francisco, CA');
                        setActivePanel(null);
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition"
                    >
                      <h4 className="font-bold text-white">{project.name}</h4>
                      <p className="text-sm text-white/60 mt-1">{project.city}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activePanel === 'layers' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute left-32 top-32 z-40 w-80"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-3xl opacity-40 blur-xl"></div>
              <div className="relative bg-black/80 backdrop-blur-3xl border border-white/20 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Map Layers</h3>
                  <button onClick={() => setActivePanel(null)}>
                    <X className="w-5 h-5 text-white/60 hover:text-white transition" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'buildings', label: '3D Buildings', emoji: '🏢' },
                    { id: 'traffic', label: 'Traffic', emoji: '🚗' },
                    { id: 'housing', label: 'Housing', emoji: '🏠' },
                    { id: 'emissions', label: 'Air Quality', emoji: '🌱' },
                    { id: 'equity', label: 'Equity', emoji: '⚖️' },
                  ].map((layer) => (
                    <label
                      key={layer.id}
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLayers.includes(layer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLayers([...selectedLayers, layer.id]);
                          } else {
                            setSelectedLayers(selectedLayers.filter(l => l !== layer.id));
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <span className="text-2xl">{layer.emoji}</span>
                      <span className="text-white font-semibold">{layer.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM STATUS BAR */}
      {simulationRunning && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-60 blur-lg animate-pulse"></div>
            <div className="relative bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl px-8 py-4 flex items-center gap-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-bold">Simulation Running...</span>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <CreateProjectModal
        onClose={() => setShowProjectModal(false)}
        onSuccess={() => setShowProjectModal(false)}
      />
      
      {selectedProject && (
        <>
          <AddAgentModal
            onClose={() => setShowAgentModal(false)}
            onSuccess={() => setShowAgentModal(false)}
            projectId={selectedProject}
          />
          <UploadPolicyModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => setShowUploadModal(false)}
            projectId={selectedProject}
          />
        </>
      )}
    </div>
  );
}

