'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, ArrowLeft, Loader2, Network, Search, Layers } from 'lucide-react';
import { api } from '@/src/lib/api';

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function InstructorCoursesPage() {
  const router = useRouter();

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);

  // Form State
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseDescription, setCourseDescription] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedCourse, setExtractedCourse] = useState<{ id: string; title: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await api.get('/courses/categories');
        const data = response.data || [];
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, []);

  // Search filter for category dropdown
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  const selectedCategoryName = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId)?.name || 'Select Category';
  }, [categories, selectedCategoryId]);

  // Handle PDF Ingestion + Course Shell Creation
  const handleDirectIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!selectedCategoryId) {
      setErrorMsg('Please select a course category before uploading.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setExtractedCourse(null);

    try {
      // Step A: Create draft course shell with selected category_id
      const createRes = await api.post('/courses/', {
        title: courseTitle || file.name.replace('.pdf', ''),
        description: courseDescription || 'Automated graph course from PDF.',
        category_id: selectedCategoryId,
      });

      const courseId = createRes.data.id;

      // Step B: Upload PDF to parse RAG graph onto this created course
      const formData = new FormData();
      formData.append('file', file);

      const ingestRes = await api.post(`/courses/${courseId}/ingest-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExtractedCourse({
        id: ingestRes.data.id || courseId,
        title: ingestRes.data.title || courseTitle,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to generate course graph.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden text-slate-800">
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <button 
            onClick={() => router.push('/instructor/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={16} /> Back to Instructor Dashboard
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Upload & Generate Knowledge Graph</h1>
            <p className="text-xs text-slate-500 mt-1">
              Select a category, upload a PDF document, and let Gemini construct your interactive course graph.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <form onSubmit={handleDirectIngest} className="space-y-5">
              
              {/* Category Searchable Dropdown */}
              <div className="relative space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Course Category <span className="text-rose-500">*</span>
                </label>
                
                <div 
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className="w-full flex items-center justify-between border rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-800 border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    <Layers size={15} className="text-emerald-600" />
                    {selectedCategoryName}
                  </span>
                  <span className="text-slate-400 text-[10px]">▼</span>
                </div>

                {/* Dropdown Menu Overlay */}
                {isCategoryOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full bg-transparent text-xs focus:outline-none"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setIsCategoryOpen(false);
                            }}
                            className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                              selectedCategoryId === cat.id
                                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {cat.name}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-400 text-center">No categories found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Title Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Course Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Distributed Systems"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* PDF File Picker */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Select Syllabus PDF</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition bg-slate-50/50">
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="text-slate-400" size={28} />
                    <span className="text-xs font-semibold text-slate-700">
                      {file ? file.name : "Click to select or drag and drop PDF"}
                    </span>
                  </label>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={!file || !selectedCategoryId || uploading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Ingesting Document & Building Graph...</span>
                  </>
                ) : (
                  <span>Publish & Ingest PDF Course</span>
                )}
              </button>
            </form>

            {extractedCourse && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold">Course & Graph Generated Successfully!</span>
                </div>
                <button
                  onClick={() => router.push(`/instructor/course/${extractedCourse.id}`)}
                  className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <Network size={14} /> Open Course Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}