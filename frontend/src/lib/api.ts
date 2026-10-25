import axios from 'axios';

// Flag to prevent multiple simultaneous 401 redirect cascades
let isRedirecting = false;

// ---------------------------------------------------------------------------
// Axios Instance Configuration
// ---------------------------------------------------------------------------
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

// Automatic JWT Auth Header Injection
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const rawToken = localStorage.getItem('token');
      const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken.trim() : null;
      if (token) {
        if (config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          if (typeof config.headers.set === 'function') {
            config.headers.set('Authorization', `Bearer ${token}`);
          }
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Unauthorized Redirects & Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = 
        requestUrl.includes('/auth/login') || 
        requestUrl.includes('/auth/register');

      // Only handle 401 on protected resources (not on /auth/login or /auth/register)
      if (error.response?.status === 401 && !isAuthEndpoint) {
        const currentPath = window.location.pathname;

        // Clear invalid or expired credentials
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');

        // Only redirect if not already redirecting and not already on auth pages
        if (!isRedirecting && currentPath !== '/login' && currentPath !== '/register') {
          isRedirecting = true;
          console.warn('Session expired or token invalid. Redirecting to login...');
          window.location.replace('/login');
          setTimeout(() => {
            isRedirecting = false;
          }, 1500);
        }
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// TypeScript Interfaces
// ---------------------------------------------------------------------------

// Category
export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
}

// Instructor Summary
export interface InstructorSummary {
  id: string;
  full_name: string;
  email: string;
}

// Course Models
export interface Course {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  instructor_id?: string;
  status?: 'DRAFT' | 'PUBLISHED' | string;
  is_published?: boolean;
}

export interface CourseDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  category: Category;
  instructor: InstructorSummary;
  enrolled_students_count: number;
  total_nodes_count?: number;
  created_at?: string;
}

export interface CourseCreatePayload {
  title: string;
  description?: string;
  category_id: string;
}

// Node Graph Models
export type NodeProgressStatus = 'LOCKED' | 'UNLOCKED' | 'COMPLETED';

export interface GraphNode {
  id: string;
  node_key: string;
  title: string;
  summary: string;
  page_references?: string | string[];
  youtube_url?: string;
  youtube_timestamp_seconds?: number;
  position_x: number;
  position_y: number;
  status: NodeProgressStatus;
  best_score_percentage?: number | null;
  quizzes?: any[];
}

export interface GraphEdge {
  id?: string;
  source_node_key: string;
  target_node_key: string;
}

export interface CourseGraphResponse {
  course_id: string;
  course_title: string;
  course_description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Enrollment & Badge Models
export type EnrollmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';

export interface Badge {
  id: string;
  enrollment_id: number;
  badge_title: string;
  badge_image_url?: string | null;
  issued_at: string;
}

export interface CourseMini {
  id: string;
  title: string;
  description?: string;
}

export interface UserCourseEnrollment {
  id: number;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  enrolled_at: string;
  completed_at?: string | null;
  badge?: Badge | null;
  course?: CourseMini | null;
}

export interface EnrollmentCreatePayload {
  course_id: string;
}

export interface EnrollmentStatusUpdatePayload {
  status: EnrollmentStatus;
}

// Quiz Models
export interface QuizQuestion {
  id: number;
  node_id: string;
  set_number: number;
  question_text: string;
  options: string[];
  difficulty?: string;
}

export interface QuizAnswer {
  quiz_id: number;
  selected_option_index: number;
}

export interface BatchQuizSubmitRequest {
  set_number: number;
  answers: QuizAnswer[];
}

export interface QuestionFeedback {
  quiz_id: number;
  question_text: string;
  selected_option_index: number;
  correct_option_index: number;
  is_correct: boolean;
  explanation?: string;
}

export interface BatchQuizEvaluationResponse {
  attempt_id: number;
  set_number: number;
  score_percentage: number;
  total_questions: number;
  correct_answers_count: number;
  is_passed: boolean;
  node_fully_completed: boolean;
  unlocked_next_node_keys: string[];
  feedback: QuestionFeedback[];
}

export interface StudentProgressRecord {
  id: number;
  student_id: string;
  node_id: string;
  is_unlocked: boolean;
  is_completed: boolean;
  unlocked_at?: string | null;
  completed_at?: string | null;
}

// Admin Stats
export interface AdminStats {
  total_users: number;
  total_categories: number;
  total_courses: number;
}

// Instructor Graph Update Payload
export interface UpdateInstructorGraphPayload {
  course_title?: string;
  course_description?: string;
  nodes: Array<{
    id?: string;
    node_key?: string;
    title?: string;
    summary?: string;
    position_x?: number;
    position_y?: number;
  }>;
  edges?: Array<{
    source_node_key: string;
    target_node_key: string;
  }>;
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

// 1. Course Discovery & Details
export async function getPublishedCourses(params?: {
  q?: string;
  category?: string;
  skip?: number;
  limit?: number;
}): Promise<CourseDetail[]> {
  const response = await api.get<CourseDetail[]>('/courses/published', { params });
  return response.data;
}

export async function getCoursePublicDetails(courseId: string): Promise<CourseDetail> {
  const response = await api.get<CourseDetail>(`/courses/details/${courseId}`);
  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>('/courses/categories');
  return response.data;
}

// 2. Student Enrollments
export async function enrollInCourse(courseId: string): Promise<UserCourseEnrollment> {
  const response = await api.post<UserCourseEnrollment>('/enrollments/', { course_id: courseId });
  return response.data;
}

export async function getMyEnrollments(): Promise<UserCourseEnrollment[]> {
  const response = await api.get<UserCourseEnrollment[]>('/enrollments/me');
  return response.data;
}

export async function getEnrollmentByCourse(courseId: string): Promise<UserCourseEnrollment> {
  const response = await api.get<UserCourseEnrollment>(`/enrollments/${courseId}`);
  return response.data;
}

export async function updateEnrollmentStatus(
  enrollmentId: number,
  status: EnrollmentStatus
): Promise<UserCourseEnrollment> {
  const response = await api.patch<UserCourseEnrollment>(`/enrollments/${enrollmentId}/status`, { status });
  return response.data;
}

// 3. Student Graph & Quizzes
export async function getCourseGraph(courseId: string): Promise<CourseGraphResponse> {
  const response = await api.get<CourseGraphResponse>(`/courses/${courseId}/graph`);
  return response.data;
}

export async function fetchNodeQuestions(
  nodeId: string,
  setNumber: number = 1,
  count: number = 10
): Promise<QuizQuestion[]> {
  const response = await api.get<QuizQuestion[]>(`/quizzes/node/${nodeId}/questions`, {
    params: { set_number: setNumber, count },
  });
  return response.data;
}

export async function submitNodeQuiz(
  nodeId: string,
  submission: BatchQuizSubmitRequest
): Promise<BatchQuizEvaluationResponse> {
  const response = await api.post<BatchQuizEvaluationResponse>(`/quizzes/node/${nodeId}/submit`, submission);
  return response.data;
}

export async function getStudentCourseProgress(courseId: string): Promise<StudentProgressRecord[]> {
  const response = await api.get<StudentProgressRecord[]>(`/quizzes/course/${courseId}/progress`);
  return response.data;
}

// 4. Instructor Endpoints
export async function getInstructorDrafts(): Promise<Course[]> {
  const response = await api.get<Course[]>('/courses/instructor/drafts');
  return response.data;
}

export async function getInstructorCourseGraph(courseId: string): Promise<{
  course_id: string;
  course_title: string;
  course_description?: string;
  nodes: any[];
  edges: any[];
}> {
  const response = await api.get(`/courses/instructor/${courseId}/graph`);
  return response.data;
}

export async function updateInstructorCourseGraph(
  courseId: string,
  payload: UpdateInstructorGraphPayload
): Promise<{ message: string; course_id: string }> {
  const response = await api.put<{ message: string; course_id: string }>(
    `/courses/instructor/${courseId}/graph`,
    payload
  );
  return response.data;
}

export async function publishCourse(courseId: string): Promise<Course> {
  const response = await api.put<Course>(`/courses/${courseId}/publish`);
  return response.data;
}

export async function createCourse(data: CourseCreatePayload): Promise<Course> {
  const response = await api.post<Course>('/courses/', data);
  return response.data;
}

// 5. Admin Endpoints
export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/courses/admin/stats');
  return response.data;
}

export async function createCategory(category: CategoryCreate): Promise<Category> {
  const response = await api.post<Category>('/courses/categories', category);
  return response.data;
}

// Deprecated alias helpers for backwards compatibility
export const fetchStudentEnrollments = getMyEnrollments;
export async function submitQuizScore(
  nodeId: string,
  answersOrPayload: QuizAnswer[] | { answers: QuizAnswer[]; set_number?: number }
) {
  const payload: BatchQuizSubmitRequest = Array.isArray(answersOrPayload)
    ? { set_number: 1, answers: answersOrPayload }
    : { set_number: answersOrPayload.set_number || 1, answers: answersOrPayload.answers };
  return submitNodeQuiz(nodeId, payload);
}