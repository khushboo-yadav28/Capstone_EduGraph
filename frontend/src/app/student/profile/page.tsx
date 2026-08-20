'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  GitBranch, 
  TrendingUp, 
  User, 
  HelpCircle, 
  Bell, 
  LogOut, 
  Save, 
  CheckCircle2,
  Shield
} from 'lucide-react';

export default function StudentProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('Student User');
  const [email, setEmail] = useState('student@gmail.com');
  const [saved, setSaved] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
            <a href="/student/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition">
              <BookOpen size={16} /> My Courses
            </a>
            <a href="/student/catalog" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition">
              <GitBranch size={16} /> Knowledge Graphs
            </a>
            <a href="/student/profile" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
              <User size={16} className="text-slate-700" /> Profile & Settings
            </a>
          </nav>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition px-2 py-1.5 rounded-lg hover:bg-rose-50 w-fit">
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">STUDENT PROFILE & SETTINGS</h2>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <Bell size={15} />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  S
                </div>
                <span className="text-xs font-semibold text-slate-700">Student ▾</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-semibold border border-rose-100">
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                S
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Account Profile</h3>
                <p className="text-xs text-slate-500">Manage your personal credentials and notification preferences.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
                  <Shield size={16} className="text-slate-500" />
                  <span className="capitalize">Student (Linked to FastAPI Auth System)</span>
                </div>
              </div>

              <button 
                type="submit"
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
              >
                <Save size={14} /> Save Profile Changes
              </button>
            </form>

            {saved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Profile updated successfully!</span>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}