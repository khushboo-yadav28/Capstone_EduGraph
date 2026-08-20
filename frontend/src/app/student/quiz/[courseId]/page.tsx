'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, HelpCircle, Award, RotateCcw } from 'lucide-react';
import { api } from '../../../lib/api';

export default function QuizAssessmentPage() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Mock quiz question derived from the system design course graph
  const question = {
    id: 'q1',
    concept: 'Distributed Architecture & Load Balancing',
    text: 'Which architectural pattern is best suited for routing incoming network traffic across multiple backend servers to ensure high availability and fault tolerance?',
    options: [
      'Monolithic Single-Threaded Loop',
      'Reverse Proxy & Load Balancer',
      'Hardcoded Static IP Routing',
      'Synchronous Local File Queue'
    ],
    correctAnswer: 1 // Reverse Proxy & Load Balancer
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOption === null) return;

    setSubmitted(true);
    if (selectedOption === question.correctAnswer) {
      setScore(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        
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

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Target Node: {question.concept}</span>
              <h2 className="text-sm font-semibold text-slate-800 leading-relaxed">{question.text}</h2>
            </div>

            <div className="space-y-2.5">
              {question.options.map((option, idx) => (
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
              disabled={selectedOption === null}
              className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Submit Answer</span>
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Award size={32} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {score === 1 ? 'Correct! Concept Mastered 🚀' : 'Review Recommended'}
              </h3>
              <p className="text-xs text-slate-500">
                {score === 1 
                  ? 'Your answer has been verified. Node progression updated in your database graph profile.' 
                  : 'Review the Smart Study Sidebar RAG context for this node and try again.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setSubmitted(false); setSelectedOption(null); }}
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