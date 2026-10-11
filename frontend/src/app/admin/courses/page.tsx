'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft } from 'lucide-react';

export default function AdminCoursesPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <button 
          onClick={() => router.push('/admin/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-[#4a6b5d] hover:text-[#112217] transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Admin Dashboard
        </button>

        <div className="bg-white border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-[#112217]">Admin Course Management</h1>
              <p className="text-xs text-[#4a6b5d]">Review and manage published platform courses and curriculum mapping.</p>
            </div>
          </div>
          <div className="p-8 text-center text-xs text-[#4a6b5d] border border-dashed border-[#e2eae4] rounded-2xl">
            Course management controls are loading from backend published endpoints...
          </div>
        </div>
      </div>
    </div>
  );
}