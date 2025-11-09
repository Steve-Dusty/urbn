import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Folder, Users, Activity } from 'lucide-react';
import { projectsApi, agentsApi } from '../services/api';
import { useState } from 'react';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateAgentModal } from '../components/CreateAgentModal';

export function Dashboard() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);

  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((res) => res.data),
  });

  const { data: agents, refetch: refetchAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((res) => res.data),
  });

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Stunning Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <Folder className="w-10 h-10" />
            Command Center
          </h1>
          <p className="text-blue-100 mt-3 text-lg">
            Manage your policy simulation projects and AI agents with real-time insights
          </p>
        </div>

        {/* Stunning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 font-medium mb-2">Total Projects</p>
                <p className="text-5xl font-bold text-white">
                  {projects?.length || 0}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Folder className="w-9 h-9 text-white" />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 font-medium mb-2">Active Agents</p>
                <p className="text-5xl font-bold text-white">
                  {agents?.filter((a: any) => a.status === 'ACTIVE').length || 0}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-9 h-9 text-white" />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 font-medium mb-2">Simulations Run</p>
                <p className="text-5xl font-bold text-white">
                  {agents?.reduce((sum: number, a: any) => sum + (a._count?.simulations || 0), 0) || 0}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-9 h-9 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Your Projects</h2>
            <button
              onClick={() => setShowCreateProject(true)}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              New Project
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project: any) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 border-2 border-transparent hover:border-purple-400"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Folder className="w-6 h-6 text-white" />
                  </div>
                  {project.city && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {project.city.split(',')[0]}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-purple-600 transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    {project._count.agents}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Activity className="w-4 h-4" />
                    {project._count.simulations}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Agents Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">AI Agents</h2>
            <button
              onClick={() => setShowCreateAgent(true)}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              New Agent
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents?.map((agent: any) => (
              <div
                key={agent.id}
                className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 p-6 border-2 border-transparent hover:border-green-400"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform ${
                    agent.type === 'SIMULATION' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                    agent.type === 'DEBATE' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                    agent.type === 'AGGREGATOR' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                    agent.type === 'SUPERVISOR' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                    'bg-gradient-to-br from-pink-500 to-rose-500'
                  }`}>
                    {agent.type === 'SIMULATION' ? '🔬' :
                     agent.type === 'DEBATE' ? '💬' :
                     agent.type === 'AGGREGATOR' ? '📄' :
                     agent.type === 'SUPERVISOR' ? '🎯' : '📢'}
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    agent.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-purple-600 transition-colors">
                  {agent.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {agent.role}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {agent.type}
                  </span>
                  <span className="text-gray-500">
                    {agent._count?.simulations || 0} runs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => {
            refetchProjects();
            setShowCreateProject(false);
          }}
        />
      )}

      {showCreateAgent && (
        <CreateAgentModal
          onClose={() => setShowCreateAgent(false)}
          onSuccess={() => {
            refetchAgents();
            setShowCreateAgent(false);
          }}
        />
      )}
    </div>
  );
}


