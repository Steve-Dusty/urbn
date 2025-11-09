import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle } from 'lucide-react';
import { agentsApi, projectsApi } from '../services/api';

interface AddAgentModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAgentModal({ projectId, onClose, onSuccess }: AddAgentModalProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: allAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((res) => res.data),
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId).then((res) => res.data),
  });

  // Filter out already assigned agents
  const availableAgents = allAgents?.filter(
    (agent: any) => !project?.agents?.some((pa: any) => pa.agentId === agent.id)
  ) || [];

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAgents.length === 0) {
      alert('Please select at least one agent');
      return;
    }

    setLoading(true);

    try {
      // Add all selected agents
      await Promise.all(
        selectedAgents.map((agentId) =>
          projectsApi.addAgent(projectId, agentId)
        )
      );
      onSuccess();
    } catch (error) {
      console.error('Error adding agents:', error);
      alert('Failed to add agents');
    } finally {
      setLoading(false);
    }
  };

  const selectAllSimulation = () => {
    const simAgents = availableAgents
      .filter((a: any) => a.type === 'SIMULATION')
      .map((a: any) => a.id);
    setSelectedAgents(simAgents);
  };

  const selectRecommended = () => {
    const recommended = availableAgents
      .filter((a: any) => ['SIMULATION', 'DEBATE', 'AGGREGATOR'].includes(a.type))
      .map((a: any) => a.id);
    setSelectedAgents(recommended);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Add Agents to Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            {availableAgents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  All available agents are already assigned to this project!
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={selectRecommended}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                  >
                    Select Recommended (3)
                  </button>
                  <button
                    type="button"
                    onClick={selectAllSimulation}
                    className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                  >
                    Select Simulation Agents
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgents([])}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                  >
                    Clear
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> You need at least a <strong>Simulation</strong> agent to run simulations.
                    Click "Select Recommended" to get the essential agents.
                  </p>
                </div>

                <div className="space-y-3">
                  {availableAgents.map((agent: any) => (
                    <div
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAgents.includes(agent.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedAgents.includes(agent.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedAgents.includes(agent.id) && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {agent.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              agent.type === 'SIMULATION' ? 'bg-green-100 text-green-800' :
                              agent.type === 'DEBATE' ? 'bg-orange-100 text-orange-800' :
                              agent.type === 'AGGREGATOR' ? 'bg-purple-100 text-purple-800' :
                              agent.type === 'SUPERVISOR' ? 'bg-blue-100 text-blue-800' :
                              'bg-pink-100 text-pink-800'
                            }`}>
                              {agent.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{agent.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {availableAgents.length > 0 && (
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedAgents.length === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : `Add ${selectedAgents.length} Agent${selectedAgents.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

