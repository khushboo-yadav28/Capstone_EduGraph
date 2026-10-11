'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import { CheckCircle2, XCircle, Award, ArrowRight } from 'lucide-react';

export default function QuizModal({ courseId, nodeId, onClose }: { courseId: string; nodeId: string; onClose: () => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        // Fetch quiz questions for this node or course from backend
        const response = await api.get(`/courses/${courseId}/quiz`).catch(() => api.get(`/nodes/${nodeId}/quiz`));
        setQuestions(response.data || [
          {
            id: 1,
            question: "What is the primary purpose of a Data Warehouse staging area?",
            options: ["Long-term cold storage", "Temporary data cleansing and transformation", "Direct end-user reporting", "Machine learning model training"],
            correct_answer: 1
          }
        ]);
      } catch (err) {
        console.error("Error fetching quiz", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuiz();
  }, [courseId, nodeId]);

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [questionIndex]: optionIndex });
  };

  const handleSubmitQuiz = async () => {
    try {
      // Submit attempt to backend
      const response = await api.post('/quiz-attempts', {
        course_id: courseId,
        node_id: nodeId,
        answers: selectedAnswers
      });
      setScoreResult(response.data);
    } catch (err) {
      // Fallback calculation for presentation demo if backend submission route varies
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correct_answer) correctCount++;
      });
      const percentage = Math.round((correctCount / questions.length) * 100);
      setScoreResult({
        score: percentage,
        passed: percentage >= 70,
        message: percentage >= 70 ? "Congratulations! Node unlocked." : "Review the RAG context and try again."
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#112217]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] max-w-xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#e2eae4] pb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#112217]">Knowledge Check Quiz</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-[#112217] font-bold text-sm transition">✕</button>
        </div>

        {loading ? (
          <p className="text-xs text-[#4a6b5d] py-12 text-center animate-pulse">Loading quiz questions...</p>
        ) : scoreResult ? (
          <div className="text-center space-y-4 py-6">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${scoreResult.passed ? 'bg-[#d3efdc] text-[#2e5a44]' : 'bg-amber-100 text-amber-600'}`}>
              <Award size={32} />
            </div>
            <h4 className="text-base font-black text-[#112217]">Score: {scoreResult.score}%</h4>
            <p className="text-xs text-[#4a6b5d]">{scoreResult.message}</p>
            <button 
              onClick={onClose}
              className="px-8 py-3.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-lg cursor-pointer"
            >
              Continue Learning
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="space-y-3">
                <p className="text-xs font-bold text-[#112217]">{qIdx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option: string, oIdx: number) => (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(qIdx, oIdx)}
                      className={`w-full text-left p-3.5 rounded-2xl text-xs font-semibold border transition ${
                        selectedAnswers[qIdx] === oIdx 
                          ? 'border-[#2e5a44] bg-[#d3efdc]/40 text-[#112217] shadow-sm' 
                          : 'border-[#e2eae4] bg-white hover:bg-[#f4f7f4] text-[#4a6b5d]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button 
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length < questions.length}
              className="w-full py-3.5 bg-[#112217] disabled:bg-slate-200 text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-lg cursor-pointer disabled:cursor-not-allowed"
            >
              Submit Quiz Answers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}