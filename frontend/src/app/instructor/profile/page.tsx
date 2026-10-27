'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  Upload, 
  Cpu, 
  TrendingUp, 
  User, 
  Bell, 
  LogOut, 
  Shield,
  Loader2
} from 'lucide-react';
import { api } from '@/src/lib/api';

export default function InstructorProfilePage() {
  const router = useRouter();

  // Profile Data States
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    designation: '',
    department: '',
    qualifications: '',
    expertise: '',
    bio: ''
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Instructor Profile Data on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/auth/me');
        const data = response.data;
        const insProfile = data.instructor_profile || {};

        setProfile({
          fullName: data.full_name || 'N/A',
          email: data.email || 'N/A',
          designation: insProfile.designation || 'N/A',
          department: insProfile.department || 'N/A',
          qualifications: insProfile.qualifications || 'N/A',
          expertise: insProfile.expertise || 'N/A',
          bio: insProfile.bio || 'No professional bio provided.'
        });
      } catch (err: any) {
        console.error('Failed to fetch instructor profile', err);
        setErrorMsg(err.response?.data?.detail || 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden text-slate-800 selection:bg-[#2e5a44] selection:text-white">
      
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
            <a href="/instructor/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition">
              <BookOpen size={16} /> Manage Courses
            </a>
            <a href="/instructor/courses" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition">
              <Upload size={16} /> Upload Material
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition">
              <Cpu size={16} /> Content Generation
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition">
              <TrendingUp size={16} /> Graph Analytics
            </a>
            <a href="/instructor/profile" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
              <User size={16} className="text-slate-700" /> Profile & Settings
            </a>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition px-2 py-1.5 rounded-lg hover:bg-rose-50 w-fit cursor-pointer"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">INSTRUCTOR PROFILE & SETTINGS</h2>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
              <Bell size={15} />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'I'}
                </div>
                <span className="text-xs font-semibold text-slate-700">Instructor ▾</span>
              </div>
              
              <button 
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-semibold border border-rose-100 cursor-pointer"
              >
                <LogOut size= {14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-xs text-slate-500 gap-2 font-medium">
              <Loader2 size={18} className="animate-spin text-emerald-700" />
              Loading profile details...
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
              
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'I'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Instructor Account Profile</h3>
                  <p className="text-xs text-slate-500">Registered credentials and faculty specifications from registration.</p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800">
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Read-Only Details Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Full Name</span>
                    <p className="text-xs font-bold text-slate-900">{profile.fullName}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</span>
                    <p className="text-xs font-bold text-slate-900">{profile.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Designation / Academic Title</span>
                    <p className="text-xs font-bold text-slate-900">{profile.designation}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Faculty / Department</span>
                    <p className="text-xs font-bold text-slate-900">{profile.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Highest Qualification</span>
                    <p className="text-xs font-bold text-slate-900">{profile.qualifications}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Areas of Expertise</span>
                    <p className="text-xs font-bold text-slate-900">{profile.expertise}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Short Professional Bio</span>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed">{profile.bio}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned System Role</span>
                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-bold">
                    <Shield size={15} className="text-emerald-700" />
                    <span>Instructor (Course Creator & PDF Ingestion Access)</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}