'use client';

import React from 'react';
import Link from 'next/link';
import { Network, ArrowRight, ShieldCheck, Zap, BookOpen } from 'lucide-react';

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
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto space-y-8">
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Transform Unstructured Coursework into Interactive Concept Maps
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Eliminate cognitive overload with automated vector extraction, 2D Knowledge Graph nodes, and context-aware RAG AI study assistants.
          </p>
        </div>

        {/* Dynamic Launch Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 group"
          >
            <span>Access Platform</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-sm transition"
          >
            Create Student / Instructor Account
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left pt-12 border-t border-slate-200/60">
          <div className="p-5 bg-white border rounded-2xl space-y-2 shadow-sm">
            <Zap className="text-emerald-600" size={20} />
            <h3 className="text-xs font-bold text-slate-800">Automated DAG Construction</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload course syllabus PDFs and generate dynamic dependency graphs automatically.
            </p>
          </div>
          <div className="p-5 bg-white border rounded-2xl space-y-2 shadow-sm">
            <BookOpen className="text-blue-600" size={20} />
            <h3 className="text-xs font-bold text-slate-800">Prerequisite Node Unlocking</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Complete quizzes and pass evaluations to unlock downstream knowledge nodes.
            </p>
          </div>
          <div className="p-5 bg-white border rounded-2xl space-y-2 shadow-sm">
            <ShieldCheck className="text-slate-700" size={20} />
            <h3 className="text-xs font-bold text-slate-800">Role-Based Gateways</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dedicated portals for System Admins, Content Instructors, and Active Students.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t bg-white px-8 flex items-center justify-center text-xs text-slate-400">
        EduGraph Knowledge Graph System &bull; Built with Next.js & FastAPI
      </footer>
    </div>
  );
}