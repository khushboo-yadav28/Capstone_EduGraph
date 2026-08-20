'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  Users, 
  Layers, 
  BookOpen, 
  FileText, 
  Activity, 
  Bell, 
  Search, 
  Filter, 
  MoreHorizontal,
  LogOut
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [searchCategory, setSearchCategory] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  const categories = [
    { name: 'Computer Science', courses: 14, status: 'Active' },
    { name: 'Data Science', courses: 9, status: 'Active' },
    { name: 'Programming', courses: 22, status: 'Active' }
  ];

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchCategory.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between hidden md:flex">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Network size={18} />
            </div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">Edugraph</h1>
          </div>

          <nav className="space-y-1.5">
            <a href="/admin/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
              <Users size={16} className="text-slate-700" /> User Management
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <Layers size={16} /> Manage Categories
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <BookOpen size={16} /> Seed Data
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <FileText size={16} /> System Logs
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <Activity size={16} /> Analytics
            </a>
          </nav>
        </div>

        {/* Sidebar Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition px-2 py-1.5 rounded-lg hover:bg-rose-50 w-fit"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">ADMIN DASHBOARD</h2>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
              <Bell size={15} />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <span className="text-xs font-semibold text-slate-700">Admin ▾</span>
              </div>

              {/* Header Logout Button */}
              <button 
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-semibold border border-rose-100"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Active Users</span>
              <span className="text-2xl font-extrabold text-slate-900">1,832</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Categories</span>
              <span className="text-2xl font-extrabold text-slate-900">336</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-600">Published Courses</span>
              <span className="text-2xl font-extrabold text-slate-900">40</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-rose-500">Pending Approvals</span>
              <span className="text-2xl font-extrabold text-slate-900">0</span>
            </div>
          </div>

          {/* Table Control & Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Category List"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm">
                  <span>All Filters</span>
                </button>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm">
                  <Filter size={14} /> Filter
                </button>
              </div>
            </div>

            {/* Categories Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3.5 pl-4">Category List ↕</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredCategories.map((cat, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="p-3.5 pl-4 font-medium text-slate-900">{cat.name}</td>
                      <td className="p-3.5 text-right pr-4">
                        <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}