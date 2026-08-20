'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchNodeQuestions, submitQuizScore } from '@/services/api';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function NodeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNodeQuestions(nodeId)
      .then(data => setQuestions(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [nodeId]);

  const handleOptionSelect = (quizId: number, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [quizId]: optionIndex }));
  };

  const handleSubmit = async () => {
    const formattedAnswers = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
      quiz_id: Number(qId),
      selected_option_index: optIdx
    }));

    try {
      const res = await submitQuizScore(nodeId, formattedAnswers);
      setResult(res);
    } catch (err) {
      alert('Failed to submit quiz.');
    }
  };

  if (loading) return <div className="p-8 text-xs text-slate-600">Loading quiz questions...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center">
      <div className="w-full max-w-2xl bg-white border rounded-2xl p-8 space-y-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-800">Node Assessment</h1>

        {result ? (
          <div className={`p-6 rounded-xl border space-y-3 ${result.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
            <h2 className="font-bold text-sm">{result.passed ? '🎉 Assessment Passed!' : '⚠️ Assessment Not Passed'}</h2>
            <p className="text-xs">Score: {result.score_percentage}% (Required: 70%)</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Return to Knowledge Graph
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-2 border-b pb-4">
                <p className="text-xs font-semibold text-slate-800">{idx + 1}. {q.question_text}</p>
                <div className="space-y-1.5 pl-2">
                  {q.options.map((opt: string, optIdx: number) => (
                    <label key={optIdx} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`question-${q.id}`} 
                        checked={selectedAnswers[q.id] === optIdx}
                        onChange={() => handleOptionSelect(q.id, optIdx)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button 
              onClick={handleSubmit}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
            >
              Submit Quiz & Unlock Path
            </button>
          </div>
        )}
      </div>
    </div>
  );
}