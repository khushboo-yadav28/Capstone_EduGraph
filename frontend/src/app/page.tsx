'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, BookOpenCheck, ShieldAlert, ArrowRight, Network } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      {/* Header */}
      <header className="h-16 border-b bg-white px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Network className="text-emerald-600" size={24} />
          <h1 className="text-lg font-bold text-slate-800">EduGraph</h1>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold ml-2">
            AI Knowledge Graph & Adaptive Courseware
          </span>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          iMSCIT Capstone Project[cite: 1]
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-5xl mx-auto space-y-12">
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Transforming Unstructured Course Materials Into Interactive Visual Roadmaps
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Welcome to EduGraph. Eliminate cognitive overload and instructional blindness[cite: 1] through automated vector-based extraction, dynamic 2D knowledge maps[cite: 1], and real-time semantic search (RAG)[cite: 1].
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Student Card */}
          <Link 
            href="/student/course/1" 
            className="group p-6 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <GraduationCap size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Student Explorer</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Navigate personalized 2D concept graphs, explore targeted RAG study sidebars, and pass dynamic mini-quizzes to unlock pathways[cite: 1].
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition">
              <span>Launch Student View</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Instructor Card */}
          <Link 
            href="/instructor" 
            className="group p-6 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 transition space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <BookOpenCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Instructor Orchestrator</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Curate virtual classrooms, upload multi-page PDFs or video URLs, review AI draft layouts, and inspect cohort heatmaps[cite: 1].
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition">
              <span>Launch Instructor Portal</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Admin Card */}
          <Link 
            href="/admin" 
            className="group p-6 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:border-slate-800 transition space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-800">System Admin</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Supervise system logs, seed global categories, manage active user accounts, and audit platform-wide metrics.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 group-hover:translate-x-1 transition">
              <span>Launch Admin Console</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t bg-white px-8 flex items-center justify-center text-xs text-slate-400">
        EduGraph Knowledge Graph System &bull; Built with Next.js 15, Tailwind CSS, and React Flow[cite: 1]
      </footer>
    </div>
  );
}