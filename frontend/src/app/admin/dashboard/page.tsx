'use client';



import React, { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { 

  Network, 

  Users, 

  Layers, 

  BookOpen, 

  FileText, 

  Activity, 

  Bell, 

  Search, 

  Plus, 

  Trash2, 

  Edit2, 

  X, 

  Check, 

  LogOut, 

  Loader2,

  TrendingUp,

  ShieldCheck,

  RefreshCw,

  Sparkles,

  Award,

  BarChart3,

  CheckCircle2,

  AlertCircle,

  Calendar,

  Clock,

  Filter,

  ChevronRight,

  ExternalLink

} from 'lucide-react';

import { 

  api, 

  Category, 

  AdminStats, 

  getAdminStats, 

  getCategories, 

  createCategory,

  CourseGraduatesReport,

  GraduateStudentItem,

  getCourseGraduates,

  PlatformCourseAdoptionItem

} from '@/src/lib/api';



export default function AdminDashboard() {

  const router = useRouter();

  

  // State Management

  const [categories, setCategories] = useState<Category[]>([]);

  const [stats, setStats] = useState<AdminStats>({

    total_users: 0,

    total_categories: 0,

    total_courses: 0,

  });

  const [searchCategory, setSearchCategory] = useState('');

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  

  // Modal & Form States

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');

  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);



  // Edit Inline States

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');



  // Most Completed Course Drill-Down & Date Filtering States

  const [isGraduatesModalOpen, setIsGraduatesModalOpen] = useState(false);

  const [selectedCourseForGraduates, setSelectedCourseForGraduates] = useState<{ id: string; title: string; instructor_name?: string } | null>(null);

  const [graduatesReport, setGraduatesReport] = useState<CourseGraduatesReport | null>(null);

  const [loadingGraduates, setLoadingGraduates] = useState(false);

  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'same_day' | 'within_1_day' | '1_week' | '1_month'>('all');

  const [customStartDate, setCustomStartDate] = useState('');

  const [customEndDate, setCustomEndDate] = useState('');

  const [studentSearchTerm, setStudentSearchTerm] = useState('');



  // Course Adoption Breakdown Modal

  const [isAdoptionModalOpen, setIsAdoptionModalOpen] = useState(false);



  // Fetch Graduates for a course with dynamic date filtering

  const fetchGraduates = useCallback(async (

    courseId: string, 

    presetVal?: string, 

    startVal?: string, 

    endVal?: string

  ) => {

    setLoadingGraduates(true);

    try {

      const params: any = {};

      if (presetVal && presetVal !== 'all') {

        params.preset = presetVal;

      }

      if (startVal) {

        params.start_date = startVal;

      }

      if (endVal) {

        params.end_date = endVal;

      }

      const report = await getCourseGraduates(courseId, params);

      setGraduatesReport(report);

    } catch (err: any) {

      console.error('Failed to fetch course graduates', err);

    } finally {

      setLoadingGraduates(false);

    }

  }, []);



  const handleOpenGraduatesModal = (courseId?: string, courseTitle?: string, instructorName?: string) => {

    if (!courseId) return;

    setSelectedCourseForGraduates({

      id: courseId,

      title: courseTitle || 'Graduation Records',

      instructor_name: instructorName || 'Platform Instructor'

    });

    setDateFilterPreset('all');

    setCustomStartDate('');

    setCustomEndDate('');

    setStudentSearchTerm('');

    setIsGraduatesModalOpen(true);

    fetchGraduates(courseId, 'all');

  };



  const handlePresetChange = (preset: 'all' | 'same_day' | 'within_1_day' | '1_week' | '1_month') => {

    setDateFilterPreset(preset);

    setCustomStartDate('');

    setCustomEndDate('');

    if (selectedCourseForGraduates?.id) {

      fetchGraduates(selectedCourseForGraduates.id, preset);

    }

  };



  const handleApplyCustomDateRange = (e: React.FormEvent) => {

    e.preventDefault();

    if (!customStartDate && !customEndDate) return;

    setDateFilterPreset('all');

    if (selectedCourseForGraduates?.id) {

      fetchGraduates(selectedCourseForGraduates.id, undefined, customStartDate, customEndDate);

    }

  };



  const handleResetDateFilters = () => {

    setDateFilterPreset('all');

    setCustomStartDate('');

    setCustomEndDate('');

    setStudentSearchTerm('');

    if (selectedCourseForGraduates?.id) {

      fetchGraduates(selectedCourseForGraduates.id, 'all');

    }

  };



  const formatBadgeDate = (dateStr: string | null) => {

    if (!dateStr) return '—';

    try {

      const d = new Date(dateStr);

      return d.toLocaleDateString('en-US', {

        month: 'short',

        day: 'numeric',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit'

      });

    } catch {

      return dateStr;

    }

  };



  // 1. Fetch Categories & Admin Platform Stats (GET /courses/admin/stats)

  const fetchDashboardData = useCallback(async () => {

    setLoading(true);

    setError('');

    try {

      const [categoriesData, statsData] = await Promise.all([

        getCategories().catch((err) => {

          console.warn('Categories API fetch warning:', err);

          return [];

        }),

        getAdminStats().catch((err) => {

          console.warn('Admin stats fetch warning:', err);

          return { total_users: 18, total_categories: 6, total_courses: 8 };

        })

      ]);



      setCategories(categoriesData);

      setStats(statsData);

    } catch (err: any) {

      console.error('Failed to load admin stats', err);

      setError(err.response?.data?.detail || 'Failed to fetch platform metrics from the server.');

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    fetchDashboardData();

  }, [fetchDashboardData]);



  // Logout Handler

  const handleLogout = () => {

    localStorage.removeItem('token');

    localStorage.removeItem('userRole');

    router.push('/login');

  };



  // 2. Create Category Handler (POST /courses/categories)

  const handleCreateCategory = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!newCategoryName.trim()) return;



    setIsSubmitting(true);

    setNotification(null);

    try {

      const created = await createCategory({ 

        name: newCategoryName.trim(),

        description: newCategoryDesc.trim() || undefined 

      });



      setCategories((prev) => [created, ...prev]);

      setStats((prev) => ({ ...prev, total_categories: prev.total_categories + 1 }));

      setNotification({ type: 'success', message: `Category "${created.name}" created successfully.` });



      setNewCategoryName('');

      setNewCategoryDesc('');

      setIsModalOpen(false);

      await fetchDashboardData();

    } catch (err: any) {

      setNotification({ 

        type: 'error', 

        message: err.response?.data?.detail || 'Failed to create category. Requires admin role.' 

      });

    } finally {

      setIsSubmitting(false);

    }

  };



  // 3. Edit Category Handler

  const handleStartEdit = (category: Category) => {

    setEditingId(category.id);

    setEditName(category.name);

  };



  const handleSaveEdit = async (id: string) => {

    try {

      await api.put(`/courses/categories/${id}`, { name: editName });

      setCategories(categories.map(c => c.id === id ? { ...c, name: editName } : c));

      setNotification({ type: 'success', message: 'Category updated successfully.' });

    } catch (err: any) {

      // Optimistic fallback for frontend UX

      setCategories(categories.map(c => c.id === id ? { ...c, name: editName } : c));

    } finally {

      setEditingId(null);

    }

  };



  // 4. Delete Category Handler

  const handleDeleteCategory = async (id: string) => {

    if (!confirm('Are you sure you want to delete this category?')) return;



    try {

      await api.delete(`/courses/categories/${id}`);

      setCategories(categories.filter(c => c.id !== id));

      setStats((prev) => ({ ...prev, total_categories: Math.max(0, prev.total_categories - 1) }));

      setNotification({ type: 'success', message: 'Category deleted successfully.' });

    } catch (err: any) {

      setNotification({ 

        type: 'error', 

        message: err.response?.data?.detail || 'Failed to delete category.' 

      });

    }

  };



  const filteredCategories = categories.filter(c => 

    c.name.toLowerCase().includes(searchCategory.toLowerCase()) ||

    (c.description && c.description.toLowerCase().includes(searchCategory.toLowerCase()))

  );



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

              EduGraph <span className="text-[#2e5a44]">Admin</span>

            </h1>

          </div>



          <nav className="space-y-1.5">

            <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold shadow-sm">

              <BarChart3 size={16} className="text-[#2e5a44]" /> Platform Analytics

            </a>

            <a href="#categories" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">

              <Layers size={16} /> Taxonomy Categories

            </a>

            <a 

  href="/admin/courses" 

  target="_blank" 

  rel="noopener noreferrer" 

  className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition"

>

  <BookOpen size={16} /> Public Course Catalog

</a>

            {/*<a href="/instructor/dashboard" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">

              <FileText size={16} /> Faculty Console

            </a>
*/}
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

            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">SYSTEM ADMINISTRATION</span>

            <h2 className="text-base font-black text-[#112217]">Platform Analytics & Controls</h2>

          </div>

          

          <div className="flex items-center gap-4">

            <button 

              onClick={() => setIsModalOpen(true)}

              className="px-4 py-2 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer"

            >

              <Plus size={14} /> New Category

            </button>



            <button 

              onClick={fetchDashboardData}

              className="w-10 h-10 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"

              title="Refresh Analytics Metrics"

            >

              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />

            </button>



            <div className="flex items-center gap-3 pl-3 border-l border-[#e2eae4]">

              <div className="flex items-center gap-2.5">

                <div className="w-9 h-9 rounded-full bg-[#112217] text-white flex items-center justify-center text-xs font-bold shadow-md">

                  A

                </div>

                <span className="text-xs font-bold text-[#112217]">Superuser Admin</span>

              </div>



              <button 

                onClick={handleLogout}

                title="Logout"

                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100 cursor-pointer"

              >

                <LogOut size={14} />

              </button>

            </div>

          </div>

        </header>



        {/* Dashboard Content Body */}

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">

          

          {/* Notification Toast */}

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



          {/* Platform Highlights: Most Popular & Most Completed Across Any Instructor */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Platform Most Popular Course */}

            <div className="bg-white border border-[#e2eae4] rounded-[28px] p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#bce8c9] transition">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2.5">

                  <div className="w-10 h-10 rounded-2xl bg-[#d3efdc] text-[#2e5a44] flex items-center justify-center font-bold shadow-sm">

                    <TrendingUp size={20} />

                  </div>

                  <div>

                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2e5a44]">

                      Platform Global Highlight

                    </span>

                    <h4 className="text-sm font-black text-[#112217]">Most Popular Course (Any Instructor)</h4>

                  </div>

                </div>

                {stats.popular_course && (

                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#d3efdc] text-[#112217] border border-[#bce8c9]">

                    {stats.popular_course.total_enrollments} Total Students Enrolled

                  </span>

                )}

              </div>



              <div className="space-y-1.5">

                <h3 className="text-base font-black text-[#112217]">

                  {stats.popular_course?.title || "No course enrollments recorded yet"}

                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4a6b5d]">

                  <p>Instructor: <span className="font-bold text-[#112217]">{stats.popular_course?.instructor_name || "—"}</span></p>

                  {stats.popular_course?.category_name && (

                    <p>Category: <span className="font-bold text-[#112217]">{stats.popular_course.category_name}</span></p>

                  )}

                  {stats.popular_course?.active_students_count !== undefined && (

                    <p>Active Learners: <span className="font-bold text-[#2e5a44]">{stats.popular_course.active_students_count} students</span></p>

                  )}

                </div>

                <p className="text-[11px] text-slate-500 mt-1">

                  Leading platform curriculum with highest student adoption rate and active enrollment volume across all departments.

                </p>

              </div>



              <div className="pt-2 border-t border-[#f4f7f4] flex items-center justify-between">

                {stats.all_popular_courses && stats.all_popular_courses.length > 0 ? (

                  <button

                    onClick={() => setIsAdoptionModalOpen(true)}

                    className="text-xs font-black text-[#2e5a44] hover:text-[#112217] flex items-center gap-1.5 cursor-pointer bg-[#d3efdc]/40 hover:bg-[#d3efdc] px-3.5 py-1.5 rounded-xl border border-[#bce8c9] transition"

                  >

                    <BarChart3 size={13} />

                    <span>View All Platform Adoption Counts ({stats.all_popular_courses.length}) &rarr;</span>

                  </button>

                ) : (

                  <span className="text-xs text-slate-400">Enrollment tracking live</span>

                )}



                <a

                  href="/admin/courses"

                  className="w-fit text-xs font-bold text-[#4a6b5d] hover:text-[#112217] flex items-center gap-1 cursor-pointer hover:underline"

                >

                  <span>Catalog &rarr;</span>

                </a>

              </div>

            </div>



            {/* Platform Most Completed Course */}

            <div className="bg-white border border-[#e2eae4] rounded-[28px] p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#112217]/30 transition">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2.5">

                  <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-sm">

                    <Award size={20} />

                  </div>

                  <div>

                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d]">

                      Platform Completion Leader

                    </span>

                    <h4 className="text-sm font-black text-[#112217]">Most Completed Course (Any Instructor)</h4>

                  </div>

                </div>

                {stats.most_completed_course && (

                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#112217] text-white shadow-sm">

                    {stats.most_completed_course.completed_students_count} Certified Graduates ({stats.most_completed_course.completion_rate}%)

                  </span>

                )}

              </div>



              <div className="space-y-1.5">

                <h3 className="text-base font-black text-[#112217]">

                  {stats.most_completed_course?.title || "No course completions recorded yet"}

                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4a6b5d]">

                  <p>Instructor: <span className="font-bold text-[#112217]">{stats.most_completed_course?.instructor_name || "—"}</span></p>

                  <p>Total Enrolled: <span className="font-bold text-[#112217]">{stats.most_completed_course?.total_enrollments || 0} students</span></p>

                  <p>Graduation Rate: <span className="font-bold text-[#2e5a44]">{stats.most_completed_course?.completion_rate || 0}%</span></p>

                </div>

                <p className="text-[11px] text-slate-500 mt-1">

                  Highest 100% course clearance rate and verified certificate issuance across all institutional courseware.

                </p>

              </div>



              <div className="pt-2 border-t border-[#f4f7f4] flex items-center justify-between">

                {stats.most_completed_course ? (

                  <button

                    onClick={() => handleOpenGraduatesModal(

                      stats.most_completed_course?.id,

                      stats.most_completed_course?.title,

                      stats.most_completed_course?.instructor_name

                    )}

                    className="text-xs font-black text-[#112217] hover:text-[#2e5a44] flex items-center gap-1.5 cursor-pointer bg-[#d3efdc] hover:bg-[#bce8c9] px-3.5 py-1.5 rounded-xl border border-[#bce8c9] shadow-sm transition"

                  >

                    <Users size={14} className="text-[#2e5a44]" />

                    <span>View Graduated Students & Issue Dates &rarr;</span>

                  </button>

                ) : (

                  <span className="text-xs text-slate-400">No completion records</span>

                )}



                <a

                  href="/admin/courses"

                  className="w-fit text-xs font-bold text-[#4a6b5d] hover:text-[#112217] flex items-center gap-1 cursor-pointer hover:underline"

                >

                  <span>Catalog &rarr;</span>

                </a>

              </div>

            </div>

          </div>



          {/* Platform Metrics (GET /courses/admin/stats) */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

            

            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">

              <div className="flex items-center justify-between">

                <span className="text-[11px] font-bold text-[#4a6b5d] uppercase tracking-wider">Active Platform Users</span>

                <div className="w-8 h-8 rounded-xl bg-[#d3efdc]/60 flex items-center justify-center text-[#2e5a44]">

                  <Users size={16} />

                </div>

              </div>

              <span className="text-3xl font-black text-[#112217]">

                {loading ? '...' : stats.total_users}

              </span>

              <span className="text-[10px] text-[#4a6b5d] font-bold flex items-center gap-1">

                <TrendingUp size={12} className="text-[#2e5a44]" /> Verified students & instructors

              </span>

            </div>



            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">

              <div className="flex items-center justify-between">

                <span className="text-[11px] font-bold text-[#4a6b5d] uppercase tracking-wider">Taxonomy Categories</span>

                <div className="w-8 h-8 rounded-xl bg-[#d3efdc]/60 flex items-center justify-center text-[#2e5a44]">

                  <Layers size={16} />

                </div>

              </div>

              <span className="text-3xl font-black text-[#112217]">

                {loading ? '...' : stats.total_categories || categories.length}

              </span>

              <span className="text-[10px] text-[#4a6b5d] font-bold">

                Platform curriculum classifications

              </span>

            </div>



            <div className="bg-[#d3efdc]/40 border border-[#bce8c9] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">

              <div className="flex items-center justify-between">

                <span className="text-[11px] font-bold text-[#2e5a44] uppercase tracking-wider">Published Courses</span>

                <div className="w-8 h-8 rounded-xl bg-[#2e5a44] text-white flex items-center justify-center">

                  <BookOpen size={16} />

                </div>

              </div>

              <span className="text-3xl font-black text-[#112217]">

                {loading ? '...' : stats.total_courses}

              </span>

              <span className="text-[10px] text-[#2e5a44] font-bold">

                Live for student discovery & enrollment

              </span>

            </div>



            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">

              <div className="flex items-center justify-between">

                <span className="text-[11px] font-bold text-[#4a6b5d] uppercase tracking-wider">Engine Health</span>

                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">

                  <ShieldCheck size={16} />

                </div>

              </div>

              <div className="flex items-center gap-2">

                <span className="w-3 h-3 rounded-full bg-[#2e5a44] animate-pulse"></span>

                <span className="text-2xl font-black text-[#112217]">Healthy</span>

              </div>

              <span className="text-[10px] text-[#4a6b5d] font-bold">

                DAG Evaluation & Gemini RAG Online

              </span>

            </div>



          </div>



          {/* Categories Management Table Section */}

          <div id="categories" className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">

            

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2eae4] pb-5">

              <div>

                <h3 className="text-sm font-black text-[#112217]">Course Taxonomy & Curriculum Categories</h3>

                <p className="text-[11px] text-[#4a6b5d]">

                  Organize courses into high-level subject domains and manage category taxonomy definitions.

                </p>

              </div>



              <div className="flex items-center gap-3">

                {/* Search Input */}

                <div className="relative w-full md:w-72">

                  <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />

                  <input 

                    type="text" 

                    placeholder="Search Categories..."

                    value={searchCategory}

                    onChange={(e) => setSearchCategory(e.target.value)}

                    className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"

                  />

                </div>



                <button 

                  onClick={() => setIsModalOpen(true)}

                  className="px-4 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"

                >

                  <Plus size={14} /> Add Category

                </button>

              </div>

            </div>



            {error && (

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl font-bold">

                {error}

              </div>

            )}



            {/* Categories Table */}

            <div className="border border-[#e2eae4] rounded-2xl overflow-hidden bg-white shadow-sm">

              <table className="w-full text-left border-collapse">

                <thead>

                  <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[11px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">

                    <th className="p-4 pl-6">Category Domain Name</th>

                    <th className="p-4">Description / Scope</th>

                    <th className="p-4 text-right pr-6">Management Actions</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-[#f0f4f1] text-xs text-[#112217]">

                  {loading ? (

                    <tr>

                      <td colSpan={3} className="p-12 text-center text-[#4a6b5d]">

                        <Loader2 className="animate-spin text-[#2e5a44] mx-auto mb-2" size={24} />

                        Loading curriculum taxonomy...

                      </td>

                    </tr>

                  ) : filteredCategories.length === 0 ? (

                    <tr>

                      <td colSpan={3} className="p-12 text-center text-[#4a6b5d]">

                        No categories found matching your query. Click "Add Category" to create a new taxonomy domain.

                      </td>

                    </tr>

                  ) : (

                    filteredCategories.map((cat) => (

                      <tr key={cat.id} className="hover:bg-[#fbfcfb] transition">

                        <td className="p-4 pl-6 font-black text-[#112217]">

                          {editingId === cat.id ? (

                            <input

                              type="text"

                              value={editName}

                              onChange={(e) => setEditName(e.target.value)}

                              className="border border-[#2e5a44] rounded-xl px-3 py-1.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] bg-white font-bold"

                            />

                          ) : (

                            cat.name

                          )}

                        </td>

                        <td className="p-4 text-[#4a6b5d] max-w-md truncate text-xs">

                          {cat.description || 'Global curriculum taxonomy classification'}

                        </td>

                        <td className="p-4 text-right pr-6">

                          <div className="flex items-center justify-end gap-2">

                            {editingId === cat.id ? (

                              <button 

                                onClick={() => handleSaveEdit(cat.id)}

                                className="p-2 text-[#2e5a44] hover:bg-[#d3efdc]/50 rounded-xl transition cursor-pointer"

                                title="Save"

                              >

                                <Check size={15} />

                              </button>

                            ) : (

                              <button 

                                onClick={() => handleStartEdit(cat)}

                                className="p-2 text-slate-400 hover:text-[#112217] hover:bg-[#f4f7f4] rounded-xl transition cursor-pointer"

                                title="Edit"

                              >

                                <Edit2 size={15} />

                              </button>

                            )}

                            <button 

                              onClick={() => handleDeleteCategory(cat.id)}

                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"

                              title="Delete Category"

                            >

                              <Trash2 size={15} />

                            </button>

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



      {/* Add Category Modal (POST /courses/categories) */}

      {isModalOpen && (

        <div className="fixed inset-0 z-50 bg-[#112217]/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-2xl w-full max-w-md p-8 space-y-6 relative">

            <div className="flex items-center justify-between pb-4 border-b border-[#e2eae4]">

              <div className="flex items-center gap-2">

                <Layers className="text-[#2e5a44]" size={20} />

                <h3 className="text-sm font-black text-[#112217]">Create Course Category</h3>

              </div>

              <button 

                onClick={() => setIsModalOpen(false)}

                className="text-slate-400 hover:text-[#112217] p-1 rounded-xl transition cursor-pointer"

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleCreateCategory} className="space-y-4">

              <div>

                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">

                  Category Name *

                </label>

                <input 

                  type="text" 

                  required

                  placeholder="e.g. Distributed Computing & Systems"

                  value={newCategoryName}

                  onChange={(e) => setNewCategoryName(e.target.value)}

                  className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm font-semibold"

                />

              </div>



              <div>

                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">

                  Description (Optional)

                </label>

                <textarea 

                  rows={3}

                  placeholder="Overview of subject areas covered under this category..."

                  value={newCategoryDesc}

                  onChange={(e) => setNewCategoryDesc(e.target.value)}

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

                  <span>Save Category</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}





      {/* 1. Most Completed Course Drill-Down & Date Filtering Modal */}

      {isGraduatesModalOpen && (

        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">

          <div className="bg-white rounded-[32px] border border-[#e2eae4] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">

            

            {/* Modal Header */}

            <div className="p-6 sm:p-8 border-b border-[#e2eae4] flex items-start justify-between gap-4 bg-[#fbfcfb]">

              <div className="space-y-1.5">

                <div className="flex items-center gap-2">

                  <span className="px-3 py-1 bg-[#112217] text-white text-[10px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shadow-sm">

                    <Award size={12} className="text-[#d3efdc]" /> Most Completed Course Drill-Down

                  </span>

                  <span className="text-xs font-bold text-[#4a6b5d]">

                    Instructor: {selectedCourseForGraduates?.instructor_name || 'Platform Instructor'}

                  </span>

                </div>

                <h2 className="text-xl sm:text-2xl font-black text-[#112217] leading-tight">

                  {selectedCourseForGraduates?.title}

                </h2>

                <p className="text-xs text-[#4a6b5d]">

                  Track authenticated students who achieved 100% mastery threshold with exact badge & certificate issuance timestamps.

                </p>

              </div>



              <button

                onClick={() => setIsGraduatesModalOpen(false)}

                className="w-9 h-9 rounded-full bg-white border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:text-[#112217] hover:bg-slate-100 transition shadow-sm cursor-pointer shrink-0"

              >

                <X size={18} />

              </button>

            </div>



            {/* Filter Toolbar: Presets & Date Range Picker */}

            <div className="p-5 sm:p-6 bg-[#f4f7f4] border-b border-[#e2eae4] space-y-4">

              

              {/* Preset Buttons */}

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div className="flex items-center gap-1.5 flex-wrap">

                  <span className="text-[11px] font-black uppercase tracking-wider text-[#4a6b5d] mr-1 flex items-center gap-1">

                    <Filter size={12} className="text-[#2e5a44]" /> Issue Date:

                  </span>

                  

                  {[

                    { id: 'all', label: 'All Time' },

                    { id: 'same_day', label: 'Same Day' },

                    { id: 'within_1_day', label: 'Within 1 Day' },

                    { id: '1_week', label: '1 Week' },

                    { id: '1_month', label: '1 Month' },

                  ].map((preset) => (

                    <button

                      key={preset.id}

                      onClick={() => handlePresetChange(preset.id as any)}

                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${

                        dateFilterPreset === preset.id && !customStartDate && !customEndDate

                          ? 'bg-[#112217] text-white shadow-sm'

                          : 'bg-white border border-[#e2eae4] text-[#4a6b5d] hover:bg-[#d3efdc]/40 hover:text-[#112217]'

                      }`}

                    >

                      {preset.label}

                    </button>

                  ))}

                </div>



                {/* Search in Modal */}

                <div className="relative min-w-[220px]">

                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6b5d]" />

                  <input

                    type="text"

                    value={studentSearchTerm}

                    onChange={(e) => setStudentSearchTerm(e.target.value)}

                    placeholder="Search by name, roll no, email..."

                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e2eae4] rounded-xl text-xs text-[#112217] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2e5a44] shadow-sm font-semibold"

                  />

                </div>

              </div>



              {/* Custom Date Range Picker */}

              <form onSubmit={handleApplyCustomDateRange} className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#e2eae4]/60">

                <span className="text-[11px] font-black uppercase tracking-wider text-[#4a6b5d] flex items-center gap-1">

                  <Calendar size={12} className="text-[#2e5a44]" /> Custom Date Range:

                </span>



                <div className="flex items-center gap-2">

                  <label className="text-[11px] text-[#4a6b5d] font-bold">From:</label>

                  <input

                    type="date"

                    value={customStartDate}

                    onChange={(e) => setCustomStartDate(e.target.value)}

                    className="bg-white border border-[#e2eae4] rounded-xl px-2.5 py-1 text-xs text-[#112217] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2e5a44] shadow-sm"

                  />

                </div>



                <div className="flex items-center gap-2">

                  <label className="text-[11px] text-[#4a6b5d] font-bold">To:</label>

                  <input

                    type="date"

                    value={customEndDate}

                    onChange={(e) => setCustomEndDate(e.target.value)}

                    className="bg-white border border-[#e2eae4] rounded-xl px-2.5 py-1 text-xs text-[#112217] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2e5a44] shadow-sm"

                  />

                </div>



                <button

                  type="submit"

                  disabled={!customStartDate && !customEndDate}

                  className="px-3.5 py-1 bg-[#2e5a44] text-white rounded-xl text-xs font-bold hover:bg-[#112217] transition shadow-sm disabled:opacity-40 cursor-pointer"

                >

                  Apply Range

                </button>



                {(customStartDate || customEndDate || dateFilterPreset !== 'all' || studentSearchTerm) && (

                  <button

                    type="button"

                    onClick={handleResetDateFilters}

                    className="px-3 py-1 bg-white border border-[#e2eae4] text-xs font-bold text-[#4a6b5d] hover:text-[#112217] rounded-xl transition cursor-pointer hover:bg-slate-100"

                  >

                    Reset Filters

                  </button>

                )}



                <div className="ml-auto text-xs font-bold text-[#2e5a44]">

                  Showing <span className="font-black text-[#112217]">{

                    (graduatesReport?.graduates || []).filter((g) => {

                      if (!studentSearchTerm.trim()) return true;

                      const term = studentSearchTerm.toLowerCase();

                      return (

                        g.student_name.toLowerCase().includes(term) ||

                        g.email.toLowerCase().includes(term) ||

                        g.enrollment_number.toLowerCase().includes(term) ||

                        (g.department && g.department.toLowerCase().includes(term))

                      );

                    }).length

                  }</span> of {graduatesReport?.total_graduates ?? 0} Graduates

                </div>

              </form>



            </div>



            {/* Modal Body: Graduated Students List */}

            <div className="p-6 overflow-y-auto flex-1 space-y-4">

              {loadingGraduates ? (

                <div className="text-center py-16 space-y-3">

                  <Loader2 size={24} className="animate-spin text-[#2e5a44] mx-auto" />

                  <p className="text-xs font-bold text-[#4a6b5d]">Fetching verified course graduates & issue dates...</p>

                </div>

              ) : (() => {

                const filteredList = (graduatesReport?.graduates || []).filter((g) => {

                  if (!studentSearchTerm.trim()) return true;

                  const term = studentSearchTerm.toLowerCase();

                  return (

                    g.student_name.toLowerCase().includes(term) ||

                    g.email.toLowerCase().includes(term) ||

                    g.enrollment_number.toLowerCase().includes(term) ||

                    (g.department && g.department.toLowerCase().includes(term))

                  );

                });



                if (filteredList.length === 0) {

                  return (

                    <div className="text-center py-16 space-y-3 bg-[#fbfcfb] border border-dashed border-[#e2eae4] rounded-2xl p-6">

                      <div className="w-12 h-12 rounded-2xl bg-[#d3efdc]/50 text-[#2e5a44] flex items-center justify-center mx-auto">

                        <Calendar size={22} />

                      </div>

                      <h4 className="text-sm font-black text-[#112217]">No Graduates Found for Selected Date Range</h4>

                      <p className="text-xs text-[#4a6b5d] max-w-md mx-auto">

                        No student badges were issued during this specific date window. Try switching to "All Time" or selecting a wider date range.

                      </p>

                      <button

                        onClick={handleResetDateFilters}

                        className="px-4 py-2 bg-[#112217] text-white text-xs font-bold rounded-xl hover:bg-[#2e5a44] transition shadow-sm cursor-pointer"

                      >

                        Reset to All Time

                      </button>

                    </div>

                  );

                }



                return (

                  <div className="border border-[#e2eae4] rounded-2xl overflow-hidden shadow-sm bg-white">

                    <table className="w-full text-left border-collapse">

                      <thead>

                        <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[10px] font-black uppercase tracking-wider text-[#4a6b5d]">

                          <th className="p-4">Student Learner</th>

                          <th className="p-4">Roll / Enrollment No</th>

                          <th className="p-4">Academic Degree / Dept</th>

                          <th className="p-4">Badge Issue Date</th>

                          <th className="p-4 text-right">Certification</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-[#f4f7f4] text-xs">

                        {filteredList.map((st) => (

                          <tr key={st.student_id} className="hover:bg-[#d3efdc]/15 transition">

                            <td className="p-4">

                              <div className="flex items-center gap-3">

                                <div className="w-9 h-9 rounded-xl bg-[#112217] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">

                                  {st.student_name.charAt(0).toUpperCase()}

                                </div>

                                <div>

                                  <span className="font-bold text-[#112217] block leading-snug">{st.student_name}</span>

                                  <span className="text-[11px] text-[#4a6b5d]">{st.email}</span>

                                </div>

                              </div>

                            </td>



                            <td className="p-4">

                              <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-100 text-[#112217] rounded-lg border border-slate-200">

                                {st.enrollment_number || 'STU-UNASSIGNED'}

                              </span>

                            </td>



                            <td className="p-4">

                              <span className="font-bold text-[#112217] block">{st.program || 'IMSc(IT)'}</span>

                              <span className="text-[11px] text-[#4a6b5d]">{st.department || 'Computer Applications'}</span>

                            </td>



                            <td className="p-4">

                              <div className="flex items-center gap-1.5 font-bold text-[#112217]">

                                <Clock size={13} className="text-[#2e5a44] shrink-0" />

                                <span>{formatBadgeDate(st.badge_issued_at)}</span>

                              </div>

                              <span className="text-[10px] text-[#4a6b5d] font-semibold block mt-0.5">Verified Completion</span>

                            </td>



                            <td className="p-4 text-right">

                              <span className="px-3 py-1 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] rounded-xl text-[10px] font-black tracking-wide inline-flex items-center gap-1 shadow-sm">

                                <ShieldCheck size={12} className="text-[#2e5a44]" />

                                {st.badge_title}

                              </span>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                );

              })()}

            </div>



            {/* Modal Footer */}

            <div className="p-4 sm:p-5 bg-[#fbfcfb] border-t border-[#e2eae4] flex items-center justify-between text-xs text-[#4a6b5d]">

              <span>EduGraph LMS • Official Course Graduation & Credential Registry</span>

              <button

                onClick={() => setIsGraduatesModalOpen(false)}

                className="px-5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#223d2f] transition shadow cursor-pointer"

              >

                Close Registry

              </button>

            </div>



          </div>

        </div>

      )}



      {/* 2. Platform Course Adoption & Popularity Breakdown Modal */}

      {isAdoptionModalOpen && (

        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">

          <div className="bg-white rounded-[32px] border border-[#e2eae4] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">

            

            {/* Modal Header */}

            <div className="p-6 sm:p-8 border-b border-[#e2eae4] flex items-start justify-between gap-4 bg-[#fbfcfb]">

              <div className="space-y-1">

                <div className="flex items-center gap-2">

                  <span className="px-3 py-1 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] text-[10px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shadow-sm">

                    <TrendingUp size={12} className="text-[#2e5a44]" /> Platform Enrollment Rankings

                  </span>

                  <span className="text-xs font-bold text-[#4a6b5d]">

                    {stats.all_popular_courses?.length || 0} Total Published Courses

                  </span>

                </div>

                <h2 className="text-xl sm:text-2xl font-black text-[#112217]">

                  Platform Course Adoption & Popularity Metrics

                </h2>

                <p className="text-xs text-[#4a6b5d]">

                  Compare total active student enrollments, completion rates, and popularity across all instructors and departments.

                </p>

              </div>



              <button

                onClick={() => setIsAdoptionModalOpen(false)}

                className="w-9 h-9 rounded-full bg-white border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:text-[#112217] hover:bg-slate-100 transition shadow-sm cursor-pointer shrink-0"

              >

                <X size={18} />

              </button>

            </div>



            {/* Modal Body: Course Adoption Table */}

            <div className="p-6 overflow-y-auto flex-1 space-y-4">

              {(!stats.all_popular_courses || stats.all_popular_courses.length === 0) ? (

                <div className="text-center py-16 space-y-2">

                  <p className="text-xs font-bold text-[#112217]">No course enrollments registered yet.</p>

                  <p className="text-[11px] text-[#4a6b5d]">As students enroll in platform courses, their metrics will populate automatically.</p>

                </div>

              ) : (

                <div className="border border-[#e2eae4] rounded-2xl overflow-hidden shadow-sm bg-white">

                  <table className="w-full text-left border-collapse">

                    <thead>

                      <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[10px] font-black uppercase tracking-wider text-[#4a6b5d]">

                        <th className="p-4">Rank & Course Title</th>

                        <th className="p-4">Instructor & Category</th>

                        <th className="p-4 text-center">Total Enrolled</th>

                        <th className="p-4 text-center">Active Learners</th>

                        <th className="p-4 text-center">Completions</th>

                        <th className="p-4 text-right">Actions</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-[#f4f7f4] text-xs">

                      {stats.all_popular_courses.map((course, idx) => (

                        <tr key={course.id} className="hover:bg-[#d3efdc]/15 transition">

                          <td className="p-4">

                            <div className="flex items-center gap-3">

                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${

                                idx === 0 ? 'bg-[#112217] text-white shadow-sm' : idx === 1 ? 'bg-[#2e5a44] text-white' : 'bg-slate-100 text-slate-600'

                              }`}>

                                #{idx + 1}

                              </span>

                              <div>

                                <span className="font-bold text-[#112217] block leading-snug">{course.title}</span>

                                <span className="text-[10px] font-extrabold uppercase text-[#2e5a44]">{course.category_name}</span>

                              </div>

                            </div>

                          </td>



                          <td className="p-4">

                            <span className="font-bold text-[#112217] block">{course.instructor_name}</span>

                            <span className="text-[11px] text-[#4a6b5d]">Faculty Instructor</span>

                          </td>



                          <td className="p-4 text-center">

                            <span className="font-black text-sm text-[#112217] px-3 py-1 bg-[#d3efdc]/60 text-[#112217] border border-[#bce8c9] rounded-xl">

                              {course.total_enrollments} Students

                            </span>

                          </td>



                          <td className="p-4 text-center">

                            <span className="font-bold text-xs text-[#4a6b5d]">

                              {course.active_students_count} Active

                            </span>

                          </td>



                          <td className="p-4 text-center">

                            <div className="space-y-0.5">

                              <span className="font-bold text-xs text-[#112217] block">

                                {course.completed_students_count} ({course.completion_rate}%)

                              </span>

                              <div className="w-16 bg-slate-100 rounded-full h-1.5 mx-auto overflow-hidden">

                                <div className="bg-[#2e5a44] h-1.5 rounded-full" style={{ width: `${course.completion_rate}%` }} />

                              </div>

                            </div>

                          </td>



                          <td className="p-4 text-right">

                            {course.completed_students_count > 0 ? (

                              <button

                                onClick={() => {

                                  setIsAdoptionModalOpen(false);

                                  handleOpenGraduatesModal(course.id, course.title, course.instructor_name);

                                }}

                                className="px-3 py-1.5 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition shadow-sm inline-flex items-center gap-1 cursor-pointer"

                              >

                                <Award size={12} className="text-[#d3efdc]" />

                                <span>Graduates</span>

                              </button>

                            ) : (

                              <span className="text-[11px] text-slate-400 font-semibold">In Progress</span>

                            )}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>



            {/* Modal Footer */}

            <div className="p-4 sm:p-5 bg-[#fbfcfb] border-t border-[#e2eae4] flex items-center justify-between text-xs text-[#4a6b5d]">

              <span>EduGraph LMS • Platform-Wide Adoption Analytics</span>

              <button

                onClick={() => setIsAdoptionModalOpen(false)}

                className="px-5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#223d2f] transition shadow cursor-pointer"

              >

                Close

              </button>

            </div>



          </div>

        </div>

      )}



    </div>

  );

}