'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, Award, RotateCcw, BookOpen } from 'lucide-react';
import { api } from '@/src/lib/api';

interface QuestionFeedback {
  quiz_id: string;
  question_text: string;
  selected_option_index: number;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
}

interface EvaluationResponse {
  attempt_id: string;
  score_percentage: number;
  total_questions: number;
  correct_answers_count: number;
  is_passed: boolean;
  unlocked_next_node_keys: string[];
  feedback: QuestionFeedback[];
}

export default function QuizAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const nodeId = params?.courseId as string;

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);

  useEffect(() => {
    async function loadQuizQuestions() {
      if (!nodeId) return;
      try {
        setLoading(true);
        const res = await api.get(`/quizzes/node/${nodeId}/questions?count=1`);
        setQuestions(res.data || []);
      } catch (err) {
        console.error('Failed to load quizzes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadQuizQuestions();
  }, [nodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOption === null || questions.length === 0) return;

    setSubmitting(true);
    try {
      const payload = {
        answers: [
          {
            quiz_id: questions[0].id,
            selected_option_index: selectedOption,
          },
        ],
      };

      const res = await api.post(`/quizzes/node/${nodeId}/submit`, payload);
      setEvaluation(res.data);
    } catch (err) {
      console.error('Error submitting quiz:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-xs text-slate-500 font-medium">Loading node assessment...</p>
      </div>
    );
  }

  const currentQuestion = questions[0];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <HelpCircle size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Concept Mastery Check</h1>
              <p className="text-[10px] text-slate-500">Evaluates node understanding from your RAG knowledge path</p>
            </div>
          </div>
          <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
            Interactive Assessment
          </span>
        </div>

        {!evaluation ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Node Knowledge Check
              </span>
              <h2 className="text-sm font-semibold text-slate-800 leading-relaxed">
                {currentQuestion?.question_text || 'No question available.'}
              </h2>
            </div>

            <div className="space-y-2.5">
              {currentQuestion?.options?.map((option: string, idx: number) => (
                <label 
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    selectedOption === idx 
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-medium' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="quiz-option" 
                    checked={selectedOption === idx}
                    onChange={() => setSelectedOption(idx)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            <button 
              type="submit"
              disabled={selectedOption === null || submitting}
              className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Evaluating...' : 'Submit Answer'}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            
            {/* Score Banner */}
            <div className="text-center space-y-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                evaluation.is_passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {evaluation.is_passed ? <Award size={28} /> : <XCircle size={28} />}
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {evaluation.is_passed ? 'Concept Mastered! 🚀' : 'Review Recommended'}
              </h3>
              <p className="text-xs text-slate-500">
                Score: <span className="font-bold">{evaluation.score_percentage}%</span> ({evaluation.correct_answers_count} of {evaluation.total_questions} correct)
              </p>
            </div>

            {/* Explanation & Feedback Card */}
            {evaluation.feedback?.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border space-y-2 text-xs ${
                  item.is_correct ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  {item.is_correct ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-rose-600 flex-shrink-0" />
                  )}
                  <span>{item.is_correct ? 'Correct Answer' : 'Incorrect Choice'}</span>
                </div>

                <div className="pt-1 text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-900">
                    <BookOpen size={13} className="text-blue-600" />
                    <span>Explanation & RAG Insights:</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-slate-600 pl-4 border-l-2 border-slate-300">
                    {item.explanation || 'No explanation provided for this question.'}
                  </p>
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setEvaluation(null); setSelectedOption(null); }}
                className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-xs font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Retake Quiz</span>
              </button>
              <button 
                onClick={() => router.push('/student/dashboard')}
                className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Back to Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import { CheckCircle2, XCircle, ArrowRight, HelpCircle, Award, RotateCcw, BookOpen } from 'lucide-react';
// import { api } from '@/src/lib/api';

// interface QuestionFeedback {
//   quiz_id: string;
//   question_text: string;
//   selected_option_index: number;
//   correct_option_index: number;
//   is_correct: boolean;
//   explanation: string;
// }

// interface EvaluationResponse {
//   attempt_id: string;
//   score_percentage: number;
//   total_questions: number;
//   correct_answers_count: number;
//   is_passed: boolean;
//   unlocked_next_node_keys: string[];
//   feedback: QuestionFeedback[];
// }

// export default function QuizAssessmentPage() {
//   const router = useRouter();
//   const params = useParams();
//   const nodeId = params?.courseId as string; // Using node ID from URL route

//   const [questions, setQuestions] = useState<any[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [selectedOption, setSelectedOption] = useState<number | null>(null);
//   const [submitting, setSubmitting] = useState<boolean>(false);
//   const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);

//   // Load active quiz questions for this node
//   useEffect(() => {
//     async function loadQuizQuestions() {
//       if (!nodeId) return;
//       try {
//         setLoading(true);
//         const res = await api.get(`/quizzes/node/${nodeId}/questions?count=1`);
//         setQuestions(res.data || []);
//       } catch (err) {
//         console.error('Failed to load quizzes:', err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     loadQuizQuestions();
//   }, [nodeId]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (selectedOption === null || questions.length === 0) return;

//     setSubmitting(true);
//     try {
//       const payload = {
//         answers: [
//           {
//             quiz_id: questions[0].id,
//             selected_option_index: selectedOption,
//           },
//         ],
//       };

//       const res = await api.post(`/quizzes/node/${nodeId}/submit`, payload);
//       setEvaluation(res.data);
//     } catch (err) {
//       console.error('Error submitting quiz:', err);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
//         <p className="text-xs text-slate-500 font-medium">Loading node assessment...</p>
//       </div>
//     );
//   }

//   const currentQuestion = questions[0];

//   return (
//     <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
//       <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        
//         {/* Header */}
//         <div className="flex items-center justify-between border-b pb-4">
//           <div className="flex items-center gap-2">
//             <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
//               <HelpCircle size={18} />
//             </div>
//             <div>
//               <h1 className="text-sm font-bold text-slate-800">Concept Mastery Check</h1>
//               <p className="text-[10px] text-slate-500">Evaluates node understanding from your RAG knowledge path</p>
//             </div>
//           </div>
//           <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
//             Interactive Assessment
//           </span>
//         </div>

//         {!evaluation ? (
//           <form onSubmit={handleSubmit} className="space-y-6">
//             <div className="space-y-2">
//               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
//                 Node Knowledge Check
//               </span>
//               <h2 className="text-sm font-semibold text-slate-800 leading-relaxed">
//                 {currentQuestion?.question_text || 'No question available.'}
//               </h2>
//             </div>

//             <div className="space-y-2.5">
//               {currentQuestion?.options?.map((option: string, idx: number) => (
//                 <label 
//                   key={idx}
//                   className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
//                     selectedOption === idx 
//                       ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-medium' 
//                       : 'border-slate-200 hover:bg-slate-50 text-slate-700'
//                   }`}
//                 >
//                   <input 
//                     type="radio" 
//                     name="quiz-option" 
//                     checked={selectedOption === idx}
//                     onChange={() => setSelectedOption(idx)}
//                     className="text-emerald-600 focus:ring-emerald-500"
//                   />
//                   <span>{option}</span>
//                 </label>
//               ))}
//             </div>

//             <button 
//               type="submit"
//               disabled={selectedOption === null || submitting}
//               className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
//             >
//               <span>{submitting ? 'Evaluating...' : 'Submit Answer'}</span>
//               <ArrowRight size={14} />
//             </button>
//           </form>
//         ) : (
//           <div className="space-y-6">
            
//             {/* Score Banner */}
//             <div className="text-center space-y-2">
//               <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
//                 evaluation.is_passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
//               }`}>
//                 {evaluation.is_passed ? <Award size={28} /> : <XCircle size={28} />}
//               </div>
//               <h3 className="text-base font-bold text-slate-800">
//                 {evaluation.is_passed ? 'Concept Mastered! 🚀' : 'Review Recommended'}
//               </h3>
//               <p className="text-xs text-slate-500">
//                 Score: <span className="font-bold">{evaluation.score_percentage}%</span> ({evaluation.correct_answers_count} of {evaluation.total_questions} correct)
//               </p>
//             </div>

//             {/* Explanation & Feedback Card */}
//             {evaluation.feedback.map((item, idx) => (
//               <div 
//                 key={idx} 
//                 className={`p-4 rounded-xl border space-y-2 text-xs ${
//                   item.is_correct ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
//                 }`}
//               >
//                 <div className="flex items-center gap-2 font-semibold text-slate-800">
//                   {item.is_correct ? (
//                     <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
//                   ) : (
//                     <XCircle size={16} className="text-rose-600 flex-shrink-0" />
//                   )}
//                   <span>{item.is_correct ? 'Correct Answer' : 'Incorrect Choice'}</span>
//                 </div>

//                 {/* Explanation text from Backend */}
//                 <div className="pt-1 text-slate-700 space-y-1">
//                   <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-900">
//                     <BookOpen size={13} className="text-blue-600" />
//                     <span>Explanation & RAG Insights:</span>
//                   </div>
//                   <p className="leading-relaxed text-[11px] text-slate-600 pl-4 border-l-2 border-slate-300">
//                     {item.explanation || 'No explanation provided for this question.'}
//                   </p>
//                 </div>
//               </div>
//             ))}

//             {/* Action Buttons */}
//             <div className="flex gap-3 pt-2">
//               <button 
//                 onClick={() => { setEvaluation(null); setSelectedOption(null); }}
//                 className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-xs font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
//               >
//                 <RotateCcw size={14} />
//                 <span>Retake Quiz</span>
//               </button>
//               <button 
//                 onClick={() => router.push('/student/dashboard')}
//                 className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
//               >
//                 <span>Back to Dashboard</span>
//                 <ArrowRight size={14} />
//               </button>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }