'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {full_name: name, email:email, password:password, role: role.toUpperCase() });
      router.push('/login');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        setError(messages);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1e2923] flex flex-col justify-between selection:bg-[#2e5a44] selection:text-white relative overflow-hidden">
      
      {/* Decorative Sage Background Accents */}
      <div className="absolute -left-20 -top-20 w-72 h-72 bg-[#d3efdc]/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-[#d3efdc]/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto px-8 h-20 flex items-center justify-between relative z-10">
        <div 
          onClick={() => router.push('/')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#112217] text-white flex items-center justify-center font-bold text-base shadow-sm">E</div>
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
      <main className="max-w-md w-full mx-auto px-4 py-6 relative z-10">
        <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-xl p-8 sm:p-10 space-y-6 relative backdrop-blur-sm">
          
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#d3efdc] text-[#112217] flex items-center justify-center font-bold shadow-inner">
              <Network size={22} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-[#112217]">Create an Edugraph Account</h1>
            <p className="text-xs text-[#4a6b5d]">Join the knowledge graph learning ecosystem</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#f0f4f1] p-1.5 rounded-2xl text-xs font-semibold border border-[#e2eae4]">
            {(['student', 'instructor'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2.5 rounded-xl capitalize transition ${
                  role === r ? 'bg-white text-[#112217] shadow-sm font-bold border border-[#e2eae4]' : 'text-[#4a6b5d] hover:text-[#112217]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                <input 
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                <input 
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4a6b5d] mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3 text-[#4a6b5d]" size={16} />
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-11 pr-3 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#112217] text-white rounded-2xl py-3.5 text-xs font-bold hover:bg-[#223d2f] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Creating Account...' : `Register as ${role}`}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="flex items-center justify-between text-xs pt-4 border-t border-[#e2eae4]">
            <span className="text-[#4a6b5d]">Already have an account?</span>
            <a href="/login" className="font-bold text-[#112217] hover:underline">Sign In</a>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto px-8 h-16 flex items-center justify-center text-[11px] text-[#4a6b5d] relative z-10">
        EduGraph LMS • Secure Registration Portal
      </footer>

    </div>
  );
}