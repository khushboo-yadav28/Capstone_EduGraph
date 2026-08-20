const API_BASE = 'http://localhost:8000';

function getHeaders() {
  const token = localStorage.getItem('token') || 'mock-jwt-token-edugraph-2026';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function fetchCourseGraph(courseId: string) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/graph`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch course graph');
  return res.json();
}

export async function fetchNodeQuestions(nodeId: string) {
  const res = await fetch(`${API_BASE}/quizzes/node/${nodeId}/questions?count=10`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch quiz questions');
  return res.json();
}

export async function submitQuizScore(nodeId: string, answers: { quiz_id: number; selected_option_index: number }[]) {
  const res = await fetch(`${API_BASE}/quizzes/node/${nodeId}/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error('Failed to submit quiz');
  return res.json();
}

export async function fetchStudentEnrollments() {
  const res = await fetch(`${API_BASE}/enrollments/me`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch enrollments');
  return res.json();
}