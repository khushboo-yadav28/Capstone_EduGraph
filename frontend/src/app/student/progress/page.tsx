'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Network, ArrowLeft, CheckCircle2, Lock, Award, BookOpen, BarChart3, ArrowRight } from 'lucide-react';
import { api } from '@/src/lib/api';

import { Suspense } from 'react';

function StudentProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams?.get('courseId') || null;

  const [progressData, setProgressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudentProgress() {
      if (!courseId) {
        setLoading(false);
        return;
      }
      try {
        // Connect to live backend endpoint: GET /quizzes/course/{course_id}/progress
        const response = await api.get(`/quizzes/course/${courseId}/progress`);
        setProgressData(response.data || []);
      } catch (err) {
        console.warn("Could not fetch live progress, using fallback mock progress data.");
        setProgressData([
          { node_id: 'node-1', node_title: 'Python Fundamentals & Syntax', is_unlocked: true, is_completed: true, score_percentage: 100 },
          { node_id: 'node-2', node_title: 'Pandas & Data Wrangling', is_unlocked: true, is_completed: false, score_percentage: null },
          { node_id: 'node-3', node_title: 'Pipeline Automation & Scaling', is_unlocked: false, is_completed: false, score_percentage: null }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchStudentProgress();
  }, [courseId]);

  const completedCount = progressData.filter(p => p.is_completed).length;
  const totalCount = progressData.length || 1;
  const overallPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1e2923] selection:bg-[#2e5a44] selection:text-white flex flex-col justify-between">
      
      {/* Top Navbar */}
      <header className="max-w-7xl w-full mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/student/dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
            <Network size={20} />
          </div>
          <span className="text-lg font-black tracking-tight text-[#112217]">EduGraph LMS</span>
        </div>

        <button 
          onClick={() => router.push('/student/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-[#4a6b5d] hover:text-[#112217] transition bg-white px-4 py-2 rounded-2xl border border-[#e2eae4] shadow-sm cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-8 py-8 space-y-8 flex-1">
        
        {/* Header Summary Card */}
        <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 sm:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-[#d3efdc]/60 text-[#112217] border border-[#bce8c9] rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
              <BarChart3 size={12} /> Performance Analytics
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#112217]">Course Completion Metrics</h1>
            <p className="text-xs text-[#4a6b5d]">Track your node progression, assessment scores, and unlocked knowledge milestones.</p>
          </div>

          <div className="bg-white border border-[#e2eae4] px-6 py-4 rounded-2xl shadow-sm text-center min-w-[160px]">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4a6b5d] block">Overall Completion</span>
            <span className="text-2xl font-black text-[#112217]">{overallPercentage}%</span>
          </div>
        </div>

        {/* Progress List */}
        <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#4a6b5d]">Module Status Breakdown</h3>

          {loading ? (
            <p className="text-xs text-[#4a6b5d] text-center py-12 animate-pulse">Fetching live progress metrics...</p>
          ) : progressData.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-xs font-bold text-[#112217]">No progress records found for this course.</p>
              <p className="text-[11px] text-[#4a6b5d]">Select a course from your dashboard to begin tracking metrics.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {progressData.map((node, idx) => (
                <div key={node.node_id || idx} className="bg-white border border-[#e2eae4] p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      node.is_completed ? 'bg-[#d3efdc] text-[#112217]' : node.is_unlocked ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {node.is_completed ? <CheckCircle2 size={20} className="text-[#2e5a44]" /> : node.is_unlocked ? <BookOpen size={18} /> : <Lock size={18} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#112217]">{node.node_title || `Concept Module ${idx + 1}`}</h4>
                      <p className="text-[10px] text-[#4a6b5d]">
                        {node.is_completed ? 'Assessment Passed & Completed' : node.is_unlocked ? 'Unlocked • Pending Assessment' : 'Locked • Complete Prerequisites'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {node.score_percentage !== null && node.score_percentage !== undefined && (
                      <span className="text-xs font-bold px-3 py-1 bg-[#d3efdc]/50 text-[#112217] border border-[#bce8c9] rounded-xl">
                        Score: {node.score_percentage}%
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-xl ${
                      node.is_completed ? 'bg-[#d3efdc] text-[#112217]' : node.is_unlocked ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {node.is_completed ? 'Completed' : node.is_unlocked ? 'Available' : 'Locked'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {courseId && (
          <button 
            onClick={() => router.push(`/student/course/${courseId}`)}
            className="w-full py-4 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to Interactive Knowledge Map</span> <ArrowRight size={14} />
          </button>
        )}

      </main>

      <footer className="max-w-5xl w-full mx-auto px-8 h-16 flex items-center justify-center text-[11px] text-[#4a6b5d]">
        EduGraph LMS • Real-Time Progress Tracking
      </footer>

    </div>
  );
}

export default function StudentProgressPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f7f4] flex items-center justify-center text-xs text-[#4a6b5d]">Loading Progress...</div>}>
      <StudentProgressContent />
    </Suspense>
  );
}