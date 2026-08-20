import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getCourseGraph(courseId: string) {
  try {
    const response = await api.get(`/courses/${courseId}/graph`);
    return response.data;
  } catch (error) {
    // Fallback mock graph data so your frontend UI works independently
    return {
      nodes: [
        { id: '1', position: { x: 100, y: 100 }, data: { label: 'Intro to System Design' }, className: 'bg-emerald-100 border border-emerald-500 text-emerald-900 rounded-lg p-3 shadow-sm font-medium text-xs' },
        { id: '2', position: { x: 300, y: 200 }, data: { label: 'Distributed Architecture' }, className: 'bg-rose-100 border border-rose-500 text-rose-900 rounded-lg p-3 shadow-sm font-medium text-xs' },
        { id: '3', position: { x: 500, y: 100 }, data: { label: 'Microservices & Scaling' }, className: 'bg-blue-100 border border-blue-500 text-blue-900 rounded-lg p-3 shadow-sm font-medium text-xs' }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', animated: true, label: 'prerequisite' },
        { id: 'e2-3', source: '2', target: '3', animated: true, label: 'leads to' }
      ]
    };
  }
}

export async function getNodeContext(nodeId: string) {
  try {
    const response = await api.get(`/courses/node/${nodeId}/rag-context`);
    return response.data;
  } catch (error) {
    return {
      summary: 'This is a simulated RAG context excerpt extracted from the course materials, detailing core architectural trade-offs and patterns.',
      references: [
        { type: 'PDF', page: 14 },
        { type: 'Video', timestamp: '08:45' }
      ]
    };
  }
}