'use client';

import React from 'react';
import { Users, Layers, ShieldCheck, Database, Activity } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-6 flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-800">EduGraph</span>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold">Admin</span>
          </div>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold">
              <Users size={16} /> User Management
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium">
              <Layers size={16} /> Manage Categories
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium">
              <Database size={16} /> Seed Data
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium">
              <Activity size={16} /> System Logs
            </a>
          </nav>
        </div>
        <div className="text-xs text-slate-400">Platform Control v1.0</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b bg-white px-8 flex items-center justify-between shadow-sm">
          <h1 className="text-sm font-bold text-slate-800">System Administration Console</h1>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">System Superuser</span>
        </header>

        <div className="p-8 space-y-6 max-w-6xl w-full">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-5 bg-white border rounded-xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Total Active Users</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">1,830</h3>
            </div>
            <div className="p-5 bg-white border rounded-xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Total Categories</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">336</h3>
            </div>
            <div className="p-5 bg-white border rounded-xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Published Courses</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">40</h3>
            </div>
            <div className="p-5 bg-white border rounded-xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Pending Approvals</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 text-emerald-600">0</h3>
            </div>
          </div>

          {/* Category Management Table */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Global Course Categories</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Associated Courses</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  <tr>
                    <td className="p-3 font-medium">Computer Science</td>
                    <td className="p-3">18 Courses</td>
                    <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">Active</span></td>
                    <td className="p-3 text-right text-slate-400">...</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Data Science & AI</td>
                    <td className="p-3">14 Courses</td>
                    <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">Active</span></td>
                    <td className="p-3 text-right text-slate-400">...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}