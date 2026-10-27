'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '@/src/lib/api';

interface Course {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  is_published?: boolean;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State for New Course
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      // Using the correct Swagger endpoint: GET /courses/published
      const res = await api.get('/courses/published');
      const courseData = Array.isArray(res.data) ? res.data : (res.data?.courses || res.data?.items || []);
      setCourses(courseData);
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.response?.data?.detail || 'Failed to load published courses from the server.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    setNotification(null);
    try {
      const res = await api.post('/courses/', {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        is_published: true
      });
      setCourses((prev) => [res.data, ...prev]);
      setNotification({ type: 'success', message: `Course "${res.data.title}" published successfully.` });
      setNewTitle('');
      setNewDescription('');
      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to create course.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses(courses.filter(c => c.id !== id));
      setNotification({ type: 'success', message: 'Course deleted successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to delete course.' });
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="w-10 h-10 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/45 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">ADMINISTRATION SUITE</span>
              <h2 className="text-base font-black text-[#112217]">Admin Course Management</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Publish New Course
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">
          
          {notification && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
              notification.type === 'success' 
                ? 'bg-[#d3efdc]/80 border-[#bce8c9] text-[#112217]' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#e2eae4] pb-5">
              <div>
                <h3 className="text-sm font-black text-[#112217]">Published Platform Courses</h3>
                <p className="text-[11px] text-[#4a6b5d]">Review and manage active curriculum knowledge graphs and study modules.</p>
              </div>
              <span className="text-xs font-bold bg-[#d3efdc]/60 text-[#2e5a44] px-3.5 py-1.5 rounded-full border border-[#bce8c9]">
                {courses.length} Active Courses
              </span>
            </div>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl font-bold">
                {error}
              </div>
            )}

            <div className="border border-[#e2eae4] rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[11px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">
                    <th className="p-4 pl-6">Course Title</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f1] text-xs text-[#112217]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-[#4a6b5d]">
                        <Loader2 className="animate-spin text-[#2e5a44] mx-auto mb-2" size={24} />
                        Loading published courses...
                      </td>
                    </tr>
                  ) : courses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-[#4a6b5d]">
                        No courses found. Click "Publish New Course" to add curriculum content.
                      </td>
                    </tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className="hover:bg-[#fbfcfb] transition">
                        <td className="p-4 pl-6 font-black text-[#112217] flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#d3efdc]/60 text-[#2e5a44] flex items-center justify-center shrink-0">
                            <BookOpen size={15} />
                          </div>
                          <span>{course.title}</span>
                        </td>
                        <td className="p-4 text-[#4a6b5d] max-w-md truncate">
                          {course.description || 'No description provided.'}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Published
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => router.push(`/student/course/${course.id}`)}
                              className="px-3 py-1.5 bg-[#f4f7f4] hover:bg-[#e2eae4] text-[#112217] rounded-xl text-xs font-bold transition cursor-pointer border border-[#e2eae4]"
                            >
                              View Graph
                            </button>
                            {/*<button 
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Delete Course"
                            >
                              <Trash2 size={15} />
                            </button>*/}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </main>

      {/* Modal for Creating New Course */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#112217]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-2xl w-full max-w-md p-8 space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2eae4]">
              <div className="flex items-center gap-2">
                <BookOpen className="text-[#2e5a44]" size={20} />
                <h3 className="text-sm font-black text-[#112217]">Publish New Course</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-[#112217] p-1 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                  Course Title *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Advanced Neural Networks for NLP"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                  Course Description
                </label>
                <textarea 
                  rows={3}
                  placeholder="Summary of learning outcomes and knowledge graph topics..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl p-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] resize-none shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-[#4a6b5d] hover:bg-[#f4f7f4] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={13} />}
                  <span>Publish Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}