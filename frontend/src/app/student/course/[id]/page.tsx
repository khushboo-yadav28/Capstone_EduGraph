'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Network, 
  ArrowLeft, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  HelpCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/src/lib/api';

// --- Custom Node UI Component ---
const ConceptNode = ({ data }: any) => {
  const isCompleted = data.is_completed;
  const isUnlocked = data.is_unlocked;

  let bgStyles = 'bg-slate-100 border-slate-300 text-slate-400';
  let icon = <Lock size={16} className="text-slate-400 shrink-0" />;
  let badgeText = 'Locked';
  let badgeBg = 'bg-slate-200 text-slate-600';

  if (isCompleted) {
    bgStyles = 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm';
    icon = <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />;
    badgeText = 'Completed';
    badgeBg = 'bg-emerald-100 text-emerald-800';
  } else if (isUnlocked) {
    bgStyles = 'bg-blue-50 border-blue-500 text-blue-950 shadow-md ring-2 ring-blue-100';
    icon = <Unlock size={16} className="text-blue-600 shrink-0" />;
    badgeText = 'Available';
    badgeBg = 'bg-blue-100 text-blue-800';
  }

  return (
    <div className={`px-4 py-3 rounded-2xl border-2 w-auto max-w-[280px] min-w-[200px] transition-all ${bgStyles}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2.5 !h-2.5" />
      
      <div className="flex items-start gap-2 mb-2">
        {icon}
        <div className="flex-1">
          <h4 className="text-xs font-bold leading-snug break-words whitespace-normal">
            {data.label}
          </h4>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badgeBg}`}>
          {badgeText}
        </span>
        {data.question_count > 0 && (
          <span className="text-[10px] text-slate-500 font-medium">
            {data.question_count} Qs
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2.5 !h-2.5" />
    </div>
  );
};

// Moving nodeTypes outside component to fix React Flow warning #002
const nodeTypes = { conceptNode: ConceptNode };

export default function StudentCourseWorkspace() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Assessment & Quiz States
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [quizId: string]: number }>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const fetchGraphData = useCallback(async () => {
    if (!courseId) return;

    try {
      const [graphRes, progressRes] = await Promise.all([
        api.get(`/courses/${courseId}/graph`),
        api.get(`/quizzes/course/${courseId}/progress`)
      ]);

      const rawNodes = graphRes.data.nodes || [];
      const rawEdges = graphRes.data.edges || [];
      const progressList = progressRes.data || [];

      const progressMap = new Map();
      progressList.forEach((p: any) => progressMap.set(String(p.node_id), p));

      const keyToIdMap = new Map();
      rawNodes.forEach((n: any) => {
        if (n.node_key) keyToIdMap.set(n.node_key, String(n.id));
      });

      const formattedNodes = rawNodes.map((node: any, idx: number) => {
        const nodeIdStr = String(node.id);
        const userProgress = progressMap.get(nodeIdStr);

        const isUnlocked = userProgress ? userProgress.is_unlocked : (node.is_unlocked ?? idx === 0);
        const isCompleted = userProgress ? userProgress.is_completed : (node.is_completed ?? false);

        const posX = node.position?.x ?? node.x ?? (150 + (idx % 3) * 320);
        const posY = node.position?.y ?? node.y ?? (100 + Math.floor(idx / 3) * 180);

        return {
          id: nodeIdStr,
          type: 'conceptNode',
          position: { x: Number(posX), y: Number(posY) },
          data: {
            id: nodeIdStr,
            node_key: node.node_key,
            label: node.title || node.label || `Concept ${node.id}`,
            description: node.description || node.summary || 'No overview summary provided for this concept.',
            is_unlocked: isUnlocked,
            is_completed: isCompleted,
            question_count: node.question_count || 0
          },
        };
      });

      const formattedEdges = rawEdges.map((e: any, i: number) => {
        const sourceId = String(e.source || keyToIdMap.get(e.source_node_key) || e.source_id);
        const targetId = String(e.target || keyToIdMap.get(e.target_node_key) || e.target_id);

        const sourceNode = formattedNodes.find((n: any) => n.id === sourceId);
        const targetNode = formattedNodes.find((n: any) => n.id === targetId);
        const isEdgeActive = sourceNode?.data?.is_completed && targetNode?.data?.is_unlocked;

        return {
          id: String(e.id || `edge-${sourceId}-${targetId}-${i}`),
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          animated: isEdgeActive,
          style: {
            stroke: isEdgeActive ? '#3b82f6' : '#cbd5e1',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEdgeActive ? '#3b82f6' : '#cbd5e1',
          },
        };
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);

      if (selectedNode) {
        const updated = formattedNodes.find((n: any) => n.id === selectedNode.id);
        if (updated) setSelectedNode(updated);
      }
    } catch (err) {
      console.error("Failed to load graph progress data:", err);
    }
  }, [courseId, selectedNode, setNodes, setEdges]);

  useEffect(() => {
    fetchGraphData();
  }, [courseId]);

  const onNodeClick = useCallback(async (_event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setQuizResult(null);
    setSelectedAnswers({});
    setQuizzes([]);

    if (node.data.is_unlocked) {
      setLoadingQuiz(true);
      try {
        const response = await api.get(`/quizzes/node/${node.id}/questions?count=10`);
        setQuizzes(response.data || []);
      } catch (err) {
        console.error("Error fetching questions:", err);
      } finally {
        setLoadingQuiz(false);
      }
    }
  }, []);

  const handleQuizSubmit = async () => {
    if (!selectedNode || quizzes.length === 0) return;

    const payload = {
      answers: Object.entries(selectedAnswers).map(([quizId, optionIdx]) => ({
        quiz_id: quizId,
        selected_option_index: optionIdx
      }))
    };

    setSubmittingQuiz(true);
    try {
      const response = await api.post(`/quizzes/node/${selectedNode.id}/submit`, payload);
      setQuizResult(response.data);
      await fetchGraphData();
    } catch (err: any) {
      console.error("Quiz submission error:", err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden text-slate-800">
      
      {/* Main Graph Viewport */}
      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/student/dashboard')}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Course Learning Map
              </h2>
              <p className="text-[11px] text-slate-400">
                Click unlocked nodes to inspect content and attempt assessments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live DAG Graph Sync
            </span>
          </div>
        </header>

        <div className="flex-1 w-full h-full bg-slate-50">
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background gap={20} size={1} color="#cbd5e1" />
            <Controls />
            <MiniMap style={{ height: 120, borderRadius: 12 }} zoomable pannable />
          </ReactFlow>
        </div>
      </div>

      {/* Sidebar Inspector Panel */}
      <aside className="w-96 bg-white border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Network size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Concept Details</h3>
            </div>
          </div>

          {selectedNode ? (
            <div className="space-y-5">
              <div className={`p-4 rounded-2xl border ${
                selectedNode.data.is_completed 
                  ? 'bg-emerald-50/70 border-emerald-200' 
                  : selectedNode.data.is_unlocked 
                    ? 'bg-blue-50/70 border-blue-200' 
                    : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Selected Node
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedNode.data.is_completed ? 'bg-emerald-200 text-emerald-800' :
                    selectedNode.data.is_unlocked ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedNode.data.is_completed ? 'Completed' : selectedNode.data.is_unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{selectedNode.data.label}</h4>
              </div>

              {/* Node Description Summary with Markdown + Unlocked Check */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-blue-600" />
                  Concept Overview
                </h5>

                {selectedNode.data.is_unlocked || selectedNode.data.is_completed ? (
                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 prose prose-xs max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedNode.data.description}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-500 italic">
                    <Lock size={14} className="shrink-0 text-slate-400" />
                    <span>Summary hidden. Unlock this node to view its concept overview.</span>
                  </div>
                )}
              </div>

              {/* Assessment Section */}
              <div className="border-t pt-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-blue-600" />
                  Knowledge Assessment
                </h5>

                {!selectedNode.data.is_unlocked ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <p>Complete prerequisite nodes to unlock this assessment.</p>
                  </div>
                ) : loadingQuiz ? (
                  <p className="text-xs text-slate-400 animate-pulse">Loading node questions...</p>
                ) : quizzes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border">
                    No active questions found for this node.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {quizzes.map((quiz, qIdx) => (
                      <div key={quiz.id} className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                        <p className="text-xs font-semibold text-slate-800">{qIdx + 1}. {quiz.question_text}</p>
                        <div className="space-y-1.5">
                          {quiz.options?.map((opt: string, optIdx: number) => (
                            <label 
                              key={optIdx} 
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                selectedAnswers[quiz.id] === optIdx
                                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input 
                                type="radio" 
                                name={`quiz-${quiz.id}`}
                                disabled={submittingQuiz || quizResult?.is_passed}
                                checked={selectedAnswers[quiz.id] === optIdx}
                                onChange={() => setSelectedAnswers({ ...selectedAnswers, [quiz.id]: optIdx })}
                                className="accent-blue-600"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Submission Evaluation Feedback */}
                    {quizResult && (
                      <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        quizResult.is_passed 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}>
                        <p className="font-bold">
                          {quizResult.is_passed ? 'Passed!' : 'Assessment Failed'}
                        </p>
                        <p>
                          Score: {quizResult.score_percentage}% ({quizResult.correct_answers_count}/{quizResult.total_questions})
                        </p>
                        {quizResult.unlocked_next_node_keys?.length > 0 && (
                          <p className="text-[11px] text-emerald-700 pt-1 font-semibold">
                            Unlocked downstream node(s): {quizResult.unlocked_next_node_keys.join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleQuizSubmit}
                      disabled={
                        submittingQuiz || 
                        Object.keys(selectedAnswers).length === 0 || 
                        quizResult?.is_passed
                      }
                      className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {submittingQuiz ? 'Evaluating Answers...' : quizResult?.is_passed ? 'Completed' : 'Submit Node Quiz'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-3 text-slate-400">
              <Network size={32} className="mx-auto opacity-40" />
              <p className="text-xs">
                Select any concept node on the graph map to view summary details and assessment questions.
              </p>
            </div>
          )}
        </div>

        <button 
          onClick={() => router.push('/student/dashboard')}
          className="w-full bg-slate-100 text-slate-700 rounded-xl py-2.5 text-xs font-semibold hover:bg-slate-200 transition shadow-sm mt-6"
        >
          Return to Dashboard
        </button>
      </aside>

    </div>
  );
}