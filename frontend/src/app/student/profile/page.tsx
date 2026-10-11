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
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Sidebar matching theme */}
      <aside className="w-64 bg-white border-r border-[#e2eae4] p-6 flex flex-col justify-between hidden md:flex shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <h1 className="text-base font-black tracking-tight text-[#112217]">Edugraph</h1>
          </div>

          <nav className="space-y-1.5">
            <a href="/student/dashboard" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <BookOpen size={16} /> My Courses
            </a>
            <a href="/student/catalog" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <GitBranch size={16} /> Knowledge Graphs
            </a>
            <a href="/student/progress" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <TrendingUp size={16} /> Progress
            </a>
            <a href="/student/profile" className="flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold shadow-sm">
              <User size={16} className="text-[#2e5a44]" /> Profile & Settings
            </a>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition px-3 py-2 rounded-xl hover:bg-rose-50 w-fit"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Navbar */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between z-10 shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">STUDENT PORTAL</span>
            <h2 className="text-base font-black text-[#112217]">Student Profile & Settings</h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/30 transition">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-[#e2eae4]">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/student/profile')}>
                <div className="w-9 h-9 rounded-full bg-[#112217] text-white flex items-center justify-center text-xs font-bold shadow-md">
                  S
                </div>
                <span className="text-xs font-bold text-[#112217]">Student ▾</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl bg-[#f4f7f4]">
          
          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 sm:p-10 shadow-xl space-y-6">
            <div className="flex items-center gap-4 border-b border-[#e2eae4] pb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold text-xl shadow-md">
                S
              </div>
              <div>
                <h3 className="text-lg font-black text-[#112217]">Student Account Profile</h3>
                <p className="text-xs text-[#4a6b5d]">Manage your personal credentials and notification preferences.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">Account Role</label>
                <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-2xl border border-[#e2eae4] text-xs text-[#4a6b5d] font-semibold shadow-sm">
                  <Shield size={16} className="text-[#2e5a44]" />
                  <span className="capitalize">Student (Linked to FastAPI Auth System)</span>
                </div>
              </div>

              <button 
                type="submit"
                className="bg-[#112217] text-white px-6 py-3.5 rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Save size={15} /> Save Profile Changes
              </button>
            </form>

            {saved && (
              <div className="p-4 bg-[#d3efdc]/50 border border-[#bce8c9] text-[#112217] text-xs rounded-2xl flex items-center gap-2 font-bold shadow-sm">
                <CheckCircle2 size={16} className="text-[#2e5a44]" />
                <span>Profile updated successfully!</span>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}