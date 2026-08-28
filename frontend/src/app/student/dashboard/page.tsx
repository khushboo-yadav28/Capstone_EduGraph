'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  BookOpen, 
  GitBranch, 
  TrendingUp, 
  User, 
  HelpCircle, 
  Search, 
  MoreVertical, 
  ArrowRight,
  Bell,
  LogOut
} from 'lucide-react';
import { api } from '@/src/lib/api';

export default function StudentDashboard() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEnrollments() {
      try {
        const response = await api.get('/enrollments/me');
        setEnrollments(response.data || []);
      } catch (err) {
        // Fallback mock structure aligned with backend schema
        setEnrollments([
          {
            id: 1,
            course_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            progress_percentage: 65,
            course: { title: 'Introduction to System Design Graph' }
          },
          {
            id: 2,
            course_id: '7fb91e42-1234-5678-abcd-ef0123456789',
            progress_percentage: 40,
            course: { title: 'Advanced Data Structures' }
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchEnrollments();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    router.push('/login');
  };

  const getCourseTitle = (enrollment: any) => 
    enrollment.course?.title || enrollment.course_title || 'Untitled Course';

  const getCourseProgress = (enrollment: any) => 
    enrollment.progress_percentage ?? parseInt(enrollment.progress) ?? 0;

  const filteredCourses = enrollments.filter(c => 
    getCourseTitle(c).toLowerCase().includes(searchQuery.toLowerCase())
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
            <a href="/student/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
              <BookOpen size={16} className="text-slate-700" /> My Courses
            </a>
            <a href="/student/catalog" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <GitBranch size={16} /> Knowledge Graphs
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <TrendingUp size={16} /> Progress
            </a>
            <a href="/student/profile" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <User size={16} /> Profile & Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
              <HelpCircle size={16} /> Help
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
        
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">STUDENT DASHBOARD</h2>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
              <Bell size={15} />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/student/profile')}>
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  S
                </div>
                <span className="text-xs font-semibold text-slate-700">Student ▾</span>
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

        {/* Dashboard Body Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* SECTION 1: Your Knowledge Graphs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Knowledge Graphs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {filteredCourses.slice(0, 2).map((enrollment, idx) => (
                <div 
                  key={enrollment.id || idx}
                  onClick={() => router.push(`/student/course/${enrollment.course_id}`)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <p className="text-xs font-bold text-slate-800">{getCourseTitle(enrollment)}</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full" 
                      style={{ width: `${getCourseProgress(enrollment)}%` }}
                    ></div>
                  </div>
                </div>
              ))}

              <div 
                onClick={() => router.push('/student/catalog')}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer space-y-3 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-white"
              >
                <p className="text-xs font-bold text-slate-800">Explore New Knowledge Graphs</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: My Courses & Search */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">My Courses</h3>
                <p className="text-[11px] text-slate-400">View and manage your active knowledge graphs and study modules.</p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Explore Courses"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loading ? (
                  <p className="text-xs text-slate-400 col-span-2">Loading enrolled courses...</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 col-span-2">No courses found.</p>
                ) : (
                  filteredCourses.map((enrollment) => (
                    <div key={enrollment.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{getCourseTitle(enrollment)}</p>
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
                          Graph
                        </span>
                        <button 
                          onClick={() => router.push(`/student/course/${enrollment.course_id}`)}
                          className="text-xs font-semibold text-slate-900 flex items-center gap-1 hover:underline"
                        >
                          Open <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Live Preview Sidebar Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between text-center space-y-4">
                <div className="w-full flex justify-start">
                  <span className="text-[11px] font-semibold text-slate-500">Live Graph Preview</span>
                </div>

                <div className="w-full h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute w-6 h-6 rounded-full bg-emerald-400/80 top-6 left-8 shadow-sm"></div>
                  <div className="absolute w-6 h-6 rounded-full bg-blue-400/80 bottom-6 right-10 shadow-sm"></div>
                  <div className="absolute w-5 h-5 rounded-full bg-slate-300 top-12 right-16"></div>
                  <div className="absolute w-5 h-5 rounded-full bg-emerald-300 bottom-8 left-16"></div>
                  <svg className="absolute inset-0 w-full h-full stroke-slate-300 stroke-1 pointer-events-none">
                    <line x1="45" y1="35" x2="110" y2="70" />
                    <line x1="110" y1="70" x2="160" y2="40" />
                    <line x1="110" y1="70" x2="80" y2="105" />
                  </svg>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Overall Progress</span>
                    <span>
                      {enrollments.length > 0 ? `${getCourseProgress(enrollments[0])}%` : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${enrollments.length > 0 ? getCourseProgress(enrollments[0]) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { 
//   Network, 
//   BookOpen, 
//   GitBranch, 
//   TrendingUp, 
//   User, 
//   HelpCircle, 
//   Search, 
//   MoreVertical, 
//   ArrowRight,
//   Bell,
//   LogOut
// } from 'lucide-react';
// import { api } from '@/src/lib/api';

// export default function StudentDashboard() {
//   const router = useRouter();
//   const [enrollments, setEnrollments] = useState<any[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchEnrollments() {
//       try {
//         const response = await api.get('/enrollments/me');
//         setEnrollments(response.data || []);
//       } catch (err) {
//         // Fallback mock structure aligned with backend schema
//         setEnrollments([
//           {
//             id: 1,
//             course_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
//             progress_percentage: 65,
//             course: { title: 'Introduction to System Design Graph' }
//           },
//           {
//             id: 2,
//             course_id: '7fb91e42-1234-5678-abcd-ef0123456789',
//             progress_percentage: 40,
//             course: { title: 'Advanced Data Structures' }
//           }
//         ]);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchEnrollments();
//   }, []);

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     sessionStorage.clear();
//     router.push('/login');
//   };

//   // Safe accessor for title across mock and live schema
//   const getCourseTitle = (enrollment: any) => 
//     enrollment.course?.title || enrollment.course_title || 'Untitled Course';

//   const getCourseProgress = (enrollment: any) => 
//     enrollment.progress_percentage ?? parseInt(enrollment.progress) ?? 0;

//   const filteredCourses = enrollments.filter(c => 
//     getCourseTitle(c).toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   return (
//     <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden text-slate-800">
      
//       {/* Sidebar */}
//       <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between hidden md:flex">
//         <div className="space-y-8">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
//               <Network size={18} />
//             </div>
//             <h1 className="text-base font-bold tracking-tight text-slate-900">Edugraph</h1>
//           </div>

//           <nav className="space-y-1.5">
//             <a href="/student/dashboard" className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold">
//               <BookOpen size={16} className="text-slate-700" /> My Courses
//             </a>
//             <a href="/student/catalog" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
//               <GitBranch size={16} /> Knowledge Graphs
//             </a>
//             <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
//               <TrendingUp size={16} /> Progress
//             </a>
//             <a href="/student/profile" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
//               <User size={16} /> Profile & Settings
//             </a>
//             <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition">
//               <HelpCircle size={16} /> Help
//             </a>
//           </nav>
//         </div>

//         <button 
//           onClick={handleLogout}
//           className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition px-2 py-1.5 rounded-lg hover:bg-rose-50 w-fit"
//         >
//           <LogOut size={15} /> Logout
//         </button>
//       </aside>

//       {/* Main Container */}
//       <main className="flex-1 flex flex-col h-full overflow-hidden">
        
//         {/* Top Header Navbar */}
//         <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
//           <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">STUDENT DASHBOARD</h2>
//           <div className="flex items-center gap-4">
//             <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
//               <Bell size={15} />
//             </button>
//             <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
//               <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/student/profile')}>
//                 <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
//                   S
//                 </div>
//                 <span className="text-xs font-semibold text-slate-700">Student ▾</span>
//               </div>
              
//               <button 
//                 onClick={handleLogout}
//                 title="Logout"
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-semibold border border-rose-100"
//               >
//                 <LogOut size={14} />
//                 <span>Logout</span>
//               </button>
//             </div>
//           </div>
//         </header>

//         {/* Dashboard Body Scrollable Area */}
//         <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
//           {/* SECTION 1: Your Knowledge Graphs */}
//           <div className="space-y-3">
//             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Knowledge Graphs</h3>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
//               {filteredCourses.slice(0, 2).map((enrollment, idx) => (
//                 <div 
//                   key={enrollment.id || idx}
//                   onClick={() => router.push(`/student/course/${enrollment.course_id}`)}
//                   className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer space-y-3 flex flex-col justify-between"
//                 >
//                   <p className="text-xs font-bold text-slate-800">{getCourseTitle(enrollment)}</p>
//                   <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
//                     <div 
//                       className="bg-blue-600 h-full rounded-full" 
//                       style={{ width: `${getCourseProgress(enrollment)}%` }}
//                     ></div>
//                   </div>
//                 </div>
//               ))}

//               <div 
//                 onClick={() => router.push('/student/catalog')}
//                 className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer space-y-3 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-white"
//               >
//                 <p className="text-xs font-bold text-slate-800">Explore New Knowledge Graphs</p>
//                 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
//                   <div className="bg-purple-600 h-full rounded-full" style={{ width: '100%' }}></div>
//                 </div>
//               </div>

//             </div>
//           </div>

//           {/* SECTION 2: My Courses & Search */}
//           <div className="space-y-4">
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//               <div>
//                 <h3 className="text-sm font-bold text-slate-800">My Courses</h3>
//                 <p className="text-[11px] text-slate-400">View and manage your active knowledge graphs and study modules.</p>
//               </div>

//               <div className="relative w-full md:w-72">
//                 <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
//                 <input 
//                   type="text" 
//                   placeholder="Explore Courses"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
//               <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 {loading ? (
//                   <p className="text-xs text-slate-400 col-span-2">Loading enrolled courses...</p>
//                 ) : filteredCourses.length === 0 ? (
//                   <p className="text-xs text-slate-400 col-span-2">No courses found.</p>
//                 ) : (
//                   filteredCourses.map((enrollment) => (
//                     <div key={enrollment.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition">
//                       <div className="flex items-start justify-between">
//                         <p className="text-xs font-bold text-slate-800 leading-snug">{getCourseTitle(enrollment)}</p>
//                         <button className="text-slate-400 hover:text-slate-600">
//                           <MoreVertical size={16} />
//                         </button>
//                       </div>

//                       <div className="flex items-center justify-between pt-2">
//                         <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
//                           Graph
//                         </span>
//                         <button 
//                           onClick={() => router.push(`/student/course/${enrollment.course_id}`)}
//                           className="text-xs font-semibold text-slate-900 flex items-center gap-1 hover:underline"
//                         >
//                           Open <ArrowRight size={12} />
//                         </button>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>

//               {/* Live Preview Sidebar Card */}
//               <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between text-center space-y-4">
//                 <div className="w-full flex justify-start">
//                   <span className="text-[11px] font-semibold text-slate-500">Live Graph Preview</span>
//                 </div>

//                 <div className="w-full h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
//                   <div className="absolute w-6 h-6 rounded-full bg-emerald-400/80 top-6 left-8 shadow-sm"></div>
//                   <div className="absolute w-6 h-6 rounded-full bg-blue-400/80 bottom-6 right-10 shadow-sm"></div>
//                   <div className="absolute w-5 h-5 rounded-full bg-slate-300 top-12 right-16"></div>
//                   <div className="absolute w-5 h-5 rounded-full bg-emerald-300 bottom-8 left-16"></div>
//                   <svg className="absolute inset-0 w-full h-full stroke-slate-300 stroke-1 pointer-events-none">
//                     <line x1="45" y1="35" x2="110" y2="70" />
//                     <line x1="110" y1="70" x2="160" y2="40" />
//                     <line x1="110" y1="70" x2="80" y2="105" />
//                   </svg>
//                 </div>

//                 <div className="w-full space-y-2">
//                   <div className="flex justify-between text-xs font-bold text-slate-700">
//                     <span>Overall Progress</span>
//                     <span>
//                       {enrollments.length > 0 ? `${getCourseProgress(enrollments[0])}%` : '0%'}
//                     </span>
//                   </div>
//                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
//                     <div 
//                       className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
//                       style={{ width: `${enrollments.length > 0 ? getCourseProgress(enrollments[0]) : 0}%` }}
//                     ></div>
//                   </div>
//                 </div>
//               </div>

//             </div>
//           </div>

//         </div>
//       </main>
//     </div>
//   );
// }