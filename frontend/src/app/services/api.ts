const API_BASE = 'http://localhost:8000';

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || 'mock-jwt-token-edugraph-2026' : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Universal API fetch client interface
export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return { data };
  },
  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return { data };
  }
};

// Types & Payload Definitions
export interface QuizAnswer {
  quiz_id: string | number;
  selected_option_index: number;
}

export interface QuizAnswerPayload {
  node_id?: string;
  answers: QuizAnswer[];
}

// Function Helpers
export async function fetchCourseGraph(courseId: string) {
  const res = await api.get(`/courses/${courseId}/graph`);
  return res.data;
}

export async function fetchNodeQuestions(nodeId: string, count: number = 10) {
  const res = await api.get(`/quizzes/node/${nodeId}/questions?count=${count}`);
  return res.data;
}

export async function submitQuizScore(nodeId: string, answers: QuizAnswer[] | QuizAnswerPayload) {
  const payload = Array.isArray(answers) ? { answers } : answers;
  const res = await api.post(`/quizzes/node/${nodeId}/submit`, payload);
  return res.data;
}

export async function fetchStudentEnrollments() {
  const res = await api.get(`/enrollments/me`);
  return res.data;
}