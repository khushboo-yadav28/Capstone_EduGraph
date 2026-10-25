'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import { ArrowLeft, AlertTriangle, CheckCircle2, Users, BookOpen, Activity, Loader2 } from 'lucide-react';

export default function InstructorCourseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7f4]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#2e5a44] mx-auto" />
          <p className="text-xs font-bold text-[#4a6b5d]">Loading Pedagogical Analytics...</p>
        </div>
      </div>
    );
  }

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
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">Instructor Analytics Dashboard</span>
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

        {/* Node Difficulty & Heatmap Table */}
        <div className="bg-white rounded-3xl border border-[#e2eae4] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#e2eae4] flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#112217]">Concept Difficulty Heatmap & Attempt Insights</h3>
              <p className="text-xs text-[#4a6b5d] mt-0.5">Nodes where $\ge 40\%$ of active students require {'>'}6 total quiz attempts are flagged as difficult.</p>
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