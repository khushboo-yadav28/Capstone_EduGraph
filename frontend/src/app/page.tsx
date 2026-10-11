'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, Users, ArrowRight, PlayCircle } from 'lucide-react';

export default function EduBlinkHome() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCourses() {
      try {
        setCourses([
          { id: '5208c480-174a-4767-981e-35d8d38cb5ca', title: 'Advanced Data Science & Python', category: 'DATA SCIENCE', lessons: 12, students: 450 },
          { id: '4598b62a-000e-40b6-951c-1a377c667459', title: 'Data Warehousing & Dimensional Modeling', category: 'DATA ENGINEERING', lessons: 8, students: 320 },
          { id: '38ef3435-a4c8-485e-9199-13556f896be0', title: 'Introduction to Blockchain Technology', category: 'BLOCKCHAIN', lessons: 10, students: 610 }
        ]);
      } catch (err) {
        console.error("Error loading courses", err);
      }
    }
    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1e2923] selection:bg-[#2e5a44] selection:text-white">
      
      {/* 1. Navbar matching brand text with Dribbble theme styling */}
      <header className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#112217] text-white flex items-center justify-center font-bold text-base shadow-sm">E</div>
          <span className="text-lg font-black tracking-tight text-[#112217]">EduGraph LMS</span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/student/dashboard')} 
            className="text-xs font-bold text-[#112217] hover:opacity-75 transition"
          >
            Student Portal
          </button>
          <button 
            onClick={() => router.push('/instructor/dashboard')} 
            className="px-5 py-2.5 bg-[#112217] text-white rounded-full text-xs font-bold hover:bg-[#223d2f] transition shadow-md"
          >
            Instructor Hub
          </button>
        </div>
      </header>

      {/* 2. Hero Section with Dribbble Sage & Cream Theme & Layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-16">
        <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] shadow-sm relative overflow-hidden px-6 sm:px-16 pt-16 pb-16 text-center space-y-6">
          
          {/* Decorative Side Accents */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 sm:w-28 h-[85%] bg-[#d3efdc] rounded-r-[60px] pointer-events-none opacity-60"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 sm:w-28 h-[85%] bg-[#d3efdc] rounded-l-[60px] pointer-events-none opacity-60"></div>

          <div className="max-w-3xl mx-auto space-y-4 relative z-10">
            <span className="px-4 py-1.5 bg-[#d3efdc]/60 text-[#112217] border border-[#bce8c9] rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-block">
              DISTANT LEARNING & KNOWLEDGE GRAPHS
            </span>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#112217] leading-[1.15]">
              Distance Learning Built for the AI Era
            </h1>
            
            <p className="text-xs sm:text-sm text-[#4a6b5d] max-w-xl mx-auto leading-relaxed">
              Explore AI-extracted knowledge maps, interactive RAG study sidebars, and course materials designed to accelerate mastery.
            </p>
            
            {/* Search Bar Widget with Dribbble theme styling */}
            <div className="flex items-center bg-white rounded-full p-2 max-w-xl mx-auto shadow-lg border border-[#e2eae4] mt-6">
              <Search className="text-slate-400 ml-4" size={18} />
              <input 
                type="text" 
                placeholder="What do you want to learn today?" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#112217] outline-none bg-transparent placeholder:text-slate-400"
              />
              <button 
                onClick={() => {}}
                className="px-6 py-3 bg-[#112217] text-white rounded-full text-xs font-bold hover:bg-[#223d2f] transition shadow-md"
              >
                Search
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Featured Programs Section */}
      <section className="max-w-7xl mx-auto px-8 py-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44]">FEATURED PROGRAMS</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#112217]">Explore Popular Distant Learning Courses</h2>
          </div>
          <button 
            onClick={() => router.push('/student/dashboard')} 
            className="text-xs font-bold text-[#2e5a44] hover:underline flex items-center gap-1"
          >
            View All Dashboard Courses →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-3xl border border-[#e2eae4] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2e5a44] bg-[#d3efdc]/50 px-3 py-1 rounded-xl inline-block">{course.category}</span>
                <h3 className="text-xs font-bold text-[#112217] leading-snug">{course.title}</h3>
                <div className="flex items-center gap-6 text-xs text-[#4a6b5d] pt-4 border-t border-[#f0f4f1]">
                  <span className="flex items-center gap-1.5"><BookOpen size={13} className="text-slate-400" /> {course.lessons} Modules</span>
                  <span className="flex items-center gap-1.5"><Users size={13} className="text-slate-400" /> {course.students} Students</span>
                </div>
              </div>
              <button 
                onClick={() => router.push(`/student/course/${course.id}`)}
                className="w-full py-3 bg-[#f4f7f4] text-[#112217] rounded-2xl text-xs font-semibold hover:bg-[#d3efdc] transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PlayCircle size={14} /> Start Learning
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}