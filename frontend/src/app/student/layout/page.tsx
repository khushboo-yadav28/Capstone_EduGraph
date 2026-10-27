'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap,
  Loader2
} from 'lucide-react';
import { api } from '@/src/lib/api';

export default function StudentProfilePage() {
  const router = useRouter();

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
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
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
  );
}