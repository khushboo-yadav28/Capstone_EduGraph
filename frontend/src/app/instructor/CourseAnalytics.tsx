'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import { BarChart3, Loader2, AlertCircle, CheckCircle2, BookOpen, Users, Activity, AlertTriangle } from 'lucide-react';

interface CourseAnalyticsProps {
  courseId: string;
}

export default function CourseAnalytics({ courseId }: CourseAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // GET /courses/instructor/{course_id}/analytics
        const response = await api.get(`/courses/instructor/${courseId}/analytics`);
        setAnalyticsData(response.data);
      } catch (err: any) {
        console.error('Failed to load instructor analytics:', err);
        setError(err.response?.data?.detail || 'Failed to fetch course analytics data.');
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
      <div className="p-12 text-center text-[#4a6b5d]">
        <Loader2 className="animate-spin text-[#2e5a44] mx-auto mb-2" size={24} />
        Loading course heatmap analytics & retention stats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e2eae4] pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">INSTRUCTOR INSIGHTS</span>
          <h3 className="text-sm font-black text-[#112217]">Student Node Clearance, Retention & Difficulty Analytics</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#d3efdc]/50 text-[#2e5a44] flex items-center justify-center font-bold">
          <BarChart3 size={20} />
        </div>
      </div>

      {/* Student Retention & Active Participation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e2eae4] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#d3efdc] text-[#2e5a44] flex items-center justify-center font-bold shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#4a6b5d] uppercase tracking-wider">Student Retention Overview</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-[#112217]">{analyticsData?.total_active_students ?? 0}</span>
              <span className="text-[11px] text-slate-500 font-medium">Active Learners (out of {analyticsData?.total_enrolled_students ?? 0} Enrolled)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2eae4] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#112217] text-white flex items-center justify-center font-bold shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#4a6b5d] uppercase tracking-wider">Active Participation Rate</p>
            <span className="text-xl font-black text-[#112217] mt-0.5 block">
              {analyticsData?.total_enrolled_students > 0 
                ? Math.round((analyticsData?.total_active_students / analyticsData?.total_enrolled_students) * 100) 
                : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Nodes Heatmap Grid */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-[#112217] uppercase tracking-wider">Concept Difficulty & Attempt Heatmap</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyticsData?.nodes_analytics && analyticsData.nodes_analytics.length > 0 ? (
            analyticsData.nodes_analytics.map((node: any) => (
              <div key={node.node_id} className="bg-white border border-[#e2eae4] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-[#4a6b5d] uppercase">{node.node_key}</span>
                    <h5 className="text-xs font-black text-[#112217] leading-snug">{node.title}</h5>
                  </div>
                  {node.heatmap_status === 'RED' ? (
                    <span className="text-[10px] font-black px-2.5 py-1 bg-rose-100 text-rose-800 rounded-xl border border-rose-200 flex items-center gap-1 shrink-0">
                      <AlertTriangle size={12} /> Difficult (Red)
                    </span>
                  ) : (
                    <span className="text-[10px] font-black px-2.5 py-1 bg-[#d3efdc] text-[#112217] rounded-xl border border-[#bce8c9] flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={12} /> On Track (Green)
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#4a6b5d]">Clearance Rate:</span>
                    <span className="text-[#112217]">{node.clearance_percentage}% ({node.cleared_students_count} cleared)</span>
                  </div>
                  <div className="w-full bg-[#f4f7f4] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#2e5a44] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${node.clearance_percentage || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-[#4a6b5d] font-bold pt-1 border-t border-[#f4f7f4]">
                  <span>Struggling (&gt;6 attempts): {node.struggling_students_count} active students</span>
                  <span className={node.is_difficult_node ? 'text-rose-600 font-extrabold' : 'text-[#2e5a44]'}>
                    {node.struggling_percentage}% ratio
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-8 text-center text-xs text-[#4a6b5d] border border-dashed border-[#e2eae4] rounded-2xl">
              No analytics metrics available for this course yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}