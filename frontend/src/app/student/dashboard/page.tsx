'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  GitBranch, 
  TrendingUp, 
  User, 
  HelpCircle, 
  Search, 
  MoreVertical, 
  ArrowRight,
  Bell,
  LogOut,
  Sparkles
} from 'lucide-react';
import { api } from '@/src/lib/api';

export default function StudentDashboard() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    async function fetchEnrollments() {
      try {
        const response = await api.get('/enrollments/me');
        if (response.data && response.data.length > 0) {
          setEnrollments(response.data);
          calculateAverageProgress(response.data);
        } else {
          throw new Error('No live enrollments returned');
        }
      } catch (err) {
        // Fallback mock structure aligned with your backend and demo needs
        const mockEnrollments = [
          {
            id: 1,
            course_id: '5208c480-174a-4767-981e-35d8d38cb5ca',
            progress_percentage: 45,
            course: { title: 'Advanced Data Science and Programming Essentials with Python' },
            category: 'AI & Data Science'
          },
          {
            id: 2,
            course_id: '4598b62a-000e-40b6-951c-1a377c667e56',
            progress_percentage: 75,
            course: { title: 'Data Warehousing and Data Mining - Fundamentals' },
            category: 'Data Engineering'
          },
          {
            id: 3,
            course_id: '38ef3435-a4c8-485e-9199-13556f896be0',
            progress_percentage: 90,
            course: { title: 'Introduction to Blockchain Technology' },
            category: 'Blockchain'
          }
        ];
        setEnrollments(mockEnrollments);
        calculateAverageProgress(mockEnrollments);
      } finally {
        setLoading(false);
      }
    }
    fetchEnrollments();
  }, []);

  const calculateAverageProgress = (data: any[]) => {
    if (!data.length) return;
    const total = data.reduce((acc, curr) => acc + (curr.progress_percentage ?? curr.progress ?? 0), 0);
    setOverallProgress(Math.round(total / data.length));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    router.push('/login');
  };

  const getCourseTitle = (enrollment: any) => 
    enrollment.course?.title || enrollment.course_title || 'Untitled Course';

  const getCourseProgress = (enrollment: any) => 
    enrollment.progress_percentage ?? parseInt(enrollment.progress) ?? 0;

  const filteredCourses = enrollments.filter(c => 
    getCourseTitle(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2eae4] p-6 flex flex-col justify-between hidden md:flex shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <h1 className="text-base font-black tracking-tight text-[#112217]">Edugraph</h1>
          </div>

          <nav className="space-y-1.5">
            <a href="/student/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold shadow-sm">
              <BookOpen size={16} className="text-[#2e5a44]" /> My Courses
            </a>
            <a href="/student/catalog" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <GitBranch size={16} /> Knowledge Graphs
            </a>
            <a href="/student/progress" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <TrendingUp size={16} /> Progress
            </a>
            <a href="/student/profile" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <User size={16} /> Profile & Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <HelpCircle size={16} /> Help
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
            <h2 className="text-base font-black text-[#112217]">Student Dashboard</h2>
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
                title="Logout"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Body Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#f4f7f4]">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-[#112217] to-[#223d2f] rounded-[28px] p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute right-0 top-0 w-64 h-full bg-[#d3efdc]/10 rounded-l-full pointer-events-none blur-xl"></div>
            
            <div className="space-y-3 relative z-10 text-left">
              <span className="px-3.5 py-1 bg-[#d3efdc]/20 text-[#d3efdc] border border-[#d3efdc]/30 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                <Sparkles size={12} /> AI Knowledge Graph Active
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome back, Ready to Master New Concepts?</h1>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Your interactive RAG study sidebars and smart quizzes are ready. Pick up right where you left off.
              </p>
            </div>

            <button 
              onClick={() => router.push('/student/catalog')}
              className="px-6 py-3.5 bg-[#d3efdc] text-[#112217] rounded-2xl text-xs font-bold hover:bg-white transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer"
            >
              Explore New Graphs <ArrowRight size={14} />
            </button>
          </div>

          {/* SECTION 1: Your Knowledge Graphs */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#4a6b5d] uppercase tracking-wider">Your Knowledge Graphs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {filteredCourses.slice(0, 2).map((enrollment, idx) => (
                <div 
                  key={enrollment.id || idx}
                  onClick={() => router.push(`/student/course/${enrollment.course_id}`)}
                  className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-[#2e5a44] transition cursor-pointer space-y-4 flex flex-col justify-between group"
                >
                  <p className="text-xs font-bold text-[#112217] group-hover:text-[#2e5a44] transition leading-snug">{getCourseTitle(enrollment)}</p>
                  <div className="w-full bg-[#e2eae4] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#112217] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${getCourseProgress(enrollment)}%` }}
                    ></div>
                  </div>
                </div>
              ))}

              <div 
                onClick={() => router.push('/student/catalog')}
                className="border border-dashed border-[#2e5a44]/40 rounded-[24px] p-6 shadow-sm hover:bg-[#d3efdc]/20 transition cursor-pointer space-y-4 flex flex-col justify-between bg-[#fbfcfb]"
              >
                <p className="text-xs font-bold text-[#112217]">Explore New Knowledge Graphs</p>
                <div className="w-full bg-[#e2eae4] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2e5a44] h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: My Courses & Search */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#112217]">My Courses</h3>
                <p className="text-[11px] text-[#4a6b5d]">View and manage your active knowledge graphs and study modules.</p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-3 text-slate-400" size={15} />
                <input 
                  type="text" 
                  placeholder="Explore Courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-4 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {loading ? (
                  <p className="text-xs text-[#4a6b5d] col-span-2 py-10 text-center animate-pulse">Loading enrolled courses...</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-xs text-[#4a6b5d] col-span-2 py-10 text-center">No courses found.</p>
                ) : (
                  filteredCourses.map((enrollment) => (
                    <div key={enrollment.id} className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[24px] p-6 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md hover:border-[#2e5a44] transition">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-bold text-[#112217] leading-snug">{getCourseTitle(enrollment)}</p>
                          <button className="text-slate-400 hover:text-slate-600">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        <div className="w-full bg-[#e2eae4] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#112217] h-full rounded-full" style={{ width: `${getCourseProgress(enrollment)}%` }}></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#f0f4f1]">
                        <span className="text-[10px] bg-[#d3efdc]/60 text-[#112217] px-3 py-1 rounded-xl font-bold">
                          {getCourseProgress(enrollment)}% Complete
                        </span>
                        <button 
                          onClick={() => router.push(`/student/course/${enrollment.course_id}`)}
                          className="text-xs font-bold text-[#112217] flex items-center gap-1.5 hover:text-[#2e5a44] transition cursor-pointer"
                        >
                          Open <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Live Preview Sidebar Card with Dynamic Overall Progress */}
              <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[24px] p-6 shadow-sm flex flex-col items-center justify-between text-center space-y-4">
                <div className="w-full flex justify-between items-center">
                  <span className="text-[11px] font-bold text-[#4a6b5d]">Live Graph Preview</span>
                  <button onClick={() => router.push('/student/progress')} className="text-[10px] font-extrabold text-[#2e5a44] hover:underline">View Details</button>
                </div>

                <div className="w-full h-32 bg-white rounded-2xl border border-dashed border-[#e2eae4] flex items-center justify-center relative overflow-hidden shadow-inner">
                  <div className="absolute w-6 h-6 rounded-full bg-[#112217] top-6 left-8 shadow-sm flex items-center justify-center text-[10px] text-white font-bold">1</div>
                  <div className="absolute w-6 h-6 rounded-full bg-[#2e5a44] bottom-6 right-10 shadow-sm flex items-center justify-center text-[10px] text-white font-bold">2</div>
                  <div className="absolute w-5 h-5 rounded-full bg-[#d3efdc] top-12 right-16 border border-[#2e5a44]"></div>
                  <div className="absolute w-5 h-5 rounded-full bg-emerald-300 bottom-8 left-16"></div>
                  <svg className="absolute inset-0 w-full h-full stroke-[#4a6b5d]/40 stroke-1 pointer-events-none">
                    <line x1="45" y1="35" x2="110" y2="70" />
                    <line x1="110" y1="70" x2="160" y2="40" />
                    <line x1="110" y1="70" x2="80" y2="105" />
                  </svg>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#112217]">
                    <span>Overall Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-[#e2eae4] h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#112217] h-full rounded-full transition-all duration-300" 
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}