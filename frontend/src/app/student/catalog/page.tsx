'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  BookOpen, 
  Users, 
  ArrowRight, 
  GitBranch, 
  ArrowLeft, 
  Filter, 
  Sparkles, 
  Network, 
  CheckCircle2, 
  Info, 
  X, 
  Loader2,
  GraduationCap,
  Layers,
  Calendar,
  UserCheck
} from 'lucide-react';
import { 
  api, 
  CourseDetail, 
  Category, 
  UserCourseEnrollment,
  getPublishedCourses, 
  getCoursePublicDetails, 
  enrollInCourse, 
  getMyEnrollments,
  getCategories 
} from '@/src/lib/api';

export default function CourseCatalogPage() {
  const router = useRouter();

  // State Management
  const [courses, setCourses] = useState<CourseDetail[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<UserCourseEnrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Detail Modal States
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Load Enrollments & Categories once on mount
  useEffect(() => {
    async function initData() {
      try {
        const [catsRes, enrollsRes] = await Promise.allSettled([
          getCategories(),
          getMyEnrollments(),
        ]);

        if (catsRes.status === 'fulfilled') {
          setCategories(catsRes.value || []);
        }

        if (enrollsRes.status === 'fulfilled') {
          setMyEnrollments(enrollsRes.value || []);
        }
      } catch (err) {
        console.error('Error initializing catalog metadata', err);
      }
    }
    initData();
  }, []);

  // Fetch published courses with search & category filters
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params: { q?: string; category?: string } = {};
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      if (selectedCategory !== 'All') {
        params.category = selectedCategory;
      }

      const data = await getPublishedCourses(params);
      setCourses(data || []);
    } catch (err) {
      console.warn('Failed to load published courses from API, checking fallback', err);
      // Fallback demo dataset if backend has not published any courses yet
      setCourses([
        {
          id: '5208c480-174a-4767-981e-35d8d38cb5ca',
          title: 'Advanced Data Science and Programming Essentials with Python',
          description: 'Master core data structures, algorithms, vectorized computation, and machine learning pipelines using graph-based paths.',
          status: 'PUBLISHED',
          category: { id: 'c1', name: 'AI & Data Science', description: 'Artificial Intelligence & Data Science' },
          instructor: { id: 'i1', full_name: 'Dr. Sarah Lin', email: 'sarah.lin@edugraph.edu' },
          enrolled_students_count: 450,
          total_nodes_count: 12
        },
        {
          id: '4598b62a-000e-40b6-951c-1a377c667459',
          title: 'Data Warehousing and Data Mining - Fundamentals',
          description: 'Architect scalable analytics repositories, ETL pipelines, dimensional models, and OLAP cubes.',
          status: 'PUBLISHED',
          category: { id: 'c2', name: 'Data Engineering', description: 'Big Data & Pipeline Engineering' },
          instructor: { id: 'i2', full_name: 'Prof. Marcus Vance', email: 'marcus.vance@edugraph.edu' },
          enrolled_students_count: 320,
          total_nodes_count: 8
        },
        {
          id: '38ef3435-a4c8-485e-9199-13556f896be0',
          title: 'Introduction to Blockchain Technology & Smart Contracts',
          description: 'Explore consensus algorithms, distributed ledger mechanisms, cryptographic primitives, and smart contract development.',
          status: 'PUBLISHED',
          category: { id: 'c3', name: 'Blockchain', description: 'Web3 & Distributed Ledgers' },
          instructor: { id: 'i3', full_name: 'Elena Rostova', email: 'elena.rostova@edugraph.edu' },
          enrolled_students_count: 610,
          total_nodes_count: 10
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCourses]);

  // Check enrollment helper
  const getEnrollmentForCourse = (courseId: string) => {
    return myEnrollments.find((e) => String(e.course_id) === String(courseId));
  };

  // Open Course Details Modal
  const handleOpenCourseDetails = async (courseId: string) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const detail = await getCoursePublicDetails(courseId);
      setSelectedCourseDetail(detail);
    } catch (err) {
      console.warn('Could not load single course details via API, using current list item', err);
      const fallback = courses.find((c) => String(c.id) === String(courseId));
      if (fallback) setSelectedCourseDetail(fallback);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Enrollment
  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    setNotification(null);
    try {
      const newEnrollment = await enrollInCourse(courseId);
      setMyEnrollments((prev) => [...prev, newEnrollment]);
      setNotification({
        type: 'success',
        message: 'Successfully enrolled in course! You can now start learning on the interactive graph.'
      });
      // Refresh enrollments in background
      getMyEnrollments().then((res) => setMyEnrollments(res)).catch(() => {});
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Enrollment failed. You might already be enrolled or need to log in.';
      setNotification({ type: 'error', message: msg });
    } finally {
      setEnrollingId(null);
    }
  };

  // Unique categories list
  const categoryNames = ['All', ...Array.from(new Set(categories.map((c) => c.name)))];
  if (categoryNames.length === 1) {
    categoryNames.push('AI & Data Science', 'Data Engineering', 'Blockchain', 'Computer Science');
  }

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1e2923] flex flex-col selection:bg-[#2e5a44] selection:text-white">
      
      {/* Top Header */}
      <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/student/dashboard')}
            className="p-2.5 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"
            title="Return to Student Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <span className="text-base font-black tracking-tight text-[#112217]">
              EduGraph <span className="text-[#2e5a44]">Catalog</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/student/dashboard')}
            className="text-xs font-bold text-[#4a6b5d] hover:text-[#112217] transition cursor-pointer"
          >
            Back to Dashboard
          </button>
          <button 
            onClick={() => router.push('/student/dashboard')}
            className="px-4 py-2 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md cursor-pointer flex items-center gap-2"
          >
            <GraduationCap size={15} /> My Enrollments ({myEnrollments.length})
          </button>
        </div>
      </header>

      {/* Hero Banner Header */}
      <section className="bg-gradient-to-r from-[#112217] via-[#1b3425] to-[#223d2f] text-white py-14 px-8 text-center space-y-6 relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 w-80 h-full bg-[#d3efdc]/10 rounded-l-full pointer-events-none blur-2xl"></div>
        <div className="absolute left-0 bottom-0 w-64 h-32 bg-[#2e5a44]/20 rounded-tr-full pointer-events-none blur-xl"></div>
        
        <div className="max-w-3xl mx-auto space-y-3 relative z-10">
          <span className="px-4 py-1.5 bg-[#d3efdc]/20 text-[#d3efdc] border border-[#d3efdc]/30 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm">
            <Sparkles size={12} /> Student Course Discovery
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Explore Interactive Knowledge Graphs
          </h1>
          <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
            Browse published courses verified by faculty. Inspect syllabus topics, unlock prerequisite-driven DAG paths, and enroll directly into adaptive learning graphs.
          </p>
          
          {/* Search Bar */}
          <div className="flex items-center bg-[#fbfcfb] rounded-2xl p-2.5 max-w-xl mx-auto shadow-2xl border border-[#e2eae4] mt-6">
            <Search className="text-[#4a6b5d] ml-3 shrink-0" size={18} />
            <input 
              type="text" 
              placeholder="Search published courses by title, keywords, or instructor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs text-[#112217] outline-none bg-transparent placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1.5 text-slate-400 hover:text-[#112217] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto px-8 pt-6 w-full">
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
            notification.type === 'success' 
              ? 'bg-[#d3efdc]/70 border-[#bce8c9] text-[#112217]' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 size={18} className="text-[#2e5a44]" />
              ) : (
                <Info size={18} className="text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:opacity-75 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Catalog Content */}
      <section className="max-w-7xl mx-auto px-8 py-10 flex-1 w-full space-y-8">
        
        {/* Category Filter Pills & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2eae4] pb-5">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 max-w-full">
            <Filter size={15} className="text-[#4a6b5d] mr-1 shrink-0" />
            {categoryNames.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-sm ${
                  selectedCategory === cat 
                    ? 'bg-[#112217] text-white shadow-md' 
                    : 'bg-white border border-[#e2eae4] text-[#4a6b5d] hover:bg-[#d3efdc]/30 hover:text-[#112217]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#4a6b5d] font-bold shrink-0">
            {courses.length} {courses.length === 1 ? 'Course' : 'Courses'} Available
          </span>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="text-center py-24 space-y-3">
            <Loader2 className="animate-spin text-[#2e5a44] mx-auto" size={28} />
            <p className="text-xs text-[#4a6b5d] font-medium animate-pulse">Loading published course catalog...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 space-y-3 bg-[#fbfcfb] rounded-[32px] border border-[#e2eae4]">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center mx-auto text-[#4a6b5d]">
              <Search size={22} />
            </div>
            <p className="text-sm font-black text-[#112217]">No published courses match your criteria.</p>
            <p className="text-xs text-[#4a6b5d]">Try clearing your search query or choosing another taxonomy category.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-2 px-5 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const enrollment = getEnrollmentForCourse(course.id);
              const isEnrolled = Boolean(enrollment);
              const progressPct = enrollment?.progress_percentage ?? 0;
              const isEnrolling = enrollingId === course.id;

              return (
                <div 
                  key={course.id} 
                  className="bg-[#fbfcfb] rounded-[28px] border border-[#e2eae4] overflow-hidden shadow-sm hover:shadow-md hover:border-[#2e5a44] transition-all flex flex-col justify-between group"
                >
                  <div className="p-6 space-y-4">
                    {/* Category & Status */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-3 py-1 bg-[#d3efdc]/60 text-[#112217] rounded-xl border border-[#bce8c9]">
                        {course.category?.name || 'General Category'}
                      </span>
                      {isEnrolled ? (
                        <span className="text-[10px] font-extrabold text-[#2e5a44] bg-[#d3efdc] px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                          <CheckCircle2 size={12} /> {progressPct}% Done
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#4a6b5d] bg-white border border-[#e2eae4] px-2.5 py-1 rounded-xl">
                          Open Enrollment
                        </span>
                      )}
                    </div>

                    {/* Course Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-black text-[#112217] group-hover:text-[#2e5a44] transition leading-snug line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-[#4a6b5d] line-clamp-2 leading-relaxed font-normal">
                        {course.description || 'Interactive knowledge graph courseware with automated evaluation and study resources.'}
                      </p>
                    </div>

                    {/* Instructor Info */}
                    <div className="flex items-center gap-2 pt-2 text-[11px] text-[#112217] font-semibold">
                      <div className="w-6 h-6 rounded-full bg-[#112217] text-white flex items-center justify-center text-[10px] font-bold">
                        {course.instructor?.full_name?.charAt(0) || 'I'}
                      </div>
                      <span className="truncate">{course.instructor?.full_name || 'EduGraph Faculty'}</span>
                    </div>

                    {/* Meta Counters */}
                    <div className="flex items-center gap-6 text-xs text-[#4a6b5d] pt-3 border-t border-[#f0f4f1]">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-[#2e5a44]" /> 
                        {course.total_nodes_count ?? 'Multi-topic'} Nodes
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-[#2e5a44]" /> 
                        {course.enrolled_students_count ?? 0} Students
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-6 py-4 bg-white border-t border-[#e2eae4] flex items-center justify-between gap-3">
                    <button 
                      onClick={() => handleOpenCourseDetails(course.id)}
                      className="text-xs font-bold text-[#4a6b5d] hover:text-[#112217] transition flex items-center gap-1 cursor-pointer"
                      title="Inspect full syllabus and course details"
                    >
                      <Info size={14} /> Details
                    </button>

                    {isEnrolled ? (
                      <button 
                        onClick={() => router.push(`/student/course/${course.id}`)}
                        className="px-4.5 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <GitBranch size={13} /> Open Graph <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEnroll(course.id)}
                        disabled={isEnrolling}
                        className="px-4.5 py-2.5 bg-[#2e5a44] text-white rounded-2xl text-xs font-bold hover:bg-[#244735] transition shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isEnrolling ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Enrolling...
                          </>
                        ) : (
                          <>
                            Enroll Course <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Course Detail Landing Modal (GET /courses/details/{course_id}) */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-[#112217]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 space-y-6 relative">
            <button 
              onClick={() => { setDetailModalOpen(false); setSelectedCourseDetail(null); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-[#112217] p-1 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {loadingDetail ? (
              <div className="text-center py-16 space-y-3">
                <Loader2 size={24} className="animate-spin text-[#2e5a44] mx-auto" />
                <p className="text-xs text-[#4a6b5d] font-bold">Fetching comprehensive course metadata...</p>
              </div>
            ) : selectedCourseDetail ? (
              <>
                <div className="space-y-2 border-b border-[#e2eae4] pb-5">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] rounded-xl text-[10px] font-bold uppercase">
                      {selectedCourseDetail.category?.name || 'Curriculum Module'}
                    </span>
                    <span className="text-[10px] font-bold text-[#4a6b5d] bg-white border border-[#e2eae4] px-2.5 py-1 rounded-xl">
                      Status: {selectedCourseDetail.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#112217]">{selectedCourseDetail.title}</h2>
                  <p className="text-xs text-[#4a6b5d] leading-relaxed">
                    {selectedCourseDetail.description || 'Comprehensive adaptive courseware driven by dynamic DAG graph node progression.'}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-[#4a6b5d] flex items-center gap-1">
                      <Users size={12} className="text-[#2e5a44]" /> Enrolled Students
                    </span>
                    <p className="text-lg font-black text-[#112217]">{selectedCourseDetail.enrolled_students_count || 0}</p>
                  </div>
                  <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-[#4a6b5d] flex items-center gap-1">
                      <GitBranch size={12} className="text-[#2e5a44]" /> Knowledge Topics
                    </span>
                    <p className="text-lg font-black text-[#112217]">{selectedCourseDetail.total_nodes_count ?? 'Multi-topic'}</p>
                  </div>
                  <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl space-y-1 shadow-sm col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-[#4a6b5d] flex items-center gap-1">
                      <Layers size={12} className="text-[#2e5a44]" /> Graph Engine
                    </span>
                    <p className="text-xs font-black text-[#112217] pt-1">DAG Prereqs & Quizzes</p>
                  </div>
                </div>

                {/* Instructor Profile Card */}
                <div className="p-5 bg-white border border-[#e2eae4] rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold">
                      {selectedCourseDetail.instructor?.full_name?.charAt(0) || 'I'}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#4a6b5d] block">Course Instructor</span>
                      <h4 className="text-xs font-black text-[#112217]">{selectedCourseDetail.instructor?.full_name || 'Faculty Member'}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{selectedCourseDetail.instructor?.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-[#d3efdc]/50 text-[#112217] px-3 py-1.5 rounded-xl border border-[#bce8c9]">
                    Verified Instructor
                  </span>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e2eae4]">
                  <button 
                    onClick={() => { setDetailModalOpen(false); setSelectedCourseDetail(null); }}
                    className="px-5 py-3 rounded-2xl text-xs font-bold text-[#4a6b5d] hover:bg-[#f4f7f4] transition cursor-pointer"
                  >
                    Close
                  </button>

                  {getEnrollmentForCourse(selectedCourseDetail.id) ? (
                    <button 
                      onClick={() => {
                        setDetailModalOpen(false);
                        router.push(`/student/course/${selectedCourseDetail.id}`);
                      }}
                      className="px-6 py-3 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <span>Resume Course Graph</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={async () => {
                        await handleEnroll(selectedCourseDetail.id);
                        setDetailModalOpen(false);
                      }}
                      disabled={enrollingId === selectedCourseDetail.id}
                      className="px-6 py-3 bg-[#2e5a44] text-white rounded-2xl text-xs font-bold hover:bg-[#244735] transition shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {enrollingId === selectedCourseDetail.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Enrolling...
                        </>
                      ) : (
                        <>
                          <UserCheck size={14} /> Enroll & Unlock Graph
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-8 h-16 flex items-center justify-between text-[11px] text-[#4a6b5d] border-t border-[#e2eae4] bg-white">
        <span>EduGraph LMS • Interactive Student Course Catalog</span>
        <span>Sage Green & Cream Learning Workspace</span>
      </footer>

    </div>
  );
}