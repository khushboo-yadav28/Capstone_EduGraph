'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  BookOpen, 
  Award, 
  Hash, 
  Calendar,
  Sparkles,
  FileText
} from 'lucide-react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();

  // Core Authentication State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');

  // Student Profile Extension State
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [batch, setBatch] = useState('');

  // Instructor Profile Extension State
  const [designation, setDesignation] = useState('');
  const [instructorDepartment, setInstructorDepartment] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');

  // Status State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Assemble unified payload based on selected role
    const payload: Record<string, any> = {
      full_name: name.trim(),
      email: email.trim(),
      password: password,
      role: role.toUpperCase()
    };

    if (role === 'student') {
      if (program.trim()) payload.program = program.trim();
      if (semester.trim()) payload.semester = semester.trim();
      if (enrollmentNumber.trim()) payload.enrollment_number = enrollmentNumber.trim();
      if (studentDepartment.trim()) payload.department = studentDepartment.trim();
      if (batch.trim()) payload.batch = batch.trim();
    } else {
      if (designation.trim()) payload.designation = designation.trim();
      if (instructorDepartment.trim()) payload.department = instructorDepartment.trim();
      if (qualifications.trim()) payload.qualifications = qualifications.trim();
      if (expertise.trim()) payload.expertise = expertise.trim();
      if (bio.trim()) payload.bio = bio.trim();
    }

    try {
      await api.post('/auth/register', payload);
      router.push('/login');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        setError(messages);
      } else {
        setError('Registration failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1e2923] flex flex-col justify-between selection:bg-[#2e5a44] selection:text-white relative overflow-hidden">
      
      {/* Decorative Sage Background Accents */}
      <div className="absolute -left-20 -top-20 w-80 h-80 bg-[#d3efdc]/60 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#d3efdc]/60 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto px-8 h-20 flex items-center justify-between relative z-10">
        <div 
          onClick={() => router.push('/')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#112217] text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Network size={18} />
          </div>
          <span className="text-lg font-black tracking-tight text-[#112217]">EduGraph LMS</span>
        </div>
        <button 
          onClick={() => router.push('/login')}
          className="text-xs font-bold text-[#4a6b5d] hover:text-[#112217] transition"
        >
          Already have an account? Sign In
        </button>
      </header>

      {/* Main Register Card Container */}
      <main className="max-w-xl w-full mx-auto px-4 py-8 relative z-10">
        <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-xl p-8 sm:p-10 space-y-6 relative backdrop-blur-sm">
          
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#d3efdc] text-[#112217] flex items-center justify-center font-bold shadow-inner">
              <Sparkles size={22} className="text-[#2e5a44]" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-[#112217]">Create an Edugraph Account</h1>
            <p className="text-xs text-[#4a6b5d]">Join the AI-driven knowledge graph learning platform</p>
          </div>

          {/* Interactive Role Selector Toggle */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-[#4a6b5d] uppercase tracking-wider text-center">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#f0f4f1] p-1.5 rounded-2xl text-xs font-semibold border border-[#e2eae4]">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  role === 'student' 
                    ? 'bg-white text-[#112217] shadow-sm font-bold border border-[#e2eae4]' 
                    : 'text-[#4a6b5d] hover:text-[#112217]'
                }`}
              >
                <GraduationCap size={16} className={role === 'student' ? 'text-[#2e5a44]' : ''} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('instructor')}
                className={`py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  role === 'instructor' 
                    ? 'bg-white text-[#112217] shadow-sm font-bold border border-[#e2eae4]' 
                    : 'text-[#4a6b5d] hover:text-[#112217]'
                }`}
              >
                <Briefcase size={16} className={role === 'instructor' ? 'text-[#2e5a44]' : ''} />
                <span>Instructor</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Section 1: Core Credentials */}
            <div className="space-y-4">
              <div className="border-b border-[#e2eae4] pb-1">
                <span className="text-[10px] font-extrabold text-[#2e5a44] uppercase tracking-widest">
                  1. Account Credentials
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                  <input 
                    type="text"
                    required
                    placeholder={role === 'student' ? 'Alex Mercer' : 'Dr. Sarah Connor'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                    <input 
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                    <input 
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Dynamic Role-Specific Profile Extension */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-[#e2eae4] pb-1 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#2e5a44] uppercase tracking-widest">
                  2. {role === 'student' ? 'Student Academic Profile' : 'Instructor Faculty Profile'}
                </span>
                <span className="text-[10px] text-[#4a6b5d] italic">Profile Extension</span>
              </div>

              {role === 'student' ? (
                /* STUDENT SPECIFIC FIELDS */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Academic Program / Degree</label>
                      <div className="relative">
                        <BookOpen className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. M.Sc. IT or B.Tech CS"
                          value={program}
                          onChange={(e) => setProgram(e.target.value)}
                          className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Current Semester / Year</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. Semester 9 or 3rd Year"
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Enrollment / Roll Number</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. STU-2026-042"
                          value={enrollmentNumber}
                          onChange={(e) => setEnrollmentNumber(e.target.value)}
                          className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Academic Department</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. Computer Science & Eng."
                          value={studentDepartment}
                          onChange={(e) => setStudentDepartment(e.target.value)}
                          className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Batch / Cohort Year</label>
                    <input 
                      type="text"
                      placeholder="e.g. 2024-2028"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ) : (
                /* INSTRUCTOR SPECIFIC FIELDS */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Designation / Academic Title</label>
                      <div className="relative">
                        <Award className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. Associate Professor"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Faculty / Department</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. Department of AI"
                          value={instructorDepartment}
                          onChange={(e) => setInstructorDepartment(e.target.value)}
                          className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Highest Qualification</label>
                      <input 
                        type="text"
                        placeholder="e.g. Ph.D. in Computer Science"
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                        className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Areas of Expertise</label>
                      <input 
                        type="text"
                        placeholder="e.g. Knowledge Graphs, NLP, AI"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Short Professional Bio</label>
                    <textarea 
                      rows={2}
                      placeholder="Brief research background and teaching interests..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-2 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#112217] text-white rounded-2xl py-3.5 text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span>{loading ? 'Creating Account & Profile...' : `Register as ${role === 'student' ? 'Student' : 'Instructor'}`}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="flex items-center justify-between text-xs pt-4 border-t border-[#e2eae4]">
            <span className="text-[#4a6b5d]">Already registered with Edugraph?</span>
            <a href="/login" className="font-bold text-[#112217] hover:underline">Sign In</a>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto px-8 h-16 flex items-center justify-center text-[11px] text-[#4a6b5d] relative z-10">
        EduGraph LMS • Unified Role-Based Registration & Profile System
      </footer>

    </div>
  );
}
