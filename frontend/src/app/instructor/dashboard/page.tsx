'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  Upload, 
  Cpu, 
  TrendingUp, 
  Bell, 
  LogOut, 
  User, 
  X, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Globe, 
  Lock, 
  Trash2, 
  ArrowRight,
  Plus,
  GitBranch,
  Layers,
  Loader2,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { 
  api, 
  Course, 
  Category, 
  getInstructorDrafts, 
  getCategories, 
  publishCourse, 
  createCourse 
} from '@/src/lib/api';

export default function InstructorDashboard() {
  const router = useRouter();

  // Metrics and Courses States
  const [metrics, setMetrics] = useState({
    activeUsers: '112',
    categoriesCount: '0',
    draftCoursesCount: '0',
    publishedCoursesCount: '0',
  });

  const [draftCourses, setDraftCourses] = useState<Course[]>([]);
  const [publishedCourses, setPublishedCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'drafts' | 'published'>('drafts');

  // Modal & Upload States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [step, setStep] = useState<'create' | 'upload' | 'switch-to-upload'>('create');
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Authentication Guard & Fetch Data
  const fetchDashboardData = useCallback(async () => {
    try {
      const [categoriesRes, draftsRes, publishedRes] = await Promise.allSettled([
        getCategories(),
        getInstructorDrafts(),
        api.get('/courses/published')
      ]);

      const cats = categoriesRes.status === 'fulfilled' ? categoriesRes.value : [];
      setCategories(cats);
      if (cats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(cats[0].id);
      }

      const drafts = draftsRes.status === 'fulfilled' ? draftsRes.value : [];
      setDraftCourses(drafts);

      const published = publishedRes.status === 'fulfilled' ? publishedRes.value.data || [] : [];
      setPublishedCourses(published);

      setMetrics({
        activeUsers: '112',
        categoriesCount: String(cats.length || 0),
        draftCoursesCount: String(drafts.length || 0),
        publishedCoursesCount: String(published.length || 0),
      });
    } catch (err) {
      console.error('Error fetching instructor dashboard data', err);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [router, fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  // Step 1: Create Course Shell
  const handleCreateCourseShell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle || !selectedCategoryId) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const response = await createCourse({
        title: courseTitle,
        description: courseDescription,
        category_id: selectedCategoryId
      });

      const newId = response.id;
      if (!newId) throw new Error('Backend did not return course ID');

      setCreatedCourseId(newId);
      setDraftCourses((prev) => [response, ...prev]);
      setMetrics((prev) => ({ ...prev, draftCoursesCount: String(Number(prev.draftCoursesCount) + 1) }));
      setStep('switch-to-upload');
    } catch (err: any) {
      console.error('Error creating course shell', err);
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to create course shell on backend.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Ingest PDF using the newly generated Course UUID
  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !createdCourseId) return;

    setLoading(true);
    setSuccessMsg(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.post(`/courses/${createdCourseId}/ingest-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg(true);
      await fetchDashboardData();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(false);
        setSelectedFile(null);
        setStep('create');
        setCourseTitle('');
        setCourseDescription('');
      }, 2000);
    } catch (err: any) {
      console.warn('Error uploading PDF:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to ingest PDF into course.';
      setStatusMessage({ 
        type: 'error', 
        text: detail 
      });
      setIsModalOpen(false);
      setSuccessMsg(false);
      setStep('create');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadForDraft = (courseId: string) => {
    setCreatedCourseId(courseId);
    setStep('upload');
    setSelectedFile(null);
    setSuccessMsg(false);
    setIsModalOpen(true);
  };

  // Publish Draft Course Endpoint
  const handlePublishCourse = async (courseId: string) => {
    setActionLoading(courseId);
    setStatusMessage(null);
    try {
      await publishCourse(courseId);
      setStatusMessage({ type: 'success', text: 'Course published successfully to public catalog!' });
      await fetchDashboardData();
    } catch (err: any) {
      console.warn('Publish course validation error:', err.response?.data?.detail || err.message);
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to publish course. Ensure it has learning nodes generated.' 
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Course Endpoint
  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course shell? This action cannot be undone.')) return;
    setActionLoading(courseId);
    try {
      await api.delete(`/courses/${courseId}`);
      setDraftCourses((prev) => prev.filter((c) => c.id !== courseId));
      setPublishedCourses((prev) => prev.filter((c) => c.id !== courseId));
      setStatusMessage({ type: 'success', text: 'Course deleted successfully.' });
      await fetchDashboardData();
    } catch (err: any) {
      console.error('Delete error', err);
      setDraftCourses((prev) => prev.filter((c) => c.id !== courseId));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2eae4] p-6 flex flex-col justify-between hidden md:flex shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <h1 className="text-base font-black tracking-tight text-[#112217]">
              EduGraph <span className="text-[#2e5a44]">Faculty</span>
            </h1>
          </div>

          <nav className="space-y-1.5">
            <a href="/instructor/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold shadow-sm">
              <BookOpen size={16} className="text-[#2e5a44]" /> Manage Courses
            </a>
            <button 
              onClick={() => { setStep('create'); setIsModalOpen(true); }} 
              className="w-full flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition text-left cursor-pointer"
            >
              <Upload size={16} /> Ingest Syllabus PDF
            </button>
            {/*<a href="/instructor/courses" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <GitBranch size={16} /> Fast Ingestion
            </a>*/}
            <a href="/instructor/profile" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <User size={16} /> Faculty Profile
            </a>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition px-3 py-2 rounded-xl hover:bg-rose-50 w-fit cursor-pointer"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between z-10 shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">INSTRUCTOR PORTAL</span>
            <h2 className="text-base font-black text-[#112217]">Curriculum & Drafts Management</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setStep('create'); setIsModalOpen(true); }}
              className="px-4 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> New Course Draft
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-[#e2eae4]">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/instructor/profile')}>
                <div className="w-9 h-9 rounded-full bg-[#2e5a44] text-white flex items-center justify-center text-xs font-bold shadow-md">
                  I
                </div>
                <span className="text-xs font-bold text-[#112217]">Instructor ▾</span>
              </div>
              
              <button 
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100 cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">
          
          {/* Status Alert Banner */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
              statusMessage.type === 'success' 
                ? 'bg-[#d3efdc]/70 border-[#bce8c9] text-[#112217]' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            
            <div className="md:col-span-2 bg-[#d3efdc]/40 border border-[#bce8c9] rounded-[28px] p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-1">
                <span className="px-3 py-0.5 bg-white text-[#112217] rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles size={11} /> AI Knowledge Extraction
                </span>
                <h3 className="text-sm font-black text-[#112217] pt-1">Create Course & Ingest PDF</h3>
                <p className="text-[11px] text-[#4a6b5d]">
                  Set up a draft course and upload your syllabus to generate nodes, prerequisites, and automated quiz pools.
                </p>
              </div>
              <button 
                onClick={() => { setStep('create'); setIsModalOpen(true); }}
                className="bg-[#112217] text-white px-5 py-3 rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center gap-2 w-fit cursor-pointer"
              >
                <Upload size={14} /> Ingest Syllabus PDF
              </button>
            </div>

            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-bold text-[#4a6b5d]">Instructor Drafts</span>
              <span className="text-3xl font-black text-[#112217]">{metrics.draftCoursesCount}</span>
            </div>

            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-bold text-[#4a6b5d]">Published Courses</span>
              <span className="text-3xl font-black text-[#2e5a44]">{metrics.publishedCoursesCount}</span>
            </div>

          </div>

          {/* Drafts vs Published Course Management Tabs */}
          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2eae4] pb-4">
              <div className="flex items-center gap-2 bg-[#f4f7f4] p-1 rounded-2xl border border-[#e2eae4]">
                <button
                  onClick={() => setActiveTab('drafts')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'drafts'
                      ? 'bg-[#112217] text-white shadow-sm'
                      : 'text-[#4a6b5d] hover:text-[#112217]'
                  }`}
                >
                  <Lock size={13} />
                  <span>My Draft Courses ({draftCourses.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('published')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'published'
                      ? 'bg-[#112217] text-white shadow-sm'
                      : 'text-[#4a6b5d] hover:text-[#112217]'
                  }`}
                >
                  <Globe size={13} />
                  <span>Published Catalog ({publishedCourses.length})</span>
                </button>
              </div>

              <span className="text-xs text-[#4a6b5d] font-bold">
                {activeTab === 'drafts' ? 'Review & publish drafts' : 'Courses live for student enrollment'}
              </span>
            </div>

            {/* Courses List */}
            <div className="space-y-3">
              {activeTab === 'drafts' ? (
                draftCourses.length > 0 ? (
                  draftCourses.map((course) => (
                    <div 
                      key={course.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border border-[#e2eae4] bg-white hover:border-[#2e5a44] transition shadow-sm gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#112217]">{course.title}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                            Draft Shell
                          </span>
                          {(course as any).nodes_count === 0 ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertCircle size={10} /> 0 Nodes (Upload PDF Required)
                            </span>
                          ) : (course as any).nodes_count > 0 ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-[#d3efdc] text-[#2e5a44] border border-[#bce8c9]">
                              {(course as any).nodes_count} Nodes Ready
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-[#4a6b5d] line-clamp-1">
                          {course.description || 'Draft knowledge graph awaiting syllabus PDF ingestion or node layout confirmation.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        {/* Ingest / Upload Syllabus PDF to Draft */}
                        <button 
                          onClick={() => handleOpenUploadForDraft(course.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                            (course as any).nodes_count === 0
                              ? 'bg-[#2e5a44] text-white hover:bg-[#223d2f] ring-2 ring-[#2e5a44]/30'
                              : 'bg-white border border-[#2e5a44] text-[#2e5a44] hover:bg-[#d3efdc]/30'
                          }`}
                          title="Upload syllabus PDF to extract knowledge graph nodes"
                        >
                          <Upload size={13} />
                          <span>Upload PDF</span>
                        </button>

                        {/* Open Advanced Graph Editor Button */}
                        <button 
                          onClick={() => router.push(`/instructor/course/${course.id}`)}
                          className="px-3.5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#223d2f] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Open Graph Editor to edit node positions, summaries, and edges"
                        >
                          <GitBranch size={13} />
                          <span>Graph Editor</span>
                        </button>

                        {/* Publish Course Button */}
                        <button 
                          onClick={() => {
                            if ((course as any).nodes_count === 0) {
                              setStatusMessage({
                                type: 'error',
                                text: `Cannot publish "${course.title}": This course has 0 learning nodes. Please click 'Upload PDF' to generate the knowledge graph first.`
                              });
                              return;
                            }
                            handlePublishCourse(course.id);
                          }}
                          disabled={actionLoading === course.id}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                            (course as any).nodes_count === 0
                              ? 'bg-slate-300 text-slate-600 hover:bg-slate-400'
                              : 'bg-[#2e5a44] text-white hover:bg-[#244735]'
                          } disabled:opacity-50`}
                          title={(course as any).nodes_count === 0 ? "Upload a PDF first to generate nodes" : "Publish course to public catalog"}
                        >
                          {actionLoading === course.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Globe size={13} />
                          )}
                          <span>Publish</span>
                        </button>

                        {/* Delete Draft Button */}
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          disabled={actionLoading === course.id}
                          className="p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-100 transition cursor-pointer"
                          title="Delete draft course"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-2 bg-white rounded-2xl border border-dashed border-[#e2eae4]">
                    <p className="text-xs font-bold text-[#112217]">No draft courses currently pending.</p>
                    <p className="text-[11px] text-[#4a6b5d]">Click 'Ingest Syllabus PDF' or 'New Course Draft' to create your next curriculum.</p>
                  </div>
                )
              ) : (
                publishedCourses.length > 0 ? (
                  publishedCourses.map((course) => (
                    <div 
                      key={course.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border border-[#e2eae4] bg-white hover:border-[#2e5a44] transition shadow-sm gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-black text-[#112217]">{course.title}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-[#d3efdc] text-[#112217] border border-[#bce8c9]">
                            Live Published
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4a6b5d] line-clamp-1">
                          {course.description || 'Published course visible to students in discovery catalog.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button 
                          onClick={() => router.push(`/instructor/course/${course.id}`)}
                          className="px-3.5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#223d2f] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <GitBranch size={13} />
                          <span>View Graph</span>
                        </button>

                        <button
                          onClick={() => router.push(`/instructor/course/${course.id}/analytics`)}
                          className="px-3.5 py-2 bg-[#f4f7f4] hover:bg-[#d3efdc]/50 text-[#2e5a44] border border-[#e2eae4] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="View Student Retention & Difficulty Heatmap"
                        >
                          <BarChart3 size={14} /> Analytics
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-2 bg-white rounded-2xl border border-dashed border-[#e2eae4]">
                    <p className="text-xs font-bold text-[#112217]">No published courses in catalog yet.</p>
                    <p className="text-[11px] text-[#4a6b5d]">Publish an existing draft course to make it discoverable to students.</p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Dynamic Two-Step Course Creation & PDF Ingestion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#112217]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-2xl w-full max-w-lg p-8 space-y-6 relative">
            <button 
              onClick={() => { setIsModalOpen(false); setStep('create'); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-[#112217] p-1 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {step === 'create' && (
              <>
                <div className="flex items-center gap-2 border-b border-[#e2eae4] pb-4">
                  <BookOpen className="text-[#2e5a44]" size={20} />
                  <h3 className="text-sm font-black text-[#112217]">Step 1: Create Draft Course Shell</h3>
                </div>

                <form onSubmit={handleCreateCourseShell} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                      Course Title *
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Distributed Database Architecture"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                      Description (Optional)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Course objectives, prerequisites, and learning outcomes..."
                      value={courseDescription}
                      onChange={(e) => setCourseDescription(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] resize-none shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                      Select Taxonomy Category *
                    </label>
                    <select 
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm cursor-pointer"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      {categories.length === 0 && (
                        <option value="3fa85f64-5717-4562-b3fc-2c963f66afa6">Computer Science & Systems</option>
                      )}
                    </select>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#112217] text-white rounded-2xl py-3.5 text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Creating Shell...' : 'Next: Upload Syllabus PDF'} &rarr;</span>
                  </button>
                </form>
              </>
            )}

            {(step === 'switch-to-upload' || step === 'upload') && (
              <>
                <div className="flex items-center gap-2 border-b border-[#e2eae4] pb-4">
                  <FileText className="text-[#2e5a44]" size={20} />
                  <h3 className="text-sm font-black text-[#112217]">Step 2: Upload PDF for Graph Extraction</h3>
                </div>

                <form onSubmit={handleFileUploadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                      Course UUID
                    </label>
                    <input 
                      type="text" 
                      value={createdCourseId || ''}
                      readOnly
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#4a6b5d] font-mono select-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                      Select Syllabus / Textbook PDF *
                    </label>
                    <div className="border-2 border-dashed border-[#2e5a44]/30 rounded-2xl p-6 text-center bg-white hover:bg-[#d3efdc]/10 transition cursor-pointer shadow-sm">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-[#4a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#d3efdc] file:text-[#112217] hover:file:bg-[#bce8c9] cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !selectedFile}
                    className="w-full bg-[#112217] text-white rounded-2xl py-3.5 text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>{loading ? 'Processing Gemini AI Extraction (75s)...' : 'Upload & Trigger Graph Ingestion'}</span>
                  </button>
                </form>

                {successMsg && (
                  <div className="p-4 bg-[#d3efdc]/70 border border-[#bce8c9] text-[#112217] text-xs rounded-2xl flex items-center gap-2 font-bold shadow-sm">
                    <CheckCircle2 size={16} className="text-[#2e5a44]" />
                    <span>PDF ingested successfully! Draft nodes and quizzes are ready for review.</span>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}