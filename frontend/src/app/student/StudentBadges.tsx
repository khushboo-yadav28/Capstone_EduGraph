'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import { Award, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface Badge {
  id: string;
  enrollment_id: number;
  badge_title: string;
  badge_image_url: string;
  issued_at: string;
}

export default function StudentBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        // GET /enrollments/badges/me
        const response = await api.get('/enrollments/badges/me');
        setBadges(response.data);
      } catch (err: any) {
        console.error('Failed to fetch earned badges:', err);
        setError(err.response?.data?.detail || 'Failed to retrieve your earned course completion badges.');
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-[#4a6b5d]">
        <Loader2 className="animate-spin text-[#2e5a44] mx-auto mb-2" size={24} />
        Loading your earned badges & achievements...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-[#e2eae4] pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">STUDENT ACHIEVEMENTS</span>
          <h3 className="text-sm font-black text-[#112217]">My Earned Course Completion Badges</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
          <Award size={20} />
        </div>
      </div>

      {badges.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#4a6b5d] border border-dashed border-[#e2eae4] rounded-2xl space-y-2">
          <Sparkles className="mx-auto text-[#2e5a44]" size={24} />
          <p>You haven't earned any badges yet. Complete courses and master all nodes to earn certificates and badges!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {badges.map((badge) => (
            <div key={badge.id} className="bg-white border border-[#e2eae4] rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 hover:shadow-md transition">
              <div className="w-20 h-20 rounded-2xl bg-[#d3efdc]/40 border border-[#bce8c9] flex items-center justify-center p-3">
                <img 
                  src={badge.badge_image_url || '/default-badge.png'} 
                  alt={badge.badge_title} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback icon if image URL fails to load
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-[#112217]">{badge.badge_title}</h4>
                <p className="text-[10px] text-[#4a6b5d]">
                  Issued on: {new Date(badge.issued_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[10px] font-extrabold px-3 py-1 bg-[#d3efdc]/60 text-[#2e5a44] rounded-full">
                Verified Credential
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}