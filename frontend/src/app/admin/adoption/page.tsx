'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  TrendingUp, 
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
  Download,
  FileSpreadsheet,
  FileText,
  Eye
} from 'lucide-react';
import { 
  api, 
  CourseGraduatesReport,
  getCourseGraduates
} from '@/src/lib/api';

export interface AdoptionCourseItem {
  id: string;
  title: string;
  description?: string;
  instructor_name: string;
  category_name: string;
  total_enrollments: number;
  active_students_count: number;
  completed_students_count: number;
  completion_rate: number;
}

export default function AdminAdoptionPage() {
  const router = useRouter();
  
  // Data State
  const [courses, setCourses] = useState<AdoptionCourseItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7_days' | '30_days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ start: string; end: string } | null>(null);

  // Export & Report Preview States
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'pdf' | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);

  // Graduates Drill-Down Modal State
  const [isGraduatesModalOpen, setIsGraduatesModalOpen] = useState(false);
  const [selectedCourseForGraduates, setSelectedCourseForGraduates] = useState<{
    id: string;
    title: string;
    instructor_name: string;
  } | null>(null);
  const [graduatesReport, setGraduatesReport] = useState<CourseGraduatesReport | null>(null);
  const [loadingGraduates, setLoadingGraduates] = useState(false);
  const [gradDatePreset, setGradDatePreset] = useState<string>('all');
  const [gradCustomStart, setGradCustomStart] = useState<string>('');
  const [gradCustomEnd, setGradCustomEnd] = useState<string>('');
  const [gradSearchQuery, setGradSearchQuery] = useState<string>('');

  // Fetch adoption metrics from the backend endpoint
  const fetchAdoptionMetrics = useCallback(async (isRefresh = false) => {
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

      const res = await api.get('/courses/admin/adoption', { params });
      
      if (res.data?.courses) {
        setCourses(res.data.courses);
        if (res.data.filter_metadata?.available_categories) {
          setAvailableCategories(res.data.filter_metadata.available_categories);
        }
      } else if (Array.isArray(res.data)) {
        setCourses(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch platform adoption metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [datePreset, appliedCustomDates]);

  // Initial and trigger load
  useEffect(() => {
    fetchAdoptionMetrics();
  }, [fetchAdoptionMetrics]);

  // Combined Filtering & Instant Search (Reactive & Immediate)
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.instructor_name.toLowerCase().includes(q) ||
        (c.category_name && c.category_name.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === 'all' ||
        (c.category_name && c.category_name.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, categoryFilter]);

  // Dynamic KPI Calculations (Reflecting the filtered subset in real-time)
  const activeKpis = useMemo(() => {
    if (filteredCourses.length === 0) {
      return {
        totalActive: 0,
        avgCompletion: 0,
        topCategory: 'N/A',
        totalEnrolled: 0,
        totalCourses: 0,
      };
    }

    const totalActive = filteredCourses.reduce((acc, c) => acc + (c.active_students_count || 0), 0);
    const totalEnrolled = filteredCourses.reduce((acc, c) => acc + (c.total_enrollments || 0), 0);
    const totalCompleted = filteredCourses.reduce((acc, c) => acc + (c.completed_students_count || 0), 0);
    const avgCompletion = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 1000) / 10 : 0;

    // Top Category Calculation
    const catMap: Record<string, number> = {};
    filteredCourses.forEach((c) => {
      const cat = c.category_name || 'General';
      catMap[cat] = (catMap[cat] || 0) + (c.total_enrollments || 0);
    });

    let topCategory = 'N/A';
    let maxEnr = -1;
    Object.entries(catMap).forEach(([cat, count]) => {
      if (count > maxEnr) {
        maxEnr = count;
        topCategory = cat;
      }
    });

    return {
      totalActive,
      avgCompletion,
      topCategory,
      totalEnrolled,
      totalCourses: filteredCourses.length,
    };
  }, [filteredCourses]);

  // Extract combined distinct categories for dropdown selector
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    availableCategories.forEach(cat => set.add(cat));
    courses.forEach(c => {
      if (c.category_name) set.add(c.category_name);
    });
    return Array.from(set).sort();
  }, [availableCategories, courses]);

  // Handler for custom date range submission
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

  // Export Handler (Excel .xlsx & PDF .pdf)
  const handleExport = async (format: 'excel' | 'pdf', viewInline = false) => {
    try {
      setExportingFormat(format);
      const params: Record<string, string> = {};
      
      if (datePreset !== 'custom') {
        params.preset = datePreset;
      } else if (appliedCustomDates?.start || appliedCustomDates?.end) {
        if (appliedCustomDates.start) params.start_date = appliedCustomDates.start;
        if (appliedCustomDates.end) params.end_date = appliedCustomDates.end;
      }
      
      if (categoryFilter !== 'all') {
        params.category_name = categoryFilter;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (viewInline) {
        params.inline = 'true';
      }

      const endpoint = format === 'excel'
        ? '/courses/admin/adoption/export/excel'
        : '/courses/admin/adoption/export/pdf';

      const res = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });

      const blobType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      const blob = new Blob([res.data], { type: blobType });
      const url = window.URL.createObjectURL(blob);

      if (viewInline && format === 'pdf') {
        if (pdfPreviewBlobUrl) {
          window.URL.revokeObjectURL(pdfPreviewBlobUrl);
        }
        setPdfPreviewBlobUrl(url);
        setIsPdfPreviewOpen(true);
      } else {
        const link = document.createElement('a');
        link.href = url;
        const dateTag = new Date().toISOString().split('T')[0];
        link.download = format === 'excel'
          ? `EduGraph_Course_Adoption_Report_${dateTag}.xlsx`
          : `EduGraph_Course_Adoption_Report_${dateTag}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      }
    } catch (err) {
      console.error(`Failed to export ${format} report:`, err);
    } finally {
      setExportingFormat(null);
    }
  };

  // Fetch Graduates drill-down details for a specific course
  const fetchGraduates = useCallback(async (courseId: string, preset?: string, start?: string, end?: string) => {
    try {
      setLoadingGraduates(true);
      const params: Record<string, string> = {};
      if (preset && preset !== 'all') params.preset = preset;
      if (start) params.start_date = start;
      if (end) params.end_date = end;

      const report = await getCourseGraduates(courseId, params);
      setGraduatesReport(report);
    } catch (err) {
      console.error('Failed to fetch course graduates:', err);
    } finally {
      setLoadingGraduates(false);
    }
  }, []);

  const handleOpenGraduatesModal = (course: AdoptionCourseItem) => {
    setSelectedCourseForGraduates({
      id: course.id,
      title: course.title,
      instructor_name: course.instructor_name,
    });
    setGradDatePreset('all');
    setGradCustomStart('');
    setGradCustomEnd('');
    setGradSearchQuery('');
    setIsGraduatesModalOpen(true);
    fetchGraduates(course.id, 'all');
  };

  const handleGradPresetChange = (preset: string) => {
    setGradDatePreset(preset);
    setGradCustomStart('');
    setGradCustomEnd('');
    if (selectedCourseForGraduates?.id) {
      fetchGraduates(selectedCourseForGraduates.id, preset);
    }
  };

  const handleGradCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourseForGraduates?.id && (gradCustomStart || gradCustomEnd)) {
      setGradDatePreset('custom');
      fetchGraduates(selectedCourseForGraduates.id, undefined, gradCustomStart, gradCustomEnd);
    }
  };

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
                  Live Analytics
                </span>
              </div>
              <h2 className="text-base font-black text-[#112217]">
                Course Adoption, Enrollment & Popularity Metrics
              </h2>
            </div>
          </div>

          {/* Action Buttons: Export PDF/Excel, Refresh, and Dashboard Link */}
          <div className="flex items-center gap-2.5">
            
            {/* Download Excel Button */}
            <button
              onClick={() => handleExport('excel')}
              disabled={exportingFormat !== null}
              className="px-3.5 py-2 bg-white border border-[#bce8c9] text-[#2e5a44] rounded-xl text-xs font-bold hover:bg-[#d3efdc] transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Download filtered adoption metrics as an Excel (.xlsx) spreadsheet"
            >
              {exportingFormat === 'excel' ? (
                <Loader2 size={13} className="animate-spin text-[#2e5a44]" />
              ) : (
                <FileSpreadsheet size={14} className="text-[#2e5a44]" />
              )}
              <span className="hidden sm:inline">Download</span>
              <span>Excel (.xlsx)</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportingFormat !== null}
              className="px-3.5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Download formatted institutional PDF report"
            >
              {exportingFormat === 'pdf' ? (
                <Loader2 size={13} className="animate-spin text-[#d3efdc]" />
              ) : (
                <Download size={14} className="text-[#d3efdc]" />
              )}
              <span className="hidden sm:inline">Download</span>
              <span>PDF (.pdf)</span>
            </button>

            {/* View PDF Preview Button */}
            <button
              onClick={() => handleExport('pdf', true)}
              disabled={exportingFormat !== null}
              className="px-3 py-2 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] rounded-xl text-xs font-bold hover:bg-[#bce8c9] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Preview generated PDF report in-app"
            >
              <Eye size={13} className="text-[#2e5a44]" />
              <span>View PDF</span>
            </button>

            <div className="h-6 w-[1px] bg-[#e2eae4] mx-0.5 hidden sm:block" />

            {/* Refresh Button */}
            <button
              onClick={() => fetchAdoptionMetrics(true)}
              disabled={refreshing}
              className="px-3 py-2 bg-[#f4f7f4] border border-[#e2eae4] text-[#2e5a44] rounded-xl text-xs font-bold hover:bg-[#d3efdc]/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Analytics Data"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            {/* Dashboard Redirect */}
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-3.5 py-2 bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">
          
          {/* Smart Analytics Summary KPI Pills Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Total Active Learners */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Total Active Learners
                  </span>
                  <div className="text-2xl font-black text-[#112217] mt-1.5 flex items-baseline gap-2">
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : activeKpis.totalActive}
                    <span className="text-xs font-bold text-[#2e5a44] bg-[#d3efdc]/60 px-2 py-0.5 rounded-full border border-[#bce8c9]">
                      In Progress
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#4a6b5d] mt-2 leading-tight">
                    Across filtered courses in selected date window
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0">
                  <Users size={20} />
                </div>
              </div>
            </div>

            {/* KPI 2: Average Completion Rate */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="w-full mr-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Average Completion Rate
                  </span>
                  <div className="text-2xl font-black text-[#112217] mt-1.5 flex items-baseline gap-1.5">
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : `${activeKpis.avgCompletion}%`}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div 
                      className="bg-[#2e5a44] h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, activeKpis.avgCompletion))}%` }} 
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-[#4a6b5d] mt-2 leading-tight">
                    {activeKpis.totalEnrolled > 0 
                      ? `${Math.round((activeKpis.totalEnrolled * activeKpis.avgCompletion) / 100)} graduated of ${activeKpis.totalEnrolled} total`
                      : 'No enrollments in window'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0">
                  <GraduationCap size={20} />
                </div>
              </div>
            </div>

            {/* KPI 3: Top Performing Category */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="overflow-hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Top Performing Category
                  </span>
                  <div className="text-lg font-black text-[#112217] mt-1.5 truncate" title={activeKpis.topCategory}>
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : activeKpis.topCategory}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-2 text-[10px] font-extrabold text-[#2e5a44] bg-[#d3efdc]/70 border border-[#bce8c9] px-2 py-0.5 rounded-full">
                    <Sparkles size={11} /> Leading Domain
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0 ml-2">
                  <BarChart3 size={20} />
                </div>
              </div>
            </div>

            {/* KPI 4: Total Filtered Registrations */}
            <div className="bg-white border border-[#e2eae4] rounded-[24px] p-5 shadow-sm hover:border-[#bce8c9] transition relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a6b5d] block">
                    Total Enrolled Students
                  </span>
                  <div className="text-2xl font-black text-[#112217] mt-1.5 flex items-baseline gap-1.5">
                    {loading ? <Loader2 size={20} className="animate-spin text-[#2e5a44]" /> : activeKpis.totalEnrolled}
                    <span className="text-xs font-bold text-[#4a6b5d]">Registrations</span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#4a6b5d] mt-2 leading-tight">
                    Across {activeKpis.totalCourses} matching published courses
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#d3efdc]/70 border border-[#bce8c9] flex items-center justify-center text-[#2e5a44] shrink-0">
                  <BookOpen size={20} />
                </div>
              </div>
            </div>

          </div>

          {/* Multiple Advanced Filters Toolbar */}
          <div className="bg-white border border-[#e2eae4] rounded-[28px] p-6 shadow-sm space-y-4">
            
            {/* Top row: Instant Search, Category Filter, and Export Action Chips */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Instant Search Bar */}
              <div className="relative flex-1 max-w-xl">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Instant search by course title, instructor, or category..."
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

              {/* Quick Export Chips & Reset Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExport('excel')}
                  disabled={exportingFormat !== null}
                  className="px-3 py-2.5 bg-[#f4f7f4] border border-[#bce8c9] text-[#2e5a44] rounded-2xl text-xs font-bold hover:bg-[#d3efdc] transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Export active filtered view to Excel (.xlsx)"
                >
                  <FileSpreadsheet size={13} />
                  <span>.xlsx</span>
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exportingFormat !== null}
                  className="px-3 py-2.5 bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] rounded-2xl text-xs font-bold hover:bg-[#112217] hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Export active filtered view to PDF (.pdf)"
                >
                  <FileText size={13} />
                  <span>.pdf</span>
                </button>

                {isAnyFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-2.5 bg-[#f4f7f4] border border-[#bce8c9] text-[#2e5a44] rounded-2xl text-xs font-bold hover:bg-[#d3efdc] transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <X size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

            </div>

            {/* Bottom row: Enrolled Date Filter Controls */}
            <div className="pt-4 border-t border-[#e2eae4] flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4a6b5d] mr-2">
                  <Calendar size={14} className="text-[#2e5a44]" />
                  <span>Enrolled Date Filter:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7_days', label: 'Last 7 Days' },
                    { id: '30_days', label: 'Last 30 Days' },
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
                  Filtering Enrollments by: {' '}
                  <strong className="text-[#112217]">
                    {datePreset === 'all'
                      ? 'All Historical Enrollments'
                      : datePreset === 'today'
                      ? 'Today Only'
                      : datePreset === '7_days'
                      ? 'Last 7 Days'
                      : datePreset === '30_days'
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

          {/* Main Adoption & Popularity Content Card */}
          <div className="bg-white border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">
            
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2eae4] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] text-[10px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <TrendingUp size={12} className="text-[#2e5a44]" /> Platform Enrollment Rankings
                  </span>
                  <span className="text-xs font-bold text-[#4a6b5d]">
                    Showing {filteredCourses.length} of {courses.length} Published Courses
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#4a6b5d]">
                  Track multi-filtered student enrollment velocity, active learners, and 100% completion rates across all academic departments.
                </h3>
              </div>
            </div>

            {/* Table Section */}
            {loading ? (
              <div className="text-center py-24 space-y-3">
                <Loader2 size={26} className="animate-spin text-[#2e5a44] mx-auto" />
                <p className="text-xs font-bold text-[#4a6b5d]">Loading platform course adoption metrics...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-20 space-y-3 border border-dashed border-[#e2eae4] rounded-2xl bg-[#f4f7f4]/40">
                <p className="text-sm font-black text-[#112217]">No courses match your filter criteria.</p>
                <p className="text-xs text-[#4a6b5d] max-w-md mx-auto font-medium">
                  Try broadening your enrolled date range, switching category filter to &quot;All Categories&quot;, or clearing the search keywords.
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
                      <th className="p-4 text-center">Active Learners</th>
                      <th className="p-4 text-center">Completions & Rate</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4f7f4] text-xs">
                    {filteredCourses.map((course, idx) => (
                      <tr key={course.id} className="hover:bg-[#d3efdc]/15 transition">
                        
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
                              <span className="font-bold text-[#112217] block leading-snug">
                                {course.title}
                              </span>
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
                          <span className="font-black text-xs text-[#112217] px-3 py-1 bg-[#d3efdc]/60 border border-[#bce8c9] rounded-xl inline-block">
                            {course.total_enrollments} Students
                          </span>
                        </td>

                        {/* Active Learners */}
                        <td className="p-4 text-center">
                          <span className="font-bold text-xs text-[#4a6b5d] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl inline-block">
                            {course.active_students_count} Active
                          </span>
                        </td>

                        {/* Completions & Rate */}
                        <td className="p-4 text-center">
                          <div className="space-y-1 max-w-[130px] mx-auto">
                            <span className="font-bold text-xs text-[#112217] block">
                              {course.completed_students_count} ({course.completion_rate}%)
                            </span>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-[#2e5a44] h-1.5 rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(0, course.completion_rate))}%` }} 
                              />
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right pr-6">
                          {course.completed_students_count > 0 ? (
                            <button
                              onClick={() => handleOpenGraduatesModal(course)}
                              className="px-3.5 py-1.5 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                              title="View Verified Graduates"
                            >
                              <Award size={13} className="text-[#d3efdc]" />
                              <span>Graduates ({course.completed_students_count})</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-50 rounded-lg">
                              In Progress
                            </span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer summary bar */}
            <div className="pt-4 border-t border-[#e2eae4] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4a6b5d]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#2e5a44]" />
                <span>EduGraph LMS • Platform Adoption & Courseware Popularity Engine</span>
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

      {/* Verified Graduates Drill-Down Modal */}
      {isGraduatesModalOpen && (
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
                    Instructor: {selectedCourseForGraduates?.instructor_name || 'Platform Instructor'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#112217]">
                  {selectedCourseForGraduates?.title} • Verified Graduates
                </h3>
              </div>
              <button
                onClick={() => setIsGraduatesModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:text-[#112217] hover:bg-slate-100 transition cursor-pointer"
                title="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body & Filtering Controls */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Modal Filter Toolbar */}
              <div className="bg-[#f4f7f4] border border-[#e2eae4] rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-[#4a6b5d] mr-1 flex items-center gap-1">
                      <Calendar size={13} className="text-[#2e5a44]" /> Issue Date:
                    </span>
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'same_day', label: 'Same Day' },
                      { id: 'within_1_day', label: 'Within 1 Day' },
                      { id: '1_week', label: '1 Week' },
                      { id: '1_month', label: '1 Month' },
                      { id: 'custom', label: 'Custom' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => handleGradPresetChange(btn.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          gradDatePreset === btn.id
                            ? 'bg-[#112217] text-white shadow-sm'
                            : 'bg-white text-[#4a6b5d] hover:bg-[#d3efdc]/50 border border-[#e2eae4]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative max-w-xs w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search graduate name or roll number..."
                      value={gradSearchQuery}
                      onChange={(e) => setGradSearchQuery(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#112217] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2e5a44] font-semibold"
                    />
                  </div>
                </div>

                {gradDatePreset === 'custom' && (
                  <form onSubmit={handleGradCustomApply} className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e2eae4]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#4a6b5d]">
                      <span>From:</span>
                      <input
                        type="date"
                        value={gradCustomStart}
                        onChange={(e) => setGradCustomStart(e.target.value)}
                        className="bg-white border border-[#e2eae4] rounded-lg px-2.5 py-1 text-xs text-[#112217]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#4a6b5d]">
                      <span>To:</span>
                      <input
                        type="date"
                        value={gradCustomEnd}
                        onChange={(e) => setGradCustomEnd(e.target.value)}
                        className="bg-white border border-[#e2eae4] rounded-lg px-2.5 py-1 text-xs text-[#112217]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#2e5a44] text-white rounded-lg text-xs font-bold hover:bg-[#112217] transition cursor-pointer"
                    >
                      Filter
                    </button>
                  </form>
                )}
              </div>

              {/* Graduates List Table */}
              {loadingGraduates ? (
                <div className="text-center py-16 space-y-2">
                  <Loader2 size={24} className="animate-spin text-[#2e5a44] mx-auto" />
                  <p className="text-xs font-bold text-[#4a6b5d]">Fetching verified graduate records...</p>
                </div>
              ) : (
                (() => {
                  const filteredList = (graduatesReport?.graduates || []).filter((g) => {
                    if (!gradSearchQuery) return true;
                    const q = gradSearchQuery.toLowerCase();
                    return (
                      g.student_name.toLowerCase().includes(q) ||
                      g.email.toLowerCase().includes(q) ||
                      (g.enrollment_number && g.enrollment_number.toLowerCase().includes(q))
                    );
                  });

                  if (filteredList.length === 0) {
                    return (
                      <div className="text-center py-12 border border-dashed border-[#e2eae4] rounded-2xl bg-[#f4f7f4]/50">
                        <Award size={28} className="text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-black text-[#112217]">No Graduates Found</h4>
                        <p className="text-xs text-[#4a6b5d] font-medium mt-1">
                          No student completions match the chosen date filter for this course.
                        </p>
                      </div>
                    );
                  }

                  return (
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
                          {filteredList.map((st, i) => (
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
                                  {st.department !== 'N/A' ? st.department : 'FCAIT Faculty'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-[#112217] inline-flex items-center gap-1.5">
                                  <Award size={13} className="text-[#2e5a44]" />
                                  <span>{st.badge_title || 'Certified Graduate'}</span>
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
                  );
                })()
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e2eae4] bg-[#f4f7f4] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-[#4a6b5d]">
                Verified completion badge data from database
              </span>
              <button
                onClick={() => setIsGraduatesModalOpen(false)}
                className="px-5 py-2 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition shadow cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PDF Report In-App Preview Modal */}
      {isPdfPreviewOpen && pdfPreviewBlobUrl && (
        <div className="fixed inset-0 z-50 bg-[#112217]/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2eae4] rounded-[32px] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e2eae4] flex items-center justify-between bg-[#f4f7f4] shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#d3efdc] text-[#112217] border border-[#bce8c9] rounded-md text-[9px] font-black uppercase tracking-wider">
                    Institutional Report Preview
                  </span>
                  <span className="text-xs font-bold text-[#4a6b5d]">
                    Filtered Window: {datePreset === 'all' ? 'All Time' : datePreset.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-black text-[#112217]">
                  Platform Course Adoption &amp; Popularity Report (.pdf)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-3.5 py-1.5 bg-[#112217] text-white rounded-xl text-xs font-bold hover:bg-[#2e5a44] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download size={13} className="text-[#d3efdc]" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:text-[#112217] hover:bg-slate-100 transition cursor-pointer"
                  title="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF iframe */}
            <div className="flex-1 p-4 bg-[#f4f7f4] overflow-hidden">
              <iframe
                src={pdfPreviewBlobUrl}
                className="w-full h-full rounded-2xl border border-[#e2eae4] bg-white shadow-inner"
                title="Course Adoption PDF Preview"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e2eae4] bg-white flex items-center justify-between shrink-0">
              <span className="text-xs text-[#4a6b5d] font-semibold">
                EduGraph LMS • Official Course Adoption Analytics Document
              </span>
              <button
                onClick={() => setIsPdfPreviewOpen(false)}
                className="px-5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#112217] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
