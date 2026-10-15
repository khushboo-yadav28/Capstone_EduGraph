'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Network, BookOpen, GitBranch, TrendingUp, User, HelpCircle, Award, Download, LogOut, ArrowRight } from 'lucide-react';
import { api } from '@/src/lib/api';

export default function StudentBadgesPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const response = await api.get('/enrollments/badges/me');
        setBadges(response.data || []);
      } catch (err) {
        console.error('Failed to fetch badges', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, []);

  const handleDownloadCertificate = async (courseId: string, courseTitle: string) => {
    try {
      const response = await api.get(`/enrollments/${courseId}/certificate/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Edugraph_Certificate_${courseTitle.replace(/\s+/g, '_')}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Certificate is only available for fully completed courses (100%).');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    router.push('/login');
  };

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
            <a href="/student/dashboard" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <BookOpen size={16} /> My Courses
            </a>
            <a href="/student/catalog" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <GitBranch size={16} /> Knowledge Graphs
            </a>
            <a href="/student/badges" className="flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold shadow-sm">
              <Award size={16} className="text-[#2e5a44]" /> Badges & Certificates
            </a>
            <a href="/student/profile" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <User size={16} /> Profile & Settings
            </a>
          </nav>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition px-3 py-2 rounded-xl hover:bg-rose-50 w-fit">
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between z-10 shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">ACHIEVEMENTS</span>
            <h2 className="text-base font-black text-[#112217]">Badges & Certificates</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">
          <div className="bg-white rounded-[28px] p-8 border border-[#e2eae4] shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-[#112217]">Your Earned Credentials</h3>
              <p className="text-xs text-[#4a6b5d]">Review your verified course completion badges and download official certificates.</p>
            </div>

            {loading ? (
              <p className="text-xs text-[#4a6b5d] py-12 text-center animate-pulse">Loading badges...</p>
            ) : badges.length === 0 ? (
              <div className="text-center py-16 space-y-3 border border-dashed border-[#e2eae4] rounded-2xl bg-[#fbfcfb]">
                <Award size={40} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-[#112217]">No badges earned yet</p>
                <p className="text-[11px] text-[#4a6b5d] max-w-sm mx-auto">Complete all nodes (100% progress) in any enrolled course to unlock your official badge and verified certificate.</p>
                <button onClick={() => router.push('/student/dashboard')} className="mt-2 px-4 py-2 bg-[#112217] text-white text-xs font-bold rounded-xl shadow">
                  Go to My Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {badges.map((badge) => (
                  <div key={badge.id} className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[24px] p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#2e5a44] transition">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#d3efdc] text-[#2e5a44] flex items-center justify-center shrink-0 font-bold shadow-inner">
                        <Award size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-[#112217] leading-snug">{badge.badge_title}</h4>
                        <p className="text-[10px] text-[#4a6b5d]">Issued: {new Date(badge.issued_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDownloadCertificate(badge.course_id, badge.badge_title)}
                      className="w-full py-2.5 bg-[#112217] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#223d2f] transition shadow"
                    >
                      <Download size={14} /> Download Certificate (.png)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}