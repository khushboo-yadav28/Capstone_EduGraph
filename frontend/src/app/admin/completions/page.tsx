'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Award, 
  Loader2, 
  Filter, 
  BarChart3, 
  Calendar, 
  Users, 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  TrendingUp,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { api } from '@/src/lib/api';

export interface GraduateStudentItem {
  student_id: string;
  student_name: string;
  email: string;
  enrollment_number?: string;
  department?: string;
  program?: string;
  semester?: string;
  badge_title?: string;
  badge_image_url?: string;
  badge_issued_at?: string | null;
  progress_percentage?: number;
  status?: string;
}

export interface CompletionCourseItem {
  id: string;
  title: string;
  description?: string;
  instructor_name: string;
  category_name: string;
  total_enrollments: number;
  completed_students_count: number;
  completion_rate: number;
  graduates: GraduateStudentItem[];
}

export default function AdminCompletionsPage() {
  const router = useRouter();

  // Data States
  const [courses, setCourses] = useState<CompletionCourseItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'all' | 'same_day' | 'within_1_day' | '1_week' | '1_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ start: string; end: string } | null>(null);

  // Accordion / Expanded rows state (holds course IDs that are currently expanded)
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set());

  // Modal inspection view state for a single course
  const [inspectCourse, setInspectCourse] = useState<CompletionCourseItem | null>(null);

  // Fetch completions data from backend
  const fetchCompletionsMetrics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: Record<string, string> = {};
      if (datePreset !== 'custom') {
        params.preset = datePreset;
      } else if (appliedCustomDates?.start || appliedCustomDates?.end) {
        if (appliedCustomDates.start) params.start_date = appliedCustomDates.start;
        if (appliedCustomDates.end) params.end_date = appliedCustomDates.end;
      }

      const res = await api.get('/courses/admin/completions', { params });
      if (res.data?.courses) {
        setCourses(res.data.courses);
        if (res.data.filter_metadata?.available_categories) {
          setAvailableCategories(res.data.filter_metadata.available_categories);
        }
      } else if (Array.isArray(res.data)) {
        setCourses(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch platform completions metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [datePreset, appliedCustomDates]);

  useEffect(() => {
    fetchCompletionsMetrics();
  }, [fetchCompletionsMetrics]);

  // Combined Filtering & Instant Search (Reactive across Course Title, Instructor, and Student Details)
  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      // Check title, instructor, or category
      const matchesCourse =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.instructor_name.toLowerCase().includes(q) ||
        (c.category_name && c.category_name.toLowerCase().includes(q));

      // Check student details within graduates (Name, Email, or Roll No)
      const matchesStudent =
        Boolean(q) &&
        (c.graduates || []).some(
          (g) =>
            g.student_name.toLowerCase().includes(q) ||
            g.email.toLowerCase().includes(q) ||
            (g.enrollment_number && g.enrollment_number.toLowerCase().includes(q))
        );

      const matchesSearch = !q || matchesCourse || matchesStudent;

      const matchesCategory =
        categoryFilter === 'all' ||
        (c.category_name && c.category_name.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, categoryFilter]);

  // Auto-expand courses where search matches a student's name/roll
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.trim().toLowerCase();
      const autoExpandIds = new Set<string>();
      filteredCourses.forEach((c) => {
        const hasMatchingStudent = (c.graduates || []).some(
          (g) =>
            g.student_name.toLowerCase().includes(q) ||
            g.email.toLowerCase().includes(q) ||
            (g.enrollment_number && g.enrollment_number.toLowerCase().includes(q))
        );
        if (hasMatchingStudent) {
          autoExpandIds.add(c.id);
        }
      });
      if (autoExpandIds.size > 0) {
        setExpandedCourseIds((prev) => new Set([...Array.from(prev), ...Array.from(autoExpandIds)]));
      }
    }
  }, [searchQuery, filteredCourses]);

  // Dynamic KPI Calculations (Reflecting the filtered subset in real-time)
  const activeKpis = useMemo(() => {
    if (filteredCourses.length === 0) {
      return {
        totalGraduates: 0,
        avgCompletionRate: 0,
        topCourseTitle: 'N/A',
        topCategory: 'N/A',
        totalEnrollments: 0,
        totalCourses: 0,
      };
    }

    const totalGraduates = filteredCourses.reduce((acc, c) => acc + (c.completed_students_count || 0), 0);
    const totalEnrollments = filteredCourses.reduce((acc, c) => acc + (c.total_enrollments || 0), 0);
    const avgCompletionRate = totalEnrollments > 0 ? Math.round((totalGraduates / totalEnrollments) * 1000) / 10 : 0;

    // Top completed course
    let topCourseTitle = 'N/A';
    let maxGrads = -1;
    filteredCourses.forEach((c) => {
      if ((c.completed_students_count || 0) > maxGrads) {
        maxGrads = c.completed_students_count;
        topCourseTitle = c.title;
      }
    });

    // Top Category Calculation
    const catMap: Record<string, number> = {};
    filteredCourses.forEach((c) => {
      const cat = c.category_name || 'General';
      catMap[cat] = (catMap[cat] || 0) + (c.completed_students_count || 0);
    });

    let topCategory = 'N/A';
    let maxCatGrads = -1;
    Object.entries(catMap).forEach(([cat, count]) => {
      if (count > maxCatGrads) {
        maxCatGrads = count;
        topCategory = cat;
      }
    });

    return {
      totalGraduates,
      avgCompletionRate,
      topCourseTitle,
      topCategory,
      totalEnrollments,
      totalCourses: filteredCourses.length,
    };
  }, [filteredCourses]);

  // Category list for dropdown selector
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    availableCategories.forEach((cat) => set.add(cat));
    courses.forEach((c) => {
      if (c.category_name) set.add(c.category_name);
    });
    return Array.from(set).sort();
  }, [availableCategories, courses]);

  // Toggle row expansion
  const toggleRowExpansion = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  // Expand or Collapse All rows
  const handleToggleExpandAll = () => {
    if (expandedCourseIds.size === filteredCourses.length && filteredCourses.length > 0) {
      setExpandedCourseIds(new Set());
    } else {
      setExpandedCourseIds(new Set(filteredCourses.map((c) => c.id)));
    }
  };

  // Handle custom date submission
  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStartDate || customEndDate) {
      setAppliedCustomDates({ start: customStartDate, end: customEndDate });
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setAppliedCustomDates(null);
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    datePreset !== 'all' ||
    appliedCustomDates !== null;

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="w-10 h-10 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/45 hover:text-[#112217] transition cursor-pointer"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">
                  Institutional Administration
                </span>
                <span className="px-2 py-0.5 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] rounded-md text-[9px] font-black uppercase tracking-wider">
                  Verified Completions
                </span>
              </div>
              <h2 className="text-base font-black text-[#112217]">
                Most Completed Courses & Certified Graduates Rankings
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCompletionsMetrics(true)}
              disabled={refreshing}
              className="px-4 py-2 bg-[#f4f7f4] border border-[#e2eae4] text-[#2e5a44] rounded-xl text-xs font-bold hover:bg-[#d3efdc]/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Completions Data"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition shadow-sm cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">
          
          {/* Smart Analytics Summary KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Total Certified Graduates */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Total Certified Graduates
                  </span>
                  <div className="text-2xl font-black text-[#112217] mt-1.5 flex items-baseline gap-2">
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : activeKpis.totalGraduates}
                    <span className="text-xs font-bold text-[#112217] bg-[#d3efdc] px-2 py-0.5 rounded-full border border-[#bce8c9]">
                      Badged
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#4a6b5d] mt-2 leading-tight">
                    Issued within selected badge timeframe
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Award size={20} className="text-[#d3efdc]" />
                </div>
              </div>
            </div>

            {/* KPI 2: Average Completion Rate */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="w-full mr-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Platform Completion Rate
                  </span>
                  <div className="text-2xl font-black text-[#112217] mt-1.5 flex items-baseline gap-1.5">
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : `${activeKpis.avgCompletionRate}%`}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div 
                      className="bg-[#2e5a44] h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, activeKpis.avgCompletionRate))}%` }} 
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-[#4a6b5d] mt-2 leading-tight">
                    {activeKpis.totalGraduates} of {activeKpis.totalEnrollments} enrolled cleared 100%
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0">
                  <GraduationCap size={20} />
                </div>
              </div>
            </div>

            {/* KPI 3: Top Completed Course */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="overflow-hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Top Completed Course
                  </span>
                  <div className="text-base font-black text-[#112217] mt-1.5 truncate" title={activeKpis.topCourseTitle}>
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : activeKpis.topCourseTitle}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-2 text-[10px] font-extrabold text-[#112217] bg-[#d3efdc] border border-[#bce8c9] px-2 py-0.5 rounded-full">
                    <TrendingUp size={11} className="text-[#2e5a44]" /> #1 Completion Rank
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0 ml-2">
                  <FileCheck size={20} />
                </div>
              </div>
            </div>

            {/* KPI 4: Leading Category */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="overflow-hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Top Department / Category
                  </span>
                  <div className="text-base font-black text-[#112217] mt-1.5 truncate" title={activeKpis.topCategory}>
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : activeKpis.topCategory}
                  </div>
                  <p className="text-[11px] font-semibold text-[#4a6b5d] mt-2 leading-tight">
                    Across {activeKpis.totalCourses} matching published courses
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0 ml-2">
                  <Sparkles size={20} />
                </div>
              </div>
            </div>

          </div>

          {/* Advanced Multi-Filters Toolbar */}
          <div className="bg-white border border-[#e2eae4] rounded-[28px] p-6 shadow-sm space-y-4">
            
            {/* Top row: Instant Search & Category Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Instant Search Bar (Searches course title, instructor, or student details) */}
              <div className="relative flex-1 max-w-xl">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Instant search by course, instructor, or student name/roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f4f7f4] border border-[#e2eae4] rounded-2xl pl-11 pr-10 py-3 text-xs text-[#112217] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2e5a44] font-semibold"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#112217] p-1 rounded-full cursor-pointer"
                    title="Clear search query"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category-Wise Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <Filter size={15} className="text-[#2e5a44]" />
                <span className="text-xs font-bold text-[#4a6b5d]">Category:</span>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#f4f7f4] border border-[#e2eae4] rounded-2xl pl-4 pr-10 py-3 text-xs text-[#112217] font-bold focus:outline-none focus:ring-2 focus:ring-[#2e5a44] cursor-pointer appearance-none"
                  >
                    <option value="all">All Categories ({courses.length})</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Action buttons: Expand All & Reset Filters */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleToggleExpandAll}
                  className="px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] rounded-2xl text-xs font-bold hover:bg-[#d3efdc]/40 transition flex items-center gap-1.5 cursor-pointer"
                  title="Expand or collapse all graduate lists"
                >
                  {expandedCourseIds.size === filteredCourses.length && filteredCourses.length > 0 ? (
                    <>
                      <ChevronUp size={14} className="text-[#2e5a44]" />
                      <span>Collapse All</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} className="text-[#2e5a44]" />
                      <span>Expand All</span>
                    </>
                  )}
                </button>

                {isAnyFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-2.5 bg-[#f4f7f4] border border-[#bce8c9] text-[#2e5a44] rounded-2xl text-xs font-bold hover:bg-[#d3efdc] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

            </div>

            {/* Bottom row: Badge Issue Date Filter Options */}
            <div className="pt-4 border-t border-[#e2eae4] flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4a6b5d] mr-2">
                  <Calendar size={14} className="text-[#2e5a44]" />
                  <span>Badge Issue Date Filter:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'same_day', label: 'Same Day' },
                    { id: 'within_1_day', label: 'Within 1 Day' },
                    { id: '1_week', label: '1 Week' },
                    { id: '1_month', label: '1 Month' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setDatePreset(preset.id as any);
                        if (preset.id !== 'custom') {
                          setAppliedCustomDates(null);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        datePreset === preset.id
                          ? 'bg-[#112217] text-white shadow-sm'
                          : 'bg-[#f4f7f4] text-[#4a6b5d] hover:bg-[#d3efdc]/50 hover:text-[#112217] border border-[#e2eae4]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filter Indicator Pill */}
              <div className="flex items-center gap-2 text-xs font-bold text-[#4a6b5d]">
                <Clock size={13} className="text-[#2e5a44]" />
                <span>
                  Filtering Graduates by: {' '}
                  <strong className="text-[#112217]">
                    {datePreset === 'all'
                      ? 'All Historical Badges'
                      : datePreset === 'same_day'
                      ? 'Issued Today'
                      : datePreset === 'within_1_day'
                      ? 'Within Last 24 Hours'
                      : datePreset === '1_week'
                      ? 'Last 7 Days'
                      : datePreset === '1_month'
                      ? 'Last 30 Days'
                      : appliedCustomDates
                      ? `${appliedCustomDates.start || 'Start'} to ${appliedCustomDates.end || 'Present'}`
                      : 'Select Date Range Below'}
                  </strong>
                </span>
              </div>

            </div>

            {/* Custom Date Range Picker Accordion */}
            {datePreset === 'custom' && (
              <form 
                onSubmit={handleApplyCustomDates}
                className="pt-3 border-t border-dashed border-[#e2eae4] flex flex-wrap items-center gap-3 bg-[#f4f7f4] p-3.5 rounded-2xl"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-[#4a6b5d]">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-[#e2eae4] rounded-xl px-3 py-1.5 text-xs text-[#112217] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2e5a44]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-[#4a6b5d]">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-[#e2eae4] rounded-xl px-3 py-1.5 text-xs text-[#112217] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2e5a44]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2e5a44] text-white rounded-xl text-xs font-bold hover:bg-[#112217] transition shadow-sm cursor-pointer ml-auto"
                >
                  Apply Date Range
                </button>
              </form>
            )}

          </div>

          {/* Main Course Rankings Card with Expandable Graduates Drill-Down */}
          <div className="bg-white border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">
            
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2eae4] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#112217] text-white border border-[#112217] text-[10px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <Award size={12} className="text-[#d3efdc]" /> Course Completion Rankings
                  </span>
                  <span className="text-xs font-bold text-[#4a6b5d]">
                    Showing {filteredCourses.length} of {courses.length} Published Courses
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#4a6b5d]">
                  Courses ranked by certified graduate volume and 100% course clearance percentage. Click any course row to expand student graduation records.
                </h3>
              </div>
            </div>

            {/* Table Section */}
            {loading ? (
              <div className="text-center py-24 space-y-3">
                <Loader2 size={26} className="animate-spin text-[#2e5a44] mx-auto" />
                <p className="text-xs font-bold text-[#4a6b5d]">Loading platform course completions and graduates...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-20 space-y-3 border border-dashed border-[#e2eae4] rounded-2xl bg-[#f4f7f4]/40">
                <p className="text-sm font-black text-[#112217]">No courses match your filter criteria.</p>
                <p className="text-xs text-[#4a6b5d] max-w-md mx-auto font-medium">
                  Try broadening your badge issue date range, switching category filter to &quot;All Categories&quot;, or clearing the search terms.
                </p>
                <button 
                  onClick={handleResetFilters} 
                  className="px-4 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition mt-2 cursor-pointer shadow-sm"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="border border-[#e2eae4] rounded-2xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[10px] font-black uppercase tracking-wider text-[#4a6b5d]">
                      <th className="p-4 pl-6">Rank & Course Title</th>
                      <th className="p-4">Instructor & Category</th>
                      <th className="p-4 text-center">Total Enrolled</th>
                      <th className="p-4 text-center">Certified Graduates</th>
                      <th className="p-4 text-center">Completion Rate</th>
                      <th className="p-4 text-right pr-6">Student Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4f7f4] text-xs">
                    {filteredCourses.map((course, idx) => {
                      const isExpanded = expandedCourseIds.has(course.id);
                      const grads = course.graduates || [];

                      return (
                        <React.Fragment key={course.id}>
                          {/* Course Summary Row */}
                          <tr 
                            onClick={() => toggleRowExpansion(course.id)}
                            className={`transition cursor-pointer select-none ${
                              isExpanded ? 'bg-[#d3efdc]/20' : 'hover:bg-[#d3efdc]/15'
                            }`}
                          >
                            
                            {/* Rank & Course Title */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                  idx === 0 
                                    ? 'bg-[#112217] text-white shadow-sm ring-2 ring-[#d3efdc]' 
                                    : idx === 1 
                                    ? 'bg-[#2e5a44] text-white' 
                                    : idx === 2
                                    ? 'bg-[#4a6b5d] text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#112217] block leading-snug">
                                      {course.title}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp size={14} className="text-[#2e5a44]" />
                                    ) : (
                                      <ChevronDown size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-extrabold uppercase text-[#4a6b5d] block mt-0.5">
                                    {course.description && course.description.trim() 
                                      ? (course.description.length > 50 ? `${course.description.substring(0, 50)}...` : course.description)
                                      : 'Curriculum Courseware'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Instructor & Category */}
                            <td className="p-4">
                              <span className="font-bold text-[#112217] block">
                                {course.instructor_name || 'Platform Instructor'}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase text-[#2e5a44] bg-[#d3efdc]/70 border border-[#bce8c9] px-2 py-0.5 rounded-md inline-block mt-1">
                                {course.category_name || 'General Education'}
                              </span>
                            </td>

                            {/* Total Enrolled */}
                            <td className="p-4 text-center">
                              <span className="font-semibold text-xs text-[#4a6b5d]">
                                {course.total_enrollments} Students
                              </span>
                            </td>

                            {/* Certified Graduates */}
                            <td className="p-4 text-center">
                              <span className="font-black text-xs text-[#112217] px-3.5 py-1 bg-[#112217] text-white rounded-xl inline-flex items-center gap-1 shadow-sm">
                                <Award size={12} className="text-[#d3efdc]" />
                                <span>{course.completed_students_count} Certified</span>
                              </span>
                            </td>

                            {/* Completion Rate */}
                            <td className="p-4 text-center">
                              <div className="space-y-1 max-w-[130px] mx-auto">
                                <span className="font-bold text-xs text-[#112217] block">
                                  {course.completion_rate}%
                                </span>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-[#2e5a44] h-1.5 rounded-full" 
                                    style={{ width: `${Math.min(100, Math.max(0, course.completion_rate))}%` }} 
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Actions & Drill-Down Trigger */}
                            <td className="p-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              {course.completed_students_count > 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => toggleRowExpansion(course.id)}
                                    className="px-3 py-1.5 bg-[#f4f7f4] text-[#112217] border border-[#e2eae4] hover:bg-[#d3efdc] rounded-xl text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isExpanded ? 'Hide' : 'View'} ({course.completed_students_count})</span>
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                  <button
                                    onClick={() => setInspectCourse(course)}
                                    className="px-3 py-1.5 bg-[#112217] text-white hover:bg-[#2e5a44] rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1 cursor-pointer"
                                    title="Open Fullscreen Graduates Modal"
                                  >
                                    <ShieldCheck size={13} className="text-[#d3efdc]" />
                                    <span>Inspect</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-50 rounded-lg">
                                  No Graduates Yet
                                </span>
                              )}
                            </td>

                          </tr>

                          {/* Expanded Inline Graduates Sub-Table */}
                          {isExpanded && (
                            <tr className="bg-[#f4f7f4]/60">
                              <td colSpan={6} className="p-0">
                                <div className="p-6 border-y border-[#e2eae4] bg-[#f9faf9] space-y-3">
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2e5a44] bg-[#d3efdc] px-2.5 py-0.5 rounded-full border border-[#bce8c9]">
                                        Verified Graduates
                                      </span>
                                      <span className="text-xs font-bold text-[#112217]">
                                        {course.title} ({grads.length} Students)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setInspectCourse(course)}
                                      className="text-xs font-bold text-[#2e5a44] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Full Modal View &rarr;</span>
                                    </button>
                                  </div>

                                  {grads.length === 0 ? (
                                    <div className="text-center py-6 bg-white border border-[#e2eae4] rounded-xl">
                                      <p className="text-xs font-bold text-[#4a6b5d]">No graduates match the current date filter for this course.</p>
                                    </div>
                                  ) : (
                                    <div className="border border-[#e2eae4] rounded-xl overflow-hidden bg-white shadow-sm">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[9px] font-black uppercase tracking-wider text-[#4a6b5d]">
                                            <th className="p-3 pl-4">Student Name & Email</th>
                                            <th className="p-3">Roll Number</th>
                                            <th className="p-3">Academic Program</th>
                                            <th className="p-3">Badge Title</th>
                                            <th className="p-3 text-right pr-4">Badge Issue Date</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f4f7f4] text-xs">
                                          {grads.map((st, i) => (
                                            <tr key={`${st.student_id}-${i}`} className="hover:bg-[#d3efdc]/15 transition">
                                              
                                              {/* Student Name & Email */}
                                              <td className="p-3 pl-4">
                                                <span className="font-bold text-[#112217] block leading-snug">
                                                  {st.student_name}
                                                </span>
                                                <span className="text-[10px] text-[#4a6b5d] block">
                                                  {st.email}
                                                </span>
                                              </td>

                                              {/* Roll Number */}
                                              <td className="p-3">
                                                <span className="text-[11px] font-bold text-[#112217] bg-[#f4f7f4] px-2 py-0.5 rounded border border-[#e2eae4]">
                                                  {st.enrollment_number && st.enrollment_number !== 'N/A' ? st.enrollment_number : '—'}
                                                </span>
                                              </td>

                                              {/* Program & Department */}
                                              <td className="p-3">
                                                <span className="font-semibold text-[#112217] block">
                                                  {st.program !== 'N/A' ? st.program : 'Graduate Program'}
                                                </span>
                                                <span className="text-[10px] text-[#4a6b5d] block">
                                                  {st.department !== 'N/A' ? st.department : 'FCAIT'}
                                                </span>
                                              </td>

                                              {/* Badge Title */}
                                              <td className="p-3">
                                                <span className="font-bold text-[#112217] inline-flex items-center gap-1.5">
                                                  <Award size={13} className="text-[#2e5a44]" />
                                                  <span>{st.badge_title || `Master of ${course.title}`}</span>
                                                </span>
                                              </td>

                                              {/* Issue Date */}
                                              <td className="p-3 text-right pr-4">
                                                <span className="font-semibold text-[#112217] block">
                                                  {st.badge_issued_at ? new Date(st.badge_issued_at).toLocaleDateString() : 'Recent'}
                                                </span>
                                                <span className="text-[10px] text-[#4a6b5d]">
                                                  {st.badge_issued_at ? new Date(st.badge_issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                              </td>

                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer summary bar */}
            <div className="pt-4 border-t border-[#e2eae4] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4a6b5d]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#2e5a44]" />
                <span>EduGraph LMS • Verified Completion Badges & Graduation Analytics Engine</span>
              </div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#223d2f] transition shadow cursor-pointer"
              >
                Return to Admin Dashboard
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* Inspect Single Course Fullscreen Modal */}
      {inspectCourse && (
        <div className="fixed inset-0 z-50 bg-[#112217]/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2eae4] rounded-[32px] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#e2eae4] flex items-center justify-between bg-[#f4f7f4] shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] rounded-md text-[9px] font-black uppercase tracking-wider">
                    Course Drill-Down
                  </span>
                  <span className="text-xs font-bold text-[#4a6b5d]">
                    Instructor: {inspectCourse.instructor_name || 'Platform Instructor'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#112217]">
                  {inspectCourse.title} • Verified Graduates ({inspectCourse.graduates?.length || 0})
                </h3>
              </div>
              <button
                onClick={() => setInspectCourse(null)}
                className="w-9 h-9 rounded-xl bg-white border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:text-[#112217] hover:bg-slate-100 transition cursor-pointer"
                title="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {(!inspectCourse.graduates || inspectCourse.graduates.length === 0) ? (
                <div className="text-center py-12 border border-dashed border-[#e2eae4] rounded-2xl bg-[#f4f7f4]/50">
                  <Award size={28} className="text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-black text-[#112217]">No Graduates Found</h4>
                  <p className="text-xs text-[#4a6b5d] font-medium mt-1">
                    No student completions recorded for this course in the current date window.
                  </p>
                </div>
              ) : (
                <div className="border border-[#e2eae4] rounded-2xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[10px] font-black uppercase tracking-wider text-[#4a6b5d]">
                        <th className="p-3 pl-4">Student & Roll No.</th>
                        <th className="p-3">Program & Dept</th>
                        <th className="p-3">Badge & Recognition</th>
                        <th className="p-3 text-right pr-4">Badge Issued At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f4f7f4] text-xs">
                      {inspectCourse.graduates.map((st, i) => (
                        <tr key={`${st.student_id}-${i}`} className="hover:bg-[#d3efdc]/15 transition">
                          <td className="p-3 pl-4">
                            <span className="font-bold text-[#112217] block leading-snug">{st.student_name}</span>
                            <span className="text-[10px] font-semibold text-[#4a6b5d] block">{st.email}</span>
                            {st.enrollment_number && st.enrollment_number !== 'N/A' && (
                              <span className="text-[9px] font-black uppercase text-[#2e5a44] bg-[#d3efdc]/60 px-1.5 py-0.5 rounded border border-[#bce8c9] inline-block mt-0.5">
                                Roll: {st.enrollment_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-[#112217] block">
                              {st.program !== 'N/A' ? st.program : 'Graduate Program'}
                            </span>
                            <span className="text-[10px] text-[#4a6b5d] block">
                              {st.department !== 'N/A' ? st.department : 'FCAIT'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#112217] inline-flex items-center gap-1.5">
                              <Award size={13} className="text-[#2e5a44]" />
                              <span>{st.badge_title || `Master of ${inspectCourse.title}`}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right pr-4">
                            <span className="font-semibold text-[#112217] block">
                              {st.badge_issued_at ? new Date(st.badge_issued_at).toLocaleDateString() : 'Recent'}
                            </span>
                            <span className="text-[10px] text-[#4a6b5d]">
                              {st.badge_issued_at ? new Date(st.badge_issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e2eae4] bg-[#f4f7f4] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-[#4a6b5d]">
                Verified completion records from database
              </span>
              <button
                onClick={() => setInspectCourse(null)}
                className="px-5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition shadow cursor-pointer"
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

