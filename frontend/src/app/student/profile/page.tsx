'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  GitBranch, 
  TrendingUp, 
  Award, 
  User, 
  LogOut,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { api } from '@/src/lib/api';

export default function StudentProfilePage() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'My Courses', path: '/student/dashboard', icon: BookOpen },
    { label: 'Knowledge Graphs', path: '/student/catalog', icon: GitBranch },
    { label: 'Progress', path: '/student/progress', icon: TrendingUp },
    { label: 'Badges & Certificates', path: '/student/badges', icon: Award },
    { label: 'Profile & Settings', path: '/student/profile', icon: User },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    router.replace('/login');
  };

  // Profile Data States
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    program: '',
    semester: '',
    enrollmentNumber: '',
    department: '',
    batch: '',
    academicYear: '',
    bio: ''
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/auth/me');
        const data = response.data;
        const stuProfile = data.student_profile || {};

        setProfile({
          fullName: data.full_name || 'N/A',
          email: data.email || 'N/A',
          program: stuProfile.program || 'N/A',
          semester: stuProfile.semester || 'N/A',
          enrollmentNumber: stuProfile.enrollment_number || 'N/A',
          department: stuProfile.department || 'N/A',
          batch: stuProfile.batch || 'N/A',
          academicYear: stuProfile.academic_year || 'N/A',
          bio: stuProfile.bio || 'No student bio provided.'
        });
      } catch (err: any) {
        console.error('Failed to fetch student profile', err);
        setErrorMsg(err.response?.data?.detail || 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f7f4] text-[#1e2923]">
      
      {/* 1. Permanent Unified Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2eae4] p-6 flex flex-col justify-between shrink-0 shadow-sm z-20">
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <h1 className="text-base font-black tracking-tight text-[#112217]">Edugraph</h1>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#d3efdc]/60 text-[#112217] shadow-sm'
                      : 'text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#2e5a44]' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition px-3 py-2 rounded-xl hover:bg-rose-50 w-fit cursor-pointer"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* 2. Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#f4f7f4]">
        
        {/* Top Header Navbar */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">STUDENT PORTAL</span>
            <h2 className="text-base font-black text-[#112217]">Profile & Settings</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-3 border-l border-[#e2eae4]">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/student/profile')}>
                <div className="w-9 h-9 rounded-full bg-[#112217] text-white flex items-center justify-center text-xs font-bold shadow-md">
                  S
                </div>
                <span className="text-xs font-bold text-[#112217]">Student ▾</span>
              </div>
              
              <button 
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content Viewport */}
        <div className="flex-1 overflow-y-auto bg-[#f4f7f4] p-8 min-h-0">
          <div className="max-w-4xl mx-auto space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-500 gap-2 font-medium">
                <Loader2 size={18} className="animate-spin text-[#2e5a44]" />
                Loading student profile...
              </div>
            ) : (
              <div className="bg-white border border-[#e2eae4] rounded-[28px] p-8 shadow-sm space-y-6">
                
                <div className="flex items-center gap-4 border-b border-[#e2eae4] pb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-black text-xl shadow-md">
                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#112217]">Student Academic Profile</h3>
                    <p className="text-xs text-[#4a6b5d]">Registered credentials and academic specifications from registration.</p>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800">
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Read-Only Details Grid */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Full Name</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.fullName}</p>
                    </div>

                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Email Address</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Academic Program / Degree</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.program}</p>
                    </div>

                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Current Semester / Year</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.semester}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Enrollment / Roll Number</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.enrollmentNumber}</p>
                    </div>

                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Academic Department</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Batch / Cohort Year</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.batch}</p>
                    </div>

                    <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                      <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Academic Year</span>
                      <p className="text-xs font-bold text-[#112217]">{profile.academicYear}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                    <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Student Bio / Summary</span>
                    <p className="text-xs font-medium text-[#1e2923] leading-relaxed">{profile.bio}</p>
                  </div>

                  <div className="p-4 bg-[#fbfcfb] rounded-2xl border border-[#e2eae4] space-y-1">
                    <span className="text-[10px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">Assigned System Role</span>
                    <div className="flex items-center gap-2 pt-1 text-xs text-[#112217] font-bold">
                      <GraduationCap size={15} className="text-[#2e5a44]" />
                      <span>Student (Knowledge Graph Learning & Assessment Access)</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}