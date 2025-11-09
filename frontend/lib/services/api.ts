// API Client - FOR FUTURE USE WHEN BACKEND IS READY
// Currently, the app uses in-memory storage via services/storage.ts
// When backend is ready, uncomment and use these API calls

import axios from 'axios';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// NOTE: These API functions are defined but NOT currently used
// The app uses services/storage.ts for in-memory storage
// When backend is ready, update storage.ts to use these instead

// Agents
export const agentsApi = {
  list: () => api.get('/agents'),
  get: (id: string) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: string, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  getStats: (id: string) => api.get(`/agents/${id}/stats`),
};

// Projects
export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addAgent: (projectId: string, agentId: string) => 
    api.post(`/projects/${projectId}/agents`, { agentId }),
  removeAgent: (projectId: string, agentId: string) => 
    api.delete(`/projects/${projectId}/agents/${agentId}`),
};

// Upload
export const uploadApi = {
  uploadPolicyDoc: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload?projectId=${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  get: (id: string) => api.get(`/upload/${id}`),
  listByProject: (projectId: string) => api.get(`/upload/project/${projectId}`),
  delete: (id: string) => api.delete(`/upload/${id}`),
};

// Simulations
export const simulationsApi = {
  list: (projectId?: string) => 
    api.get('/simulations', { params: { projectId } }),
  get: (id: string) => api.get(`/simulations/${id}`),
  create: (data: any) => api.post('/simulations', data),
  cancel: (id: string) => api.post(`/simulations/${id}/cancel`),
  getMetrics: (id: string) => api.get(`/simulations/${id}/metrics`),
};

// Debates
export const debatesApi = {
  list: (simulationId?: string) => 
    api.get('/debate', { params: { simulationId } }),
  get: (id: string) => api.get(`/debate/${id}`),
  create: (data: any) => api.post('/debate', data),
};

// Reports
export const reportsApi = {
  list: (projectId?: string) => 
    api.get('/reports', { params: { projectId } }),
  get: (id: string) => api.get(`/reports/${id}`),
  create: (data: any) => api.post('/reports', data),
  delete: (id: string) => api.delete(`/reports/${id}`),
};


