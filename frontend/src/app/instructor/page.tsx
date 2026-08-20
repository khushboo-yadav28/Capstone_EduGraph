'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  Upload, 
  Cpu, 
  TrendingUp, 
  Settings, 
  Bell, 
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { api } from '@/src/lib/api';

export default function InstructorDashboard() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await api.post('/courses/3fa85f64-5717-4562-b3fc-2c963f66afa6/ingest-pdf');
      setSuccess(true);
    } catch (err) {
      setSuccess(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between hidden md:flex">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Network size={18} />
            </div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">Edugraph</h1>
          </div>

          <nav className="space-y-1.5">
            <a href="/instructor/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
              <BookOpen size={16} className="text-slate-700" /> Manage Courses
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <Upload size={16} /> Upload Material
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <Cpu size={16} /> Content Generation
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <TrendingUp size={16} /> Graph Analytics
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <User size={16} /> Profile & Settings
            </a>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition px-2 py-1.5 rounded-lg hover:bg-rose-50 w-fit"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">INSTRUCTOR DASHBOARD</h2>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
              <Bell size={15} />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                  I
                </div>
                <span className="text-xs font-semibold text-slate-700">Instructor ▾</span>
              </div>
              
              <button 
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-semibold border border-rose-100"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Create New Course Graph</h3>
                <p className="text-[11px] text-slate-600">Create new course for graph match.</p>
              </div>
              <button 
                onClick={handleUpload}
                className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm flex items-center gap-2 w-fit"
              >
                <Upload size={14} /> Upload PDF/Material
              </button>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Active Users</span>
              <span className="text-2xl font-extrabold text-slate-900">112</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Categories</span>
              <span className="text-2xl font-extrabold text-slate-900">18</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Published Courses</span>
              <span className="text-2xl font-extrabold text-slate-900">27</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-rose-500">Pending Approvals</span>
              <span className="text-2xl font-extrabold text-slate-900">2</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800">My Generated Graphs</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">Master of System Design</span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Sample graph preview</span>
                <span className="text-[10px] text-slate-400">Interactive</span>
              </div>
              <div className="h-28 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                <div className="absolute px-2 py-0.5 bg-white/80 border rounded text-[9px] font-bold text-slate-600 shadow-sm">
                  🔒 Locked Node
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white rounded-xl py-2 text-xs font-semibold hover:bg-slate-800 transition shadow-sm">
                Analyze Graph
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}