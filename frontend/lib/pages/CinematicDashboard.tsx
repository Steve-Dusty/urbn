import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Folder, Users, Activity, Zap } from 'lucide-react';
import { projectsApi, agentsApi } from '../services/api';
import { useState } from 'react';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { CinematicPage } from '../components/CinematicPage';

export function CinematicDashboard() {
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
    <CinematicPage
      title="Command Center"
      subtitle="Manage simulations, agents, and urban policy insights"
      icon={<Zap className="w-10 h-10" />}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          {
            label: 'Total Projects',
            value: projects?.length || 0,
            icon: Folder,
            gradient: 'from-blue-600 to-purple-600',
          },
          {
            label: 'Active Agents',
            value: agents?.filter((a: any) => a.status === 'ACTIVE').length || 0,
            icon: Users,
            gradient: 'from-green-600 to-emerald-600',
          },
          {
            label: 'Simulations',
            value: agents?.reduce((sum: number, a: any) => sum + (a._count?.simulations || 0), 0) || 0,
            icon: Activity,
            gradient: 'from-pink-600 to-rose-600',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="group relative"
          >
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${stat.gradient} rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500`}></div>
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-8 h-8 text-white/70" />
                <div className={`text-5xl font-bold bg-gradient-to-r ${stat.gradient} text-transparent bg-clip-text`}>
                  {stat.value}
                </div>
              </div>
              <p className="text-white/60 text-sm uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Your Projects</h2>
          <button
            onClick={() => setShowCreateProject(true)}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
            <div className="relative flex items-center gap-2 px-6 py-3 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all">
              <Plus className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-white font-semibold">New Project</span>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project: any) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-40 blur transition duration-500"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Folder className="w-6 h-6 text-white" />
                  </div>
                  {project.city && (
                    <span className="text-xs px-3 py-1 bg-white/10 text-white/80 rounded-full backdrop-blur-sm border border-white/20">
                      {project.city.split(',')[0]}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white text-xl mb-2 group-hover:text-purple-300 transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-white/60 text-sm mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <span>{project._count.agents} agents</span>
                  <span>·</span>
                  <span>{project._count.simulations} sims</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide">AI Agents</h2>
          <button
            onClick={() => setShowCreateAgent(true)}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
            <div className="relative flex items-center gap-2 px-6 py-3 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all">
              <Plus className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-white font-semibold">New Agent</span>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents?.map((agent: any) => (
            <div
              key={agent.id}
              className="group relative"
            >
              <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-40 blur transition duration-500 ${
                agent.type === 'SIMULATION' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                agent.type === 'DEBATE' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                agent.type === 'AGGREGATOR' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                agent.type === 'SUPERVISOR' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' :
                'bg-gradient-to-r from-pink-600 to-rose-600'
              }`}></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
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
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">
                  {agent.name}
                </h3>
                <p className="text-white/60 text-sm mb-4 line-clamp-2">
                  {agent.role}
                </p>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-medium">
                    {agent.type}
                  </span>
                  <span className="text-white/50 text-xs">
                    {agent._count?.simulations || 0} runs
                  </span>
                </div>
              </div>
            </div>
          ))}
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
    </CinematicPage>
  );
}

