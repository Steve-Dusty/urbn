'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Play, FileText } from 'lucide-react';
import { VerticalSidebar } from '../components/VerticalSidebar';
import { projectsApi, simulationsApi, uploadApi } from '../services/api';
import { useState } from 'react';
import { UploadPolicyModal } from '../components/UploadPolicyModal';
import { AddAgentModal } from '../components/AddAgentModal';
import { format } from 'date-fns';

export function ProjectDetail() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const [showUpload, setShowUpload] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then((res) => res.data),
    enabled: !!projectId,
  });

  const { data: simulations } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationsApi.list(projectId).then((res) => res.data),
    enabled: !!projectId,
  });

  if (!project) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
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
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-16 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="text-gray-300 mt-2">{project.description}</p>
          )}
          {project.city && (
            <p className="text-sm text-gray-400 mt-1">📍 {project.city}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Upload className="w-4 h-4" />
            Upload Policy Document
          </button>
          <Link
            href={`/app/simulation?projectId=${projectId}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Play className="w-4 h-4" />
            New Simulation
          </Link>
          <Link
            href={`/app/reports?projectId=${projectId}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Policy Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Policy Documents</h2>
              <div className="space-y-3">
                {project.policyDocs?.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{doc.filename}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {doc.parsedActions && (
                      <span className="text-sm text-green-600">
                        ✓ {doc.parsedActions.actions?.length || 0} actions extracted
                      </span>
                    )}
                  </div>
                ))}
                {(!project.policyDocs || project.policyDocs.length === 0) && (
                  <p className="text-gray-500 text-center py-4">
                    No policy documents uploaded yet
                  </p>
                )}
              </div>
            </div>

            {/* Simulations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Simulations</h2>
              <div className="space-y-3">
                {simulations?.map((sim: any) => (
                  <Link
                    key={sim.id}
                    href={`/app/simulation/${sim.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{sim.city}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        sim.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : sim.status === 'RUNNING'
                          ? 'bg-blue-100 text-blue-800'
                          : sim.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sim.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(new Date(sim.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </Link>
                ))}
                {(!simulations || simulations.length === 0) && (
                  <p className="text-gray-500 text-center py-4">
                    No simulations run yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agents */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Assigned Agents</h3>
                <button
                  onClick={() => setShowAddAgent(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + Add
                </button>
              </div>
              {project.agents && project.agents.length > 0 ? (
                <div className="space-y-2">
                  {project.agents?.map((pa: any) => (
                    <div
                      key={pa.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <p className="font-medium text-sm text-gray-900">
                        {pa.agent.name}
                      </p>
                      <p className="text-xs text-gray-500">{pa.agent.type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-3">
                    No agents assigned yet
                  </p>
                  <button
                    onClick={() => setShowAddAgent(true)}
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                  >
                    Add Agents
                  </button>
                </div>
              )}
            </div>

            {/* Reports */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Recent Reports</h3>
              <div className="space-y-2">
                {project.reports?.slice(0, 5).map((report: any) => (
                  <Link
                    key={report.id}
                    href={`/app/reports/${report.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <p className="font-medium text-sm text-gray-900">{report.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(report.generatedAt), 'MMM d, yyyy')}
                    </p>
                  </Link>
                ))}
                {(!project.reports || project.reports.length === 0) && (
                  <p className="text-sm text-gray-500">No reports yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUpload && projectId && (
        <UploadPolicyModal
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            // Refetch project data
          }}
        />
      )}

      {showAddAgent && projectId && (
        <AddAgentModal
          projectId={projectId}
          onClose={() => setShowAddAgent(false)}
          onSuccess={() => {
            setShowAddAgent(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}


