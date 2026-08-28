// import axios from 'axios';

// export const api = axios.create({
//   baseURL: 'http://localhost:8000',
// });

// // api.interceptors.request.use((config) => {
// //   const token = localStorage.getItem('token');
// //   if (token) {
// //     config.headers.Authorization = `Bearer ${token}`;
// //   }
// //   return config;
// // });
// // Axios Request Interceptor for Automatic Auth Headers
// api.interceptors.request.use(
//   (config) => {
//     if (typeof window !== 'undefined') {
//       const token = localStorage.getItem('token');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // Optional Response Interceptor to auto-handle unauthorized states
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401 && typeof window !== 'undefined') {
//       localStorage.removeItem('token');
//       localStorage.removeItem('userRole');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

// export async function getCourseGraph(courseId: string) {
//   try {
//     const response = await api.get(`/courses/${courseId}/graph`);
//     return response.data;
//   } catch (error) {
//     // Fallback mock graph data so your frontend UI works independently
//     return {
//       nodes: [
//         { id: '1', position: { x: 100, y: 100 }, data: { label: 'Intro to System Design' }, className: 'bg-emerald-100 border border-emerald-500 text-emerald-900 rounded-lg p-3 shadow-sm font-medium text-xs' },
//         { id: '2', position: { x: 300, y: 200 }, data: { label: 'Distributed Architecture' }, className: 'bg-rose-100 border border-rose-500 text-rose-900 rounded-lg p-3 shadow-sm font-medium text-xs' },
//         { id: '3', position: { x: 500, y: 100 }, data: { label: 'Microservices & Scaling' }, className: 'bg-blue-100 border border-blue-500 text-blue-900 rounded-lg p-3 shadow-sm font-medium text-xs' }
//       ],
//       edges: [
//         { id: 'e1-2', source: '1', target: '2', animated: true, label: 'prerequisite' },
//         { id: 'e2-3', source: '2', target: '3', animated: true, label: 'leads to' }
//       ]
//     };
//   }
// }

// export async function getNodeContext(nodeId: string) {
//   try {
//     const response = await api.get(`/courses/node/${nodeId}/rag-context`);
//     return response.data;
//   } catch (error) {
//     return {
//       summary: 'This is a simulated RAG context excerpt extracted from the course materials, detailing core architectural trade-offs and patterns.',
//       references: [
//         { type: 'PDF', page: 14 },
//         { type: 'Video', timestamp: '08:45' }
//       ]
//     };
//   }
// }

import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Axios Request Interceptor for Automatic Auth Headers
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to auto-handle unauthorized states
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types & Payload Definitions
export interface QuizAnswer {
  quiz_id: string | number;
  selected_option_index: number;
}

export interface QuizAnswerPayload {
  node_id?: string;
  answers: QuizAnswer[];
}

export async function getCourseGraph(courseId: string) {
  try {
    const response = await api.get(`/courses/${courseId}/graph`);
    return response.data;
  } catch (error) {
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

export async function fetchNodeQuestions(nodeId: string, count: number = 10) {
  try {
    const response = await api.get(`/quizzes/node/${nodeId}/questions?count=${count}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch node questions:", error);
    throw error;
  }
}

export async function submitQuizScore(nodeId: string, answers: QuizAnswer[] | QuizAnswerPayload) {
  try {
    const payload = Array.isArray(answers) ? { answers } : answers;
    const response = await api.post(`/quizzes/node/${nodeId}/submit`, payload);
    return response.data;
  } catch (error) {
    console.error("Failed to submit quiz score:", error);
    throw error;
  }
}

export async function fetchStudentEnrollments() {
  try {
    const response = await api.get(`/enrollments/me`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    throw error;
  }
}