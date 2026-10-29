'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getInstructorQuizReport, InstructorQuizReport } from '@/src/lib/api';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  BookOpen, 
  Activity, 
  Loader2,
  Filter,
  Search,
  Clock,
  Award,
  UserCheck,
  UserX,
  TrendingDown,
  TrendingUp,
  FileQuestion
} from 'lucide-react';

export default function InstructorCourseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Granular Quiz Performance & Non-Attempted Report States
  const [quizReport, setQuizReport] = useState<InstructorQuizReport | null>(null);
  const [loadingQuizReport, setLoadingQuizReport] = useState(false);
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('all');
  const [activeFilterTab, setActiveFilterTab] = useState<'above_70' | 'below_70' | 'non_attempted'>('above_70');
  const [studentSearch, setStudentSearch] = useState('');

  // 1. Fetch Course Analytics (Heatmap, Clearance)
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/courses/instructor/${courseId}/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load instructor analytics', err);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) {
      fetchAnalytics();
    }
  }, [courseId]);

  // 2. Fetch Granular Quiz & Non-Attempted Student Report
  useEffect(() => {
    const fetchQuizReport = async () => {
      if (!courseId) return;
      setLoadingQuizReport(true);
      try {
        const nodeId = selectedNodeFilter === 'all' ? undefined : selectedNodeFilter;
        const report = await getInstructorQuizReport(courseId, nodeId);
        setQuizReport(report);
      } catch (err) {
        console.error('Failed to load quiz performance report', err);
      } finally {
        setLoadingQuizReport(false);
      }
    };
    fetchQuizReport();
  }, [courseId, selectedNodeFilter]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7f4]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#2e5a44] mx-auto" />
          <p className="text-xs font-bold text-[#4a6b5d]">Loading Pedagogical Analytics & Reports...</p>
        </div>
      </div>
    );
  }

  // Filter students by search term
  const filteredAbove70 = quizReport?.students_above_70.filter(s => 
    s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.student_email.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  const filteredBelow70 = quizReport?.students_below_70.filter(s => 
    s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.student_email.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  const filteredNonAttempted = quizReport?.students_non_attempted.filter(s => 
    s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.student_email.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1e2923] p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-[#e2eae4] shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/instructor/dashboard')}
              className="p-2.5 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] hover:bg-[#d3efdc]/40 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">
                Faculty Pedagogical Analytics & Reports
              </span>
              <h1 className="text-xl font-black text-[#112217]">{analytics?.course_title || 'Course Analytics'}</h1>
            </div>
          </div>
        </div>

        {/* Retention & Enrollment Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e2eae4] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#d3efdc] text-[#2e5a44] flex items-center justify-center font-bold">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#4a6b5d] uppercase tracking-wider">Student Retention Overview</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-[#112217]">{analytics?.total_active_students}</span>
                <span className="text-xs text-slate-500 font-medium">Active Learners (out of {analytics?.total_enrolled_students} Enrolled)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e2eae4] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#4a6b5d] uppercase tracking-wider">Active Participation Rate</p>
              <span className="text-2xl font-black text-[#112217] mt-1 block">
                {analytics?.total_enrolled_students > 0 
                  ? Math.round((analytics?.total_active_students / analytics?.total_enrolled_students) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: QUIZ PERFORMANCE & NON-ATTEMPTED STUDENT REPORT */}
        <div className="bg-white rounded-3xl border border-[#e2eae4] shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2eae4] pb-5">
            <div>
              <h3 className="text-base font-black text-[#112217] flex items-center gap-2">
                <FileQuestion size={18} className="text-[#2e5a44]" />
                Quiz Performance & Non-Attempted Learner Tracking
              </h3>
              <p className="text-xs text-[#4a6b5d] mt-0.5">
                Monitor student scores against the 70% mastery threshold and track enrolled students who have not attempted assessments.
              </p>
            </div>

            {/* Concept Node Filter Dropdown */}
            <div className="flex items-center gap-2.5">
              <Filter size={15} className="text-[#4a6b5d]" />
              <select
                value={selectedNodeFilter}
                onChange={(e) => setSelectedNodeFilter(e.target.value)}
                className="bg-[#f4f7f4] border border-[#e2eae4] text-xs font-bold text-[#112217] rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-[#2e5a44] cursor-pointer"
              >
                <option value="all">All Course Concepts</option>
                {analytics?.nodes_analytics?.map((node: any) => (
                  <option key={node.node_id} value={node.node_id}>
                    {node.node_key}: {node.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3 Metric Cards: Scored >= 70, Scored < 70, Non-Attempted */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: >= 70% */}
            <button
              onClick={() => setActiveFilterTab('above_70')}
              className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
                activeFilterTab === 'above_70'
                  ? 'bg-[#d3efdc]/50 border-[#2e5a44] ring-2 ring-[#2e5a44]/20'
                  : 'bg-[#fbfcfb] border-[#e2eae4] hover:bg-[#f4f7f4]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2e5a44] flex items-center gap-1.5">
                  <TrendingUp size={14} /> Passed (&ge; 70%)
                </span>
                <span className="w-6 h-6 rounded-lg bg-[#d3efdc] text-[#112217] flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
              </div>
              <div className="text-2xl font-black text-[#112217]">
                {quizReport?.summary.scored_above_70_count ?? 0}
              </div>
              <p className="text-[11px] text-[#4a6b5d] mt-0.5">Students achieved mastery threshold</p>
            </button>

            {/* Card 2: < 70% */}
            <button
              onClick={() => setActiveFilterTab('below_70')}
              className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
                activeFilterTab === 'below_70'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
                  : 'bg-[#fbfcfb] border-[#e2eae4] hover:bg-[#f4f7f4]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <TrendingDown size={14} /> Remediation (&lt; 70%)
                </span>
                <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">
                  !
                </span>
              </div>
              <div className="text-2xl font-black text-rose-900">
                {quizReport?.summary.scored_below_70_count ?? 0}
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5">Students scored below passing score</p>
            </button>

            {/* Card 3: Non-Attempted */}
            <button
              onClick={() => setActiveFilterTab('non_attempted')}
              className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
                activeFilterTab === 'non_attempted'
                  ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
                  : 'bg-[#fbfcfb] border-[#e2eae4] hover:bg-[#f4f7f4]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserX size={14} /> Not Attempted
                </span>
                <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                  —
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {quizReport?.summary.total_non_attempted ?? 0}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">Enrolled learners with zero attempts</p>
            </button>
          </div>

          {/* Student Search & List Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#112217]">
                  Showing: <span className="text-[#2e5a44]">
                    {activeFilterTab === 'above_70' && `Learners Scored ≥ 70% (${filteredAbove70.length})`}
                    {activeFilterTab === 'below_70' && `Learners Scored < 70% (${filteredBelow70.length})`}
                    {activeFilterTab === 'non_attempted' && `Enrolled Learners Not Attempted Yet (${filteredNonAttempted.length})`}
                  </span>
                </span>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-[#4a6b5d]" />
                <input
                  type="text"
                  placeholder="Filter student name or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#f4f7f4] border border-[#e2eae4] rounded-xl text-xs text-[#112217] outline-none focus:ring-1 focus:ring-[#2e5a44]"
                />
              </div>
            </div>

            {loadingQuizReport ? (
              <div className="text-center py-10 space-y-2">
                <Loader2 size={20} className="animate-spin text-[#2e5a44] mx-auto" />
                <p className="text-xs text-[#4a6b5d] font-bold">Updating report records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#e2eae4] rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f4f7f4] text-[#4a6b5d] text-[11px] font-black uppercase tracking-wider border-b border-[#e2eae4]">
                      <th className="p-3.5 pl-5">Student Learner</th>
                      <th className="p-3.5">Email</th>
                      {activeFilterTab !== 'non_attempted' ? (
                        <>
                          <th className="p-3.5">Best Score</th>
                          <th className="p-3.5">Latest Score</th>
                          <th className="p-3.5">Attempts</th>
                          <th className="p-3.5 pr-5">Last Attempt Date</th>
                        </>
                      ) : (
                        <th className="p-3.5 pr-5">Enrollment Date</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2eae4] text-xs font-medium text-[#1e2923]">
                    {/* Tab: Above 70% */}
                    {activeFilterTab === 'above_70' && (
                      filteredAbove70.length > 0 ? (
                        filteredAbove70.map((s) => (
                          <tr key={s.student_id} className="hover:bg-[#fbfcfb] transition">
                            <td className="p-3.5 pl-5 font-bold text-[#112217] flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#d3efdc] text-[#112217] font-black text-xs flex items-center justify-center shrink-0">
                                {s.student_name ? s.student_name[0].toUpperCase() : 'S'}
                              </div>
                              <span>{s.student_name}</span>
                            </td>
                            <td className="p-3.5 text-[#4a6b5d] font-mono text-[11px]">{s.student_email}</td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#d3efdc] text-[#112217]">
                                {s.best_score}%
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-700 font-semibold">{s.latest_score}%</td>
                            <td className="p-3.5 text-slate-600">{s.attempts_count} attempt(s)</td>
                            <td className="p-3.5 pr-5 text-[11px] text-[#4a6b5d]">
                              {s.latest_attempt_at ? new Date(s.latest_attempt_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-[#4a6b5d]">
                            No students currently scored ≥ 70% for this selection.
                          </td>
                        </tr>
                      )
                    )}

                    {/* Tab: Below 70% */}
                    {activeFilterTab === 'below_70' && (
                      filteredBelow70.length > 0 ? (
                        filteredBelow70.map((s) => (
                          <tr key={s.student_id} className="hover:bg-rose-50/30 transition">
                            <td className="p-3.5 pl-5 font-bold text-[#112217] flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                                {s.student_name ? s.student_name[0].toUpperCase() : 'S'}
                              </div>
                              <span>{s.student_name}</span>
                            </td>
                            <td className="p-3.5 text-[#4a6b5d] font-mono text-[11px]">{s.student_email}</td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800">
                                {s.best_score}%
                              </span>
                            </td>
                            <td className="p-3.5 text-rose-700 font-semibold">{s.latest_score}%</td>
                            <td className="p-3.5 text-slate-600">{s.attempts_count} attempt(s)</td>
                            <td className="p-3.5 pr-5 text-[11px] text-[#4a6b5d]">
                              {s.latest_attempt_at ? new Date(s.latest_attempt_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-[#4a6b5d]">
                            No students currently scored &lt; 70% for this selection.
                          </td>
                        </tr>
                      )
                    )}

                    {/* Tab: Non-Attempted */}
                    {activeFilterTab === 'non_attempted' && (
                      filteredNonAttempted.length > 0 ? (
                        filteredNonAttempted.map((s) => (
                          <tr key={s.student_id} className="hover:bg-[#fbfcfb] transition">
                            <td className="p-3.5 pl-5 font-bold text-[#112217] flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                                {s.student_name ? s.student_name[0].toUpperCase() : 'S'}
                              </div>
                              <span>{s.student_name}</span>
                            </td>
                            <td className="p-3.5 text-[#4a6b5d] font-mono text-[11px]">{s.student_email}</td>
                            <td className="p-3.5 pr-5 text-[11px] text-[#4a6b5d]">
                              {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-xs text-[#4a6b5d]">
                            All enrolled students have attempted the assessment!
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: NODE DIFFICULTY & HEATMAP TABLE */}
        <div className="bg-white rounded-3xl border border-[#e2eae4] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#e2eae4] flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#112217]">Concept Difficulty Heatmap & Attempt Insights</h3>
              <p className="text-xs text-[#4a6b5d] mt-0.5">
                Nodes where &ge; 40% of active students require &gt; 6 total quiz attempts are flagged as difficult.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f7f4] text-[#4a6b5d] text-[11px] font-black uppercase tracking-wider border-b border-[#e2eae4]">
                  <th className="p-4 pl-6">Topic Key & Title</th>
                  <th className="p-4">Clearance Rate</th>
                  <th className="p-4">Struggling Learners (&gt;6 Attempts)</th>
                  <th className="p-4 pr-6">Heatmap Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae4] text-xs font-medium text-[#1e2923]">
                {analytics?.nodes_analytics?.map((node: any) => (
                  <tr key={node.node_id} className="hover:bg-[#fbfcfb] transition-colors">
                    <td className="p-4 pl-6">
                      <span className="font-mono text-[10px] text-[#4a6b5d] block uppercase">{node.node_key}</span>
                      <span className="font-black text-[#112217]">{node.title}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{node.clearance_percentage}%</span>
                        <span className="text-[10px] text-slate-500">({node.cleared_students_count} cleared)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${node.is_difficult_node ? 'text-rose-600' : 'text-[#2e5a44]'}`}>
                          {node.struggling_percentage}%
                        </span>
                        <span className="text-[10px] text-slate-500">({node.struggling_students_count} students)</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6">
                      {node.heatmap_status === 'RED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle size={12} /> Difficult Concept (Red)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-[#d3efdc] text-[#112217] border border-[#bce8c9]">
                          <CheckCircle2 size={12} /> On Track (Green)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
