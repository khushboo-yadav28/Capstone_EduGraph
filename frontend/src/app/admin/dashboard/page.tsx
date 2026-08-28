'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { api } from '../../../lib/api';

interface Category {
  id: string;
  name: string;
  description?: string;
  courses_count?: number;
}

interface AdminStats {
  total_users: number;
  total_categories: number;
  total_courses: number;
}

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

  // Edit Inline States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Helper to get authorization headers dynamically from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // 1. Fetch Categories & Admin Stats from Backend API
  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const authConfig = getAuthHeaders();
      const [categoriesRes, statsRes] = await Promise.all([
        api.get('/courses/categories', authConfig),
        api.get('/courses/admin/stats', authConfig)
      ]);

      setCategories(categoriesRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch dynamic data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  // 2. Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const authConfig = getAuthHeaders();
      const response = await api.post(
        '/courses/categories', 
        { 
          name: newCategoryName,
          description: newCategoryDesc 
        },
        authConfig
      );

      // Re-fetch to ensure sync with backend DB ID and fields
      await fetchDashboardData();

      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create category.');
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
      const authConfig = getAuthHeaders();
      await api.put(`/courses/categories/${id}`, { name: editName }, authConfig);
      setCategories(categories.map(c => c.id === id ? { ...c, name: editName } : c));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update category.');
    } finally {
      setEditingId(null);
    }
  };

  // 4. Delete Category Handler
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const authConfig = getAuthHeaders();
      await api.delete(`/courses/categories/${id}`, authConfig);
      setCategories(categories.filter(c => c.id !== id));
      setStats((prev) => ({ ...prev, total_categories: Math.max(0, prev.total_categories - 1) }));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete category.');
    }
  };

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
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <Users size={16} /> User Management
            </a>
            <a href="/admin/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
              <Layers size={16} className="text-slate-700" /> Manage Categories
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">ADMIN CONSOLE</h2>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
              <Bell size={15} />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <span className="text-xs font-semibold text-slate-700">Admin</span>
              </div>

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
              <span className="text-[11px] font-semibold text-slate-400">Total Categories</span>
              <span className="text-2xl font-extrabold text-slate-900">{loading ? '...' : categories.length}</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Active System Users</span>
              <span className="text-2xl font-extrabold text-slate-900">{loading ? '...' : stats.total_users}</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-600">Published Courses</span>
              <span className="text-2xl font-extrabold text-slate-900">{loading ? '...' : stats.total_courses}</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-semibold text-rose-500">System Errors</span>
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
                  placeholder="Search Categories..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
                >
                  <Plus size={14} /> Add Category
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Categories Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3.5 pl-4">Category Name</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400">
                        <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                        Loading category repository...
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400">
                        No categories found. Click "Add Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3.5 pl-4 font-semibold text-slate-900">
                          {editingId === cat.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          ) : (
                            cat.name
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 max-w-xs truncate">
                          {cat.description || 'Global taxonomy classification'}
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            {editingId === cat.id ? (
                              <button 
                                onClick={() => handleSaveEdit(cat.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Save"
                              >
                                <Check size={15} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStartEdit(cat)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete"
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

      {/* Add Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create New Course Category</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Brief summary of topics covered under this category..."
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={12} />}
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