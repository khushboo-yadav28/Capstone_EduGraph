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
  Sparkles,
  Award,
  Loader2,
  CheckCircle2,
  X,
  Download,
  ExternalLink
} from 'lucide-react';
import { api } from '@/src/lib/api';

interface Badge {
  id: string;
  enrollment_id: number;
  course_id?: string;
  course_title?: string;
  badge_title: string;
  badge_image_url: string;
  issued_at: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  // Modal State for Badge Preview
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Strict Authentication & Token Guard
    const rawToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.trim() !== '' ? rawToken.trim() : null;

    if (!token) {
      console.warn('StudentDashboard: Missing or invalid auth token. Redirecting immediately to /login...');
      setLoading(true);
      setAuthChecked(false);
      router.replace('/login');
      return;
    }

    setAuthChecked(true);

    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch enrollments
        try {
          const response = await api.get('/enrollments/me');
          if (isMounted) {
            if (response.data && response.data.length > 0) {
              setEnrollments(response.data);
              calculateAverageProgress(response.data);
            } else {
              setEnrollments([]);
              setOverallProgress(0);
            }
          }
        } catch (err: any) {
          console.warn('Could not fetch enrollments:', err?.response?.data || err?.message);
          if (isMounted) {
            setEnrollments([]);
            setOverallProgress(0);
          }
        }

        // Fetch earned badges (GET /enrollments/badges/me)
        try {
          const badgeRes = await api.get('/enrollments/badges/me');
          if (isMounted) {
            setBadges(badgeRes.data || []);
          }
        } catch (badgeErr: any) {
          console.warn('Failed to fetch badges:', badgeErr?.response?.data || badgeErr?.message);
          if (isMounted) {
            setBadges([]);
          }
        }

      } finally {
        if (isMounted) {
          setLoading(false);
          setBadgesLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [router]);

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

  const handleDownloadCertificate = async (courseId?: string, courseTitle?: string) => {
    if (!courseId) {
      alert('Certificate ID not associated with this badge.');
      return;
    }
    try {
      const response = await api.get(`/enrollments/${courseId}/certificate/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Edugraph_Certificate_${(courseTitle || 'Course').replace(/\s+/g, '_')}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Certificate is only available for fully completed courses (100%).');
    }
  };

  const getCourseTitle = (enrollment: any) => 
    enrollment.course?.title || enrollment.course_title || 'Untitled Course';

  const getCourseProgress = (enrollment: any) => 
    enrollment.progress_percentage ?? parseInt(enrollment.progress) ?? 0;

  const filteredCourses = enrollments.filter(c => 
    getCourseTitle(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Guard display: Render loading screen until session verification and initial fetches settle
  if (!authChecked || loading) {
    return (
      <div className="h-screen w-full bg-[#f4f7f4] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md animate-pulse">
          <Network size={24} />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#2e5a44]">
          <Loader2 size={16} className="animate-spin" />
          <span>Verifying session & loading student dashboard...</span>
        </div>
      </div>
    );
  }

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
            <a href="/student/badges" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <Award size={16} /> Badges & Certificates
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
          className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition px-3 py-2 rounded-xl hover:bg-rose-50 w-fit cursor-pointer"
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
            <button className="w-10 h-10 rounded-full bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/30 transition cursor-pointer">
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100 cursor-pointer"
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

          {/* SECTION 2: Earned Badges & Achievements (Interactive Click for Preview & Download) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#112217]">My Earned Course Badges</h3>
                <p className="text-[11px] text-[#4a6b5d]">Click any badge to view details, verify credentials, or download.</p>
              </div>
              <button 
                onClick={() => router.push('/student/badges')}
                className="text-xs font-bold text-[#2e5a44] hover:text-[#112217] transition flex items-center gap-1 cursor-pointer bg-[#d3efdc]/50 px-3.5 py-1.5 rounded-xl border border-[#bce8c9]"
              >
                View Badges Page <ArrowRight size={13} />
              </button>
            </div>

            {badgesLoading ? (
              <div className="p-8 text-center text-xs text-[#4a6b5d] bg-white border border-[#e2eae4] rounded-[24px]">
                <Loader2 className="animate-spin text-[#2e5a44] mx-auto mb-2" size={20} />
                Loading earned badges...
              </div>
            ) : badges.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4a6b5d] bg-white border border-[#e2eae4] rounded-[24px] space-y-1">
                <Award className="mx-auto text-[#2e5a44] mb-1" size={22} />
                <p className="font-bold text-[#112217]">No badges earned yet</p>
                <p>Complete course milestones and master all nodes to unlock verified credentials!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {badges.map((badge) => (
                  <div 
                    key={badge.id} 
                    onClick={() => setSelectedBadge(badge)}
                    className="bg-white border border-[#e2eae4] rounded-[24px] p-6 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-[#2e5a44] transition cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#d3efdc]/50 border border-[#bce8c9] flex items-center justify-center shrink-0 p-2">
                      <img 
                        src={badge.badge_image_url || '/default-badge.png'} 
                        alt={badge.badge_title} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <h4 className="text-xs font-black text-[#112217] truncate group-hover:text-[#2e5a44] transition">{badge.badge_title}</h4>
                      <p className="text-[10px] text-[#4a6b5d]">Issued: {new Date(badge.issued_at).toLocaleDateString()}</p>
                      <span className="inline-block text-[9px] font-extrabold px-2 py-0.5 bg-[#d3efdc]/60 text-[#2e5a44] rounded-full">
                        Click to View 🔍
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: My Courses & Search */}
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
                          <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  <button onClick={() => router.push('/student/progress')} className="text-[10px] font-extrabold text-[#2e5a44] hover:underline cursor-pointer">View Details</button>
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

      {/* Badge Detail & Download Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-[#112217]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2eae4] rounded-[32px] shadow-2xl w-full max-w-md p-8 space-y-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedBadge(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-[#112217] p-1.5 rounded-xl transition cursor-pointer bg-[#f4f7f4]"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-4 pt-2">
              <div className="w-28 h-28 mx-auto rounded-3xl bg-[#d3efdc]/40 border border-[#bce8c9] flex items-center justify-center p-4 shadow-inner">
                <img 
                  src={selectedBadge.badge_image_url || '/default-badge.png'} 
                  alt={selectedBadge.badge_title} 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44] bg-[#d3efdc]/60 px-3 py-1 rounded-full">
                  Verified Certificate Credential
                </span>
                <h3 className="text-base font-black text-[#112217]">{selectedBadge.badge_title}</h3>
                <p className="text-xs text-[#4a6b5d]">
                  Officially issued on {new Date(selectedBadge.issued_at).toLocaleDateString()} for mastering all knowledge graph milestones.
                </p>
              </div>
            </div>

            {selectedBadge.course_id && (
              <button 
                onClick={() => handleDownloadCertificate(selectedBadge.course_id, selectedBadge.course_title || selectedBadge.badge_title)}
                className="w-full py-3 bg-[#2e5a44] hover:bg-[#223d2f] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Download size={14} /> Download Verified Certificate (.png)
              </button>
            )}

            {/*<div className="flex items-center gap-3 pt-1">
              <a 
                href={selectedBadge.badge_image_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-[#f4f7f4] hover:bg-[#e2eae4] text-[#112217] rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-[#e2eae4]"
              >
                <ExternalLink size={14} /> Open Full Size
              </a>

              <a 
                href={selectedBadge.badge_image_url || '#'} 
                download={`${selectedBadge.badge_title.replace(/\s+/g, '_')}_Badge.png`}
                className="flex-1 py-3 bg-[#112217] hover:bg-[#223d2f] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Download size={14} /> Download Badge
              </a>
            </div>*/}
          </div>
        </div>
      )}

    </div>
  );
}