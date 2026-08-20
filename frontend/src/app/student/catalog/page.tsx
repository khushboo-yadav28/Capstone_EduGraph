'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Compass, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../../../lib/api';

export default function StudentCatalogPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublishedCourses() {
      try {
        const response = await api.get('/courses/published');
        setCourses(response.data || []);
      } catch (err) {
        // Fallback mock data for presentation if backend data is empty
        setCourses([
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            title: 'Intro to System Design',
            description: 'Learn graph-based learning paths, distributed systems, and scalability fundamentals.'
          },
          {
            id: '7fb91e42-1234-5678-abcd-ef0123456789',
            title: 'Advanced Machine Learning & CNNs',
            description: 'Explore neural network architectures, computer vision, and sentiment analysis models.'
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchPublishedCourses();
  }, []);

  const handleEnrollAndLaunch = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      // Calls POST /enrollments/
      await api.post('/enrollments/', { course_id: courseId });
    } catch (err) {
      // Proceed even if already enrolled or mocking
    } finally {
      setTimeout(() => {
        router.push(`/student/course/${courseId}`);
      }, 400);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">EduGraph Student Portal</h1>
              <p className="text-xs text-slate-500">Discover published courses and launch adaptive knowledge graphs</p>
            </div>
          </div>
          <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold border border-emerald-200">
            Enrolled Student Session
          </div>
        </div>

        {/* Course Grid */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Available Published Courses</h2>
          
          {loading ? (
            <div className="text-xs text-slate-400 py-12 text-center">Loading course catalog from backend...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded">Active Knowledge Graph</span>
                      <BookOpen size={16} className="text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{course.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>
                  </div>

                  <button 
                    onClick={() => handleEnrollAndLaunch(course.id)}
                    disabled={enrollingId === course.id}
                    className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>{enrollingId === course.id ? 'Setting up Graph Workspace...' : 'Enroll & Explore Graph'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}