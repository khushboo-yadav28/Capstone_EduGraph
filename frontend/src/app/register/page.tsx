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
    // } catch (err: any) {
    //   setError(err?.response?.data?.detail || 'Registration failed. Please try again.');
    // } 
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        // Extracts FastAPI/Pydantic validation messages and joins them
        const messages = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        setError(messages);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc] p-6 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 space-y-6">
        
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
            <Network size={22} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Create an Edugraph Account</h1>
          <p className="text-xs text-slate-500">Join the knowledge graph learning ecosystem</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {(['student', 'instructor'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 rounded-lg capitalize transition ${
                role === r ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input 
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input 
                type="email"
                required
                placeholder="user@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-xl py-3 text-xs font-semibold hover:bg-slate-800 transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Creating Account...' : `Register as ${role}`}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-400">Already have an account?</span>
          <a href="/login" className="font-semibold text-slate-900 hover:underline">Sign In</a>
        </div>
      </div>
    </div>
  );
}