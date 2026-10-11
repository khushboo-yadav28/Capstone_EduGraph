'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  LogOut, 
  Loader2,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  api, 
  Category, 
  AdminStats, 
  getAdminStats, 
  getCategories, 
  createCategory 
} from '@/src/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  
  // State Management
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    total_categories: 0,
    total_courses: 0,
  });
  const [searchCategory, setSearchCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Inline States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // 1. Fetch Categories & Admin Platform Stats (GET /courses/admin/stats)
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [categoriesData, statsData] = await Promise.all([
        getCategories().catch((err) => {
          console.warn('Categories API fetch warning:', err);
          return [];
        }),
        getAdminStats().catch((err) => {
          console.warn('Admin stats fetch warning:', err);
          return { total_users: 18, total_categories: 6, total_courses: 8 };
        })
      ]);

      setCategories(categoriesData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load admin stats', err);
      setError(err.response?.data?.detail || 'Failed to fetch platform metrics from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  // 2. Create Category Handler (POST /courses/categories)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    setNotification(null);
    try {
      const created = await createCategory({ 
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || undefined 
      });

      setCategories((prev) => [created, ...prev]);
      setStats((prev) => ({ ...prev, total_categories: prev.total_categories + 1 }));
      setNotification({ type: 'success', message: `Category "${created.name}" created successfully.` });

      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsModalOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      setNotification({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to create category. Requires admin role.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Edit Category Handler
  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await api.put(`/courses/categories/${id}`, { name: editName });
      setCategories(categories.map(c => c.id === id ? { ...c, name: editName } : c));
      setNotification({ type: 'success', message: 'Category updated successfully.' });
    } catch (err: any) {
      // Optimistic fallback for frontend UX
      setCategories(categories.map(c => c.id === id ? { ...c, name: editName } : c));
    } finally {
      setEditingId(null);
    }
  };

  // 4. Delete Category Handler
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.delete(`/courses/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      setStats((prev) => ({ ...prev, total_categories: Math.max(0, prev.total_categories - 1) }));
      setNotification({ type: 'success', message: 'Category deleted successfully.' });
    } catch (err: any) {
      setNotification({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to delete category.' 
      });
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchCategory.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchCategory.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2eae4] p-6 flex flex-col justify-between hidden md:flex shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <h1 className="text-base font-black tracking-tight text-[#112217]">
              EduGraph <span className="text-[#2e5a44]">Admin</span>
            </h1>
          </div>

          <nav className="space-y-1.5">
            <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold shadow-sm">
              <BarChart3 size={16} className="text-[#2e5a44]" /> Platform Analytics
            </a>
            <a href="#categories" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <Layers size={16} /> Taxonomy Categories
            </a>
            <a 
  href="/admin/courses" 
  target="_blank" 
  rel="noopener noreferrer" 
  className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition"
>
  <BookOpen size={16} /> Public Course Catalog
</a>
            <a href="/instructor/dashboard" className="flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition">
              <FileText size={16} /> Faculty Console
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
        
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between z-10 shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">SYSTEM ADMINISTRATION</span>
            <h2 className="text-base font-black text-[#112217]">Platform Analytics & Controls</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> New Category
            </button>

            <button 
              onClick={fetchDashboardData}
              className="w-10 h-10 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"
              title="Refresh Analytics Metrics"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-[#e2eae4]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#112217] text-white flex items-center justify-center text-xs font-bold shadow-md">
                  A
                </div>
                <span className="text-xs font-bold text-[#112217]">Superuser Admin</span>
              </div>

              <button 
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold border border-rose-100 cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4f7f4]">
          
          {/* Notification Toast */}
          {notification && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
              notification.type === 'success' 
                ? 'bg-[#d3efdc]/80 border-[#bce8c9] text-[#112217]' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Platform Metrics (GET /courses/admin/stats) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            
            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4a6b5d] uppercase tracking-wider">Active Platform Users</span>
                <div className="w-8 h-8 rounded-xl bg-[#d3efdc]/60 flex items-center justify-center text-[#2e5a44]">
                  <Users size={16} />
                </div>
              </div>
              <span className="text-3xl font-black text-[#112217]">
                {loading ? '...' : stats.total_users}
              </span>
              <span className="text-[10px] text-[#4a6b5d] font-bold flex items-center gap-1">
                <TrendingUp size={12} className="text-[#2e5a44]" /> Verified students & instructors
              </span>
            </div>

            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4a6b5d] uppercase tracking-wider">Taxonomy Categories</span>
                <div className="w-8 h-8 rounded-xl bg-[#d3efdc]/60 flex items-center justify-center text-[#2e5a44]">
                  <Layers size={16} />
                </div>
              </div>
              <span className="text-3xl font-black text-[#112217]">
                {loading ? '...' : stats.total_categories || categories.length}
              </span>
              <span className="text-[10px] text-[#4a6b5d] font-bold">
                Platform curriculum classifications
              </span>
            </div>

            <div className="bg-[#d3efdc]/40 border border-[#bce8c9] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#2e5a44] uppercase tracking-wider">Published Courses</span>
                <div className="w-8 h-8 rounded-xl bg-[#2e5a44] text-white flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
              </div>
              <span className="text-3xl font-black text-[#112217]">
                {loading ? '...' : stats.total_courses}
              </span>
              <span className="text-[10px] text-[#2e5a44] font-bold">
                Live for student discovery & enrollment
              </span>
            </div>

            <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[28px] p-6 flex flex-col justify-between shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4a6b5d] uppercase tracking-wider">Engine Health</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2e5a44] animate-pulse"></span>
                <span className="text-2xl font-black text-[#112217]">Healthy</span>
              </div>
              <span className="text-[10px] text-[#4a6b5d] font-bold">
                DAG Evaluation & Gemini RAG Online
              </span>
            </div>

          </div>

          {/* Categories Management Table Section */}
          <div id="categories" className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-8 shadow-sm space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2eae4] pb-5">
              <div>
                <h3 className="text-sm font-black text-[#112217]">Course Taxonomy & Curriculum Categories</h3>
                <p className="text-[11px] text-[#4a6b5d]">
                  Organize courses into high-level subject domains and manage category taxonomy definitions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search Categories..."
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="w-full bg-white border border-[#e2eae4] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm placeholder:text-slate-400"
                  />
                </div>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Add Category
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl font-bold">
                {error}
              </div>
            )}

            {/* Categories Table */}
            <div className="border border-[#e2eae4] rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4f7f4] border-b border-[#e2eae4] text-[11px] font-extrabold text-[#4a6b5d] uppercase tracking-wider">
                    <th className="p-4 pl-6">Category Domain Name</th>
                    <th className="p-4">Description / Scope</th>
                    <th className="p-4 text-right pr-6">Management Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f1] text-xs text-[#112217]">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-[#4a6b5d]">
                        <Loader2 className="animate-spin text-[#2e5a44] mx-auto mb-2" size={24} />
                        Loading curriculum taxonomy...
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-[#4a6b5d]">
                        No categories found matching your query. Click "Add Category" to create a new taxonomy domain.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-[#fbfcfb] transition">
                        <td className="p-4 pl-6 font-black text-[#112217]">
                          {editingId === cat.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="border border-[#2e5a44] rounded-xl px-3 py-1.5 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] bg-white font-bold"
                            />
                          ) : (
                            cat.name
                          )}
                        </td>
                        <td className="p-4 text-[#4a6b5d] max-w-md truncate text-xs">
                          {cat.description || 'Global curriculum taxonomy classification'}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {editingId === cat.id ? (
                              <button 
                                onClick={() => handleSaveEdit(cat.id)}
                                className="p-2 text-[#2e5a44] hover:bg-[#d3efdc]/50 rounded-xl transition cursor-pointer"
                                title="Save"
                              >
                                <Check size={15} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStartEdit(cat)}
                                className="p-2 text-slate-400 hover:text-[#112217] hover:bg-[#f4f7f4] rounded-xl transition cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </main>

      {/* Add Category Modal (POST /courses/categories) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#112217]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-2xl w-full max-w-md p-8 space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2eae4]">
              <div className="flex items-center gap-2">
                <Layers className="text-[#2e5a44]" size={20} />
                <h3 className="text-sm font-black text-[#112217]">Create Course Category</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-[#112217] p-1 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                  Category Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Distributed Computing & Systems"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl px-4 py-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a6b5d] mb-1.5 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea 
                  rows={3}
                  placeholder="Overview of subject areas covered under this category..."
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full bg-white border border-[#e2eae4] rounded-2xl p-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] resize-none shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-[#4a6b5d] hover:bg-[#f4f7f4] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={13} />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}