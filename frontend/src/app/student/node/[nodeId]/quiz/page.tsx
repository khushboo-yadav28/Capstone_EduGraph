'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchNodeQuestions, submitQuizScore, QuizAnswer, BatchQuizEvaluationResponse } from '@/src/lib/api';
import { CheckCircle2, AlertCircle, ArrowRight, BookOpen, RotateCcw } from 'lucide-react';

export default function NodeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params?.nodeId as string;

  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [result, setResult] = useState<BatchQuizEvaluationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!nodeId) return;
    fetchNodeQuestions(nodeId)
      .then((data: any) => setQuestions(data || []))
      .catch((err: any) => console.error('Failed to load questions:', err))
      .finally(() => setLoading(false));
  }, [nodeId]);

  const handleOptionSelect = (quizId: string | number, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [String(quizId)]: optionIndex }));
  };

  const handleSubmit = async () => {
    const formattedAnswers: QuizAnswer[] = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
      quiz_id: Number(qId),
      selected_option_index: Number(optIdx)
    }));

    if (formattedAnswers.length === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitQuizScore(nodeId, formattedAnswers);
      setResult(res);
    } catch (err) {
      console.error(err);
      alert('Failed to submit quiz assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-xs font-semibold text-slate-500">Loading node questions...</p>
      </div>
    );
  }

  const feedbackItems = result?.feedback || [];
  const isPassed = Boolean(result?.is_passed);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex justify-center">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
        
        {/* Header */}
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800">Node Concept Assessment</h1>
            <p className="text-[11px] text-slate-500">Node ID: {nodeId}</p>
          </div>
          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full uppercase">
            Interactive Check
          </span>
        </div>

        {result ? (
          <div className="space-y-6">
            <div className={`p-5 rounded-xl border ${
              isPassed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {isPassed ? (
                  <CheckCircle2 className="text-emerald-600" size={20} />
                ) : (
                  <AlertCircle className="text-rose-600" size={20} />
                )}
                <h2 className={`font-bold text-sm ${isPassed ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {isPassed ? 'Assessment Passed!' : 'Assessment Not Passed'}
                </h2>
              </div>
              <p className="text-xs mt-1 text-slate-600 pl-7">
                Score: <span className="font-bold">{result.score_percentage}%</span> ({result.correct_answers_count} of {result.total_questions} correct)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Explanations & Feedback
              </h3>

              {feedbackItems.length === 0 ? (
                <p className="text-xs text-slate-500">No feedback explanations available for this submission.</p>
              ) : (
                feedbackItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                      item.is_correct ? 'bg-emerald-50/30 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800">
                        {idx + 1}. {item.question_text}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200/80 rounded-lg text-slate-700 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-900">
                        <BookOpen size={13} className="text-blue-600" />
                        <span>Explanation:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 pl-4 border-l-2 border-slate-300">
                        {item.explanation || 'No detail provided for this item.'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setResult(null); setSelectedAnswers({}); }}
                className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-xs font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Retake Quiz</span>
              </button>
              <button 
                onClick={() => router.back()}
                className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Return to Knowledge Graph</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-3 border-b border-slate-100 pb-5">
                <p className="text-xs font-semibold text-slate-800">
                  {idx + 1}. {q.question_text}
                </p>
                <div className="space-y-2">
                  {q.options?.map((opt: string, optIdx: number) => {
                    const isSelected = selectedAnswers[String(q.id)] === optIdx;
                    return (
                      <label 
                        key={optIdx} 
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-medium' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`question-${q.id}`} 
                          checked={isSelected}
                          onChange={() => handleOptionSelect(q.id, optIdx)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <button 
              onClick={handleSubmit}
              disabled={submitting || Object.keys(selectedAnswers).length === 0}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{submitting ? 'Evaluating...' : 'Submit Quiz & Unlock Path'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}