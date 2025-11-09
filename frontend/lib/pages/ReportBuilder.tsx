'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import { VerticalSidebar } from '../components/VerticalSidebar';
import { reportsApi, projectsApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import ReactMarkdown from 'react-markdown';

export function ReportBuilder() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reportId = params?.reportId as string;
  const projectId = searchParams?.get('projectId');

  const [title, setTitle] = useState('Policy Impact Report');
  const [format, setFormat] = useState<'PDF' | 'POWERPOINT' | 'HTML' | 'MARKDOWN'>('PDF');
  const [selectedSections, setSelectedSections] = useState([
    'executive_summary',
    'proposed_changes',
    'impact_analysis',
    'debate_summary',
    'risk_assessment',
    'recommendations',
  ]);

  const { messages, subscribe } = useWebSocket();

  const { data: report } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.get(reportId!).then((res) => res.data),
    enabled: !!reportId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then((res) => res.data),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (reportId) {
      subscribe(`report:${reportId}`);
    }
  }, [reportId]);

  const generateReport = async () => {
    if (!projectId) return;

    const result = await reportsApi.create({
      projectId,
      title,
      format,
      sections: selectedSections,
    });

    window.location.href = `/reports/${result.data.id}`;
  };

  const toggleSection = (section: string) => {
    setSelectedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const sectionOptions = [
    { id: 'executive_summary', name: 'Executive Summary' },
    { id: 'proposed_changes', name: 'Proposed Changes' },
    { id: 'impact_analysis', name: 'Impact Analysis' },
    { id: 'debate_summary', name: 'Stakeholder Perspectives' },
    { id: 'risk_assessment', name: 'Risk Assessment' },
    { id: 'recommendations', name: 'Recommendations' },
  ];

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
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-pink-600/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-16 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
              <FileText className="w-10 h-10" />
              Report Builder
            </h1>
            {project && (
              <p className="text-white/80 mt-2 text-lg tracking-wide">{project.name}</p>
            )}
          </div>
          <div className="flex gap-3">
            {!reportId && (
              <button
                onClick={generateReport}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
                <div className="relative flex items-center gap-3 px-8 py-4 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all">
                  <FileText className="w-6 h-6 text-white" />
                  <span className="text-white font-bold text-lg">Generate Report</span>
                </div>
              </button>
            )}
            {report && (
              <button className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
                <div className="relative flex items-center gap-3 px-8 py-4 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all">
                  <Download className="w-6 h-6 text-white" />
                  <span className="text-white font-bold text-lg">Export {report.format}</span>
                </div>
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex">
        {/* Left Panel - Configuration */}
        <div className="w-80 border-r border-gray-200 p-4 overflow-auto">
          <div className="space-y-6">
            {!reportId && (
              <>
                <div>
                  <label className="block text-sm font-bold text-white mb-3">
                    📝 Report Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-3">
                    📦 Export Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  >
                    <option value="PDF">PDF</option>
                    <option value="POWERPOINT">PowerPoint</option>
                    <option value="HTML">HTML</option>
                    <option value="MARKDOWN">Markdown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-3">
                    📋 Sections to Include
                  </label>
                  <div className="space-y-2">
                    {sectionOptions.map((section) => (
                      <label key={section.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedSections.includes(section.id)
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.id)}
                          onChange={() => toggleSection(section.id)}
                          className="sr-only"
                        />
                        <span className="text-white font-medium text-sm">{section.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {report && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 backdrop-blur-lg rounded-xl border border-white/10">
                  <h3 className="font-bold text-white text-sm mb-3">ℹ️ Report Info</h3>
                  <div className="text-xs space-y-2 text-gray-200">
                    <p><span className="text-gray-400">Format:</span> <span className="font-bold">{report.format}</span></p>
                    <p><span className="text-gray-400">Sections:</span> <span className="font-bold">{report.content?.sections?.length || 0}</span></p>
                    <p className="text-gray-400">
                      Generated: {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-600/20 backdrop-blur-lg rounded-xl border border-green-400/30">
                  <p className="text-sm text-green-100 font-medium">
                    ✓ Report generation complete
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - Report Preview */}
        <div className="flex-1 overflow-auto p-8 bg-slate-900">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            {report ? (
              <div className="prose max-w-none">
                <h1 className="text-3xl font-bold mb-6">{report.title}</h1>
                
                {report.content?.sections?.map((section: any, i: number) => (
                  <div key={i} className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-primary-600">
                      {section.title}
                    </h2>
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                ))}

                {/* Live streaming content */}
                <div className="bg-slate-800/50 rounded-xl p-4 mt-6">
                  {messages
                    .filter((m) => m.channel === `report:${reportId}`)
                    .map((msg, i) => (
                      <span key={`stream-${i}`} className="text-blue-300 font-mono">
                        {msg.data.token}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-2xl backdrop-blur-lg border border-white/10 p-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <p className="text-white text-lg font-bold mb-2">
                  Configure your report and click "Generate Report"
                </p>
                <p className="text-sm text-gray-400">
                  The report will be compiled from simulation and debate results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Table of Contents */}
        <div className="w-64 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-white/10 p-6">
          <h3 className="font-bold text-white text-lg mb-4">
            📑 Table of Contents
          </h3>
          {report?.content?.sections?.map((section: any, i: number) => (
            <div key={i} className="mb-2">
              <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                {section.title}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


