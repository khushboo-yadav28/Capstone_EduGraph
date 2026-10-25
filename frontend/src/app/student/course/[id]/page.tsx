'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  NodeResizer
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
  BookOpen,
  PlayCircle,
  Award,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Sliders,
  ChevronDown,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  Download,
  MessageSquare,
  Send
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  api, 
  GraphNode, 
  CourseGraphResponse, 
  UserCourseEnrollment, 
  EnrollmentStatus,
  QuizQuestion,
  BatchQuizEvaluationResponse,
  StudentProgressRecord,
  getCourseGraph,
  getStudentCourseProgress,
  fetchNodeQuestions,
  submitNodeQuiz,
  getEnrollmentByCourse,
  updateEnrollmentStatus
} from '@/src/lib/api';

// ---------------------------------------------------------------------------
// Custom Node Component with Resizable Support
// ---------------------------------------------------------------------------
const ConceptNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const isCompleted = data.status === 'COMPLETED' || data.is_completed;
  const isUnlocked = data.status === 'UNLOCKED' || data.is_unlocked;

  let bgStyles = 'bg-white border-[#e2eae4] text-slate-400 opacity-80';
  let icon = <Lock size={15} className="text-slate-400 shrink-0" />;
  let badgeText = 'Locked';
  let badgeBg = 'bg-[#f4f7f4] text-[#4a6b5d]';

  if (isCompleted) {
    bgStyles = 'bg-[#fbfcfb] border-[#2e5a44] text-[#112217] shadow-sm ring-1 ring-[#bce8c9]';
    icon = <CheckCircle2 size={16} className="text-[#2e5a44] shrink-0" />;
    badgeText = 'Completed';
    badgeBg = 'bg-[#d3efdc] text-[#112217] font-bold';
  } else if (isUnlocked) {
    bgStyles = 'bg-[#fbfcfb] border-[#112217] text-[#112217] shadow-md ring-2 ring-[#d3efdc]/70';
    icon = <Unlock size={16} className="text-[#112217] shrink-0" />;
    badgeText = 'Available';
    badgeBg = 'bg-[#112217] text-white font-bold';
  }

  return (
    <div className={`px-4 py-3 rounded-2xl border-2 w-full h-full flex flex-col justify-between transition-all cursor-pointer ${bgStyles}`}>
      <NodeResizer 
        color="#2e5a44" 
        isVisible={selected} 
        minWidth={210} 
        minHeight={90} 
      />

      <Handle type="target" position={Position.Top} className="!bg-[#4a6b5d] !w-2.5 !h-2.5" />
      
      <div className="flex items-start gap-2.5 mb-2">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black leading-snug break-words whitespace-normal text-[#112217]">
            {data.label || data.title}
          </h4>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-[#e2eae4]">
        <span className={`text-[10px] px-2.5 py-0.5 rounded-lg ${badgeBg}`}>
          {badgeText}
        </span>
        {data.best_score_percentage !== undefined && data.best_score_percentage !== null && (
          <span className="text-[10px] font-bold text-[#2e5a44] bg-[#d3efdc]/60 px-2 py-0.5 rounded-md">
            Best: {Math.round(data.best_score_percentage)}%
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#4a6b5d] !w-2.5 !h-2.5" />
    </div>
  );
};

const nodeTypes = { conceptNode: ConceptNode };

// ---------------------------------------------------------------------------
// Student Interactive Learning & Graph Progression Workspace
// ---------------------------------------------------------------------------
export default function StudentCourseWorkspace() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  // Course Graph & Meta States
  const [courseTitle, setCourseTitle] = useState('Course Knowledge Map');
  const [courseDesc, setCourseDesc] = useState('');
  const [enrollment, setEnrollment] = useState<UserCourseEnrollment | null>(null);
  const [progressRecords, setProgressRecords] = useState<StudentProgressRecord[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(true);

  // React Flow Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  // Active Tab in Sidebar Inspector ('content' | 'quiz' | 'doubt')
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'doubt'>('content');

  // Minimization States
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isCanvasMinimized, setIsCanvasMinimized] = useState(false);

  // PDF Viewer & Course Documents States
  const [courseDocuments, setCourseDocuments] = useState<any[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedPdfTitle, setSelectedPdfTitle] = useState<string>('Course Document');

  // AI Doubt Solver / Chat States
  const [ragContext, setRagContext] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant'; content: string}>>([
    { role: 'assistant', content: 'Hello! I am your AI Study Assistant. Ask me any doubt regarding this concept or uploaded textbook material.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loadingDoubt, setLoadingDoubt] = useState(false);

  // Quiz States (Supporting Set 1 and Set 2)
  const [activeQuizSet, setActiveQuizSet] = useState<number>(1);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [quizId: number]: number }>({});
  const [quizResult, setQuizResult] = useState<BatchQuizEvaluationResponse | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Enrollment Status Update State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // 1. Fetch Graph, Enrollment, Course Progress & Documents
  const fetchGraphAndProgress = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoadingGraph(true);
      const [graphRes, progressRes, enrollRes, docsRes] = await Promise.allSettled([
        getCourseGraph(courseId),
        getStudentCourseProgress(courseId),
        getEnrollmentByCourse(courseId),
        api.get(`/courses/${courseId}/documents`)
      ]);

      let rawGraph: CourseGraphResponse | null = null;
      if (graphRes.status === 'fulfilled' && graphRes.value) {
        rawGraph = graphRes.value;
        setCourseTitle(rawGraph.course_title || 'Course Knowledge Map');
        setCourseDesc(rawGraph.course_description || '');
      }

      if (progressRes.status === 'fulfilled') {
        setProgressRecords(progressRes.value || []);
      }

      if (enrollRes.status === 'fulfilled') {
        setEnrollment(enrollRes.value || null);
      }

      if (docsRes.status === 'fulfilled' && docsRes.value?.data?.documents) {
        setCourseDocuments(docsRes.value.data.documents);
      }

      let rawNodes = rawGraph?.nodes || [];
      let rawEdges = rawGraph?.edges || [];

      if (rawNodes.length === 0) {
        rawNodes = [
          {
            id: 'n1',
            node_key: 'ds_foundations',
            title: 'System Foundations & Architecture',
            summary: 'Architectural overview of modern distributed services, components, scalability patterns, and data consistency models.',
            status: 'UNLOCKED',
            position_x: 200,
            position_y: 80,
            best_score_percentage: null
          },
          {
            id: 'n2',
            node_key: 'distributed_storage',
            title: 'Distributed Storage & Replication',
            summary: 'Explores distributed consensus (Raft/Paxos), multi-leader replication topologies, and partitioned database storage.',
            status: 'LOCKED',
            position_x: 200,
            position_y: 260,
            best_score_percentage: null
          },
          {
            id: 'n3',
            node_key: 'microservices_scaling',
            title: 'Microservices & High Throughput',
            summary: 'Decoupled event-driven streaming, caching layers (Redis/Memcached), rate limiters, and fault tolerance circuits.',
            status: 'LOCKED',
            position_x: 200,
            position_y: 440,
            best_score_percentage: null
          }
        ];
        rawEdges = [
          { source_node_key: 'ds_foundations', target_node_key: 'distributed_storage' },
          { source_node_key: 'distributed_storage', target_node_key: 'microservices_scaling' }
        ];
      }

      const keyToIdMap = new Map<string, string>();
      rawNodes.forEach((n) => {
        if (n.node_key) keyToIdMap.set(n.node_key, String(n.id));
      });

      const progMap = new Map<string, StudentProgressRecord>();
      if (progressRes.status === 'fulfilled' && progressRes.value) {
        progressRes.value.forEach((p) => progMap.set(String(p.node_id), p));
      }

      const formattedNodes: Node[] = rawNodes.map((n, idx) => {
        const nodeIdStr = String(n.id);
        const userProgress = progMap.get(nodeIdStr);

        let finalStatus = n.status || 'LOCKED';
        if (userProgress) {
          if (userProgress.is_completed) finalStatus = 'COMPLETED';
          else if (userProgress.is_unlocked) finalStatus = 'UNLOCKED';
        }

        const posX = n.position_x ?? (180 + (idx % 2) * 260);
        const posY = n.position_y ?? (70 + idx * 160);

        return {
          id: nodeIdStr,
          type: 'conceptNode',
          position: { x: Number(posX), y: Number(posY) },
          data: {
            ...n,
            id: nodeIdStr,
            label: n.title,
            status: finalStatus,
            is_unlocked: finalStatus === 'UNLOCKED' || finalStatus === 'COMPLETED',
            is_completed: finalStatus === 'COMPLETED',
          }
        };
      });

      const formattedEdges: Edge[] = rawEdges.map((e, i) => {
        const sourceId = keyToIdMap.get(e.source_node_key) || e.source_node_key;
        const targetId = keyToIdMap.get(e.target_node_key) || e.target_node_key;

        const sourceNode = formattedNodes.find((n) => n.id === sourceId);
        const targetNode = formattedNodes.find((n) => n.id === targetId);
        const isActive = sourceNode?.data?.is_completed && targetNode?.data?.is_unlocked;

        return {
          id: `edge-${sourceId}-${targetId}-${i}`,
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          animated: Boolean(isActive),
          style: {
            stroke: isActive ? '#2e5a44' : '#cbd5e1',
            strokeWidth: 2.5
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isActive ? '#2e5a44' : '#cbd5e1'
          }
        };
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);

      if (!selectedNodeData && formattedNodes.length > 0) {
        const firstUnlocked = formattedNodes.find((n) => n.data.is_unlocked) || formattedNodes[0];
        setSelectedNodeData(firstUnlocked.data);
      } else if (selectedNodeData) {
        const updated = formattedNodes.find((n) => n.id === selectedNodeData.id);
        if (updated) setSelectedNodeData(updated.data);
      }
    } catch (err) {
      console.error('Error fetching course graph and progress:', err);
    } finally {
      setLoadingGraph(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchGraphAndProgress();
  }, [fetchGraphAndProgress]);

  // 2. Fetch Quiz Questions for Selected Node
  const loadQuestionsForNode = useCallback(async (nodeId: string, setNumber: number) => {
    setLoadingQuiz(true);
    setQuizResult(null);
    setSelectedAnswers({});
    try {
      const data = await fetchNodeQuestions(nodeId, setNumber, 10);
      setQuizzes(data || []);
    } catch (err) {
      console.warn(`Could not load questions for set ${setNumber}`, err);
      setQuizzes([]);
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNodeData && (selectedNodeData.is_unlocked || selectedNodeData.status === 'COMPLETED')) {
      loadQuestionsForNode(selectedNodeData.id, activeQuizSet);
    } else {
      setQuizzes([]);
    }
  }, [selectedNodeData?.id, activeQuizSet, loadQuestionsForNode]);

  // Fetch RAG Context for Doubt Solver when selected node changes
  useEffect(() => {
    const fetchRag = async () => {
      if (!selectedNodeData?.id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/courses/node/${selectedNodeData.id}/rag-context`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRagContext(res.data);
      } catch (err) {
        console.warn("Could not fetch RAG context for node", err);
        setRagContext(null);
      }
    };
    fetchRag();
  }, [selectedNodeData?.id]);

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data);
    setQuizResult(null);
    setSelectedAnswers({});
    setActiveTab('content');
  };

  // 3. Handle PDF Viewer Open & Download
  const handleOpenPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      let docs = courseDocuments;
      
      if (!docs || docs.length === 0) {
        const docsRes = await api.get(`/courses/${courseId}/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (docsRes.data && docsRes.data.documents) {
          docs = docsRes.data.documents;
          setCourseDocuments(docs);
        }
      }

      const targetDoc = docs[0];
      if (!targetDoc) {
        alert("No PDF document found uploaded by the instructor for this course.");
        return;
      }

      const response = await api.get(`/courses/${courseId}/documents/${targetDoc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSelectedPdfUrl(url);
      setSelectedPdfTitle(targetDoc.file_name);
      setIsPdfModalOpen(true);
    } catch (err) {
      console.error("Failed to load PDF file", err);
      alert("Could not load the PDF file. Please try again.");
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedPdfUrl) return;
    const a = document.createElement('a');
    a.href = selectedPdfUrl;
    a.download = selectedPdfTitle || 'course-document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 4. Handle AI Doubt Solver Chat Submit
  const handleDoubtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loadingDoubt) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoadingDoubt(true);

    try {
      // Simulate intelligent answer based on RAG context excerpts or fallback response
      let assistantReply = `Based on the textbook reference for **${selectedNodeData?.title}**, here is the clarification: `;
      if (ragContext && ragContext.chunks && ragContext.chunks.length > 0) {
        const topChunk = ragContext.chunks[0].content;
        assistantReply += `"${topChunk.slice(0, 300)}..." \n\nThis explains the core principle regarding your question about "${userMsg}".`;
      } else {
        assistantReply += `This concept builds upon the foundational principles of ${selectedNodeData?.title}. Review the concept summary and textbook page references for deeper insights.`;
      }

      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);
        setLoadingDoubt(false);
      }, 800);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your doubt. Please try again.' }]);
      setLoadingDoubt(false);
    }
  };

  // 5. Handle Quiz Submission
  const handleQuizSubmit = async () => {
    if (!selectedNodeData || quizzes.length === 0) return;

    const answerArray = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
      quiz_id: Number(qId),
      selected_option_index: Number(optIdx)
    }));

    if (answerArray.length === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const response = await submitNodeQuiz(selectedNodeData.id, {
        set_number: activeQuizSet,
        answers: answerArray
      });

      setQuizResult(response);
      await fetchGraphAndProgress();
    } catch (err: any) {
      console.error('Quiz submission error:', err);
      alert(err.response?.data?.detail || 'Failed to submit quiz assessment.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // 6. Handle Enrollment Status Update
  const handleStatusUpdate = async (newStatus: EnrollmentStatus) => {
    if (!enrollment?.id) {
      alert('No active enrollment record found to update.');
      return;
    }
    setUpdatingStatus(true);
    setStatusMenuOpen(false);
    try {
      const updated = await updateEnrollmentStatus(enrollment.id, newStatus);
      setEnrollment(updated);
    } catch (err: any) {
      console.error('Failed to update enrollment status:', err);
      alert(err.response?.data?.detail || 'Failed to update enrollment status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getEmbedYoutubeUrl = (url?: string, timestamp?: number) => {
    if (!url) return null;
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    if (!videoId) return null;
    const startParam = timestamp ? `?start=${timestamp}` : '';
    return `https://www.youtube.com/embed/${videoId}${startParam}`;
  };

  const completedNodesCount = nodes.filter((n) => n.data?.status === 'COMPLETED').length;
  const totalNodesCount = nodes.length || 1;
  const calculatedProgress = enrollment?.progress_percentage ?? Math.round((completedNodesCount / totalNodesCount) * 100);

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Main Viewport & Canvas Area (Minimizable Canvas) */}
      <div className={`flex flex-col h-full relative transition-all duration-300 ${
        isCanvasMinimized ? 'w-20' : isSidebarMinimized ? 'flex-1' : 'flex-1'
      }`}>
        
        {/* Workspace Top Header */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-6 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/student/dashboard')}
              className="p-2.5 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Canvas Minimize / Expand Toggle */}
            <button 
              onClick={() => setIsCanvasMinimized(!isCanvasMinimized)}
              className="p-2.5 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] text-[#4a6b5d] hover:text-[#112217] hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"
              title={isCanvasMinimized ? "Expand Knowledge Graph Canvas" : "Minimize Knowledge Graph Canvas"}
            >
              {isCanvasMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>

            {!isCanvasMinimized && (
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44] flex items-center gap-1.5">
                  <Network size={12} /> Interactive Learning Graph
                </span>
                <h2 className="text-base font-black text-[#112217] truncate max-w-sm">
                  {courseTitle}
                </h2>
              </div>
            )}
          </div>

          {!isCanvasMinimized && (
            <div className="flex items-center gap-3">
              {enrollment && (
                <div className="relative">
                  <button
                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                    disabled={updatingStatus}
                    className="px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 bg-[#fbfcfb] border-[#e2eae4] text-[#112217] hover:bg-[#f4f7f4] transition shadow-sm cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      enrollment.status === 'COMPLETED' ? 'bg-[#2e5a44]' :
                      enrollment.status === 'DROPPED' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <span>Status: {enrollment.status}</span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {statusMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e2eae4] rounded-2xl shadow-xl p-2 z-50 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-[#4a6b5d] px-3 py-1 block">
                        Update Progress Status
                      </span>
                      {(['IN_PROGRESS', 'COMPLETED', 'DROPPED'] as EnrollmentStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusUpdate(st)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            enrollment.status === st ? 'bg-[#d3efdc] text-[#112217]' : 'text-[#4a6b5d] hover:bg-[#f4f7f4]'
                          }`}
                        >
                          <span>{st}</span>
                          {enrollment.status === st && <CheckCircle2 size={13} className="text-[#2e5a44]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2.5 bg-[#d3efdc]/50 border border-[#bce8c9] px-4 py-2 rounded-2xl shadow-sm">
                <span className="text-xs font-black text-[#112217]">{calculatedProgress}%</span>
                <div className="w-16 bg-[#e2eae4] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2e5a44] h-full rounded-full transition-all duration-500" style={{ width: `${calculatedProgress}%` }} />
                </div>
              </div>
            </div>
          )}
        </header>

        {/* ReactFlow Interactive Graph Canvas */}
        {!isCanvasMinimized ? (
          <div className="flex-1 w-full h-full bg-[#f4f7f4]">
            <ReactFlow 
              nodes={nodes} 
              edges={edges} 
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              nodesDraggable={false}
              fitView
              fitViewOptions={{ padding: 0.25 }}
            >
              <Background gap={22} size={1} color="#cbd5e1" />
              <Controls className="!bg-white !border-[#e2eae4] !rounded-2xl !shadow-md" />
              <MiniMap style={{ height: 110, borderRadius: 16, border: '1px solid #e2eae4', background: '#ffffff' }} zoomable pannable />
            </ReactFlow>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center cursor-pointer bg-[#fbfcfb] border-r border-[#e2eae4]" onClick={() => setIsCanvasMinimized(false)}>
            <div className="[writing-mode:vertical-lr] text-[11px] font-black text-[#4a6b5d] uppercase tracking-widest flex items-center gap-2 py-4">
              <span>Knowledge Graph Canvas</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Inspector Panel */}
      <aside className={`bg-[#fbfcfb] border-l border-[#e2eae4] flex flex-col justify-between overflow-hidden z-20 shadow-md transition-all duration-300 ${
        isSidebarMinimized ? 'w-16 p-3 items-center' : isCanvasMinimized ? 'flex-1 p-8' : 'w-[420px] p-6'
      }`}>
        
        {/* Sidebar Header */}
        <div className={`border-b border-[#e2eae4] space-y-4 ${isSidebarMinimized ? 'pb-3 w-full flex flex-col items-center' : 'pb-6'}`}>
          <div className="flex items-center justify-between w-full">
            {!isSidebarMinimized && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
                  <Network size={17} />
                </div>
                <h3 className="text-sm font-black text-[#112217]">Concept Inspector</h3>
              </div>
            )}

            <button 
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
              className={`p-2 rounded-xl bg-[#f4f7f4] hover:bg-[#d3efdc]/50 text-[#4a6b5d] hover:text-[#112217] transition cursor-pointer ${isSidebarMinimized ? 'mx-auto' : 'ml-auto'}`}
              title={isSidebarMinimized ? "Expand Inspector" : "Minimize Inspector"}
            >
              {isSidebarMinimized ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {!isSidebarMinimized && selectedNodeData && (
            <div className="flex items-center justify-between pt-1">
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl shadow-sm ${
                selectedNodeData.status === 'COMPLETED' ? 'bg-[#d3efdc] text-[#112217] border border-[#bce8c9]' :
                selectedNodeData.is_unlocked ? 'bg-[#112217] text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {selectedNodeData.status || (selectedNodeData.is_unlocked ? 'Unlocked' : 'Locked')}
              </span>
            </div>
          )}

          {/* Tab Switcher: Concept Content vs Quiz vs AI Doubt Solver */}
          {!isSidebarMinimized && selectedNodeData && (
            <div className="grid grid-cols-3 bg-[#f4f7f4] border border-[#e2eae4] p-1 rounded-2xl gap-1">
              <button
                onClick={() => setActiveTab('content')}
                className={`py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'content'
                    ? 'bg-white text-[#112217] shadow-sm'
                    : 'text-[#4a6b5d] hover:text-[#112217]'
                }`}
              >
                <BookOpen size={12} className="text-[#2e5a44]" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                disabled={!selectedNodeData.is_unlocked}
                className={`py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                  activeTab === 'quiz'
                    ? 'bg-white text-[#112217] shadow-sm'
                    : 'text-[#4a6b5d] hover:text-[#112217]'
                }`}
              >
                <HelpCircle size={12} className="text-[#2e5a44]" />
                <span>Quiz</span>
              </button>
              <button
                onClick={() => setActiveTab('doubt')}
                disabled={!selectedNodeData.is_unlocked}
                className={`py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                  activeTab === 'doubt'
                    ? 'bg-white text-[#112217] shadow-sm'
                    : 'text-[#4a6b5d] hover:text-[#112217]'
                }`}
              >
                <MessageSquare size={12} className="text-[#2e5a44]" />
                <span>AI Doubt</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        {!isSidebarMinimized ? (
          <div className="flex-1 overflow-y-auto py-6 space-y-6">
            {selectedNodeData ? (
              <>
                <div className={`p-5 rounded-[24px] border shadow-sm ${
                  selectedNodeData.status === 'COMPLETED' 
                    ? 'bg-[#d3efdc]/40 border-[#bce8c9]' 
                    : selectedNodeData.is_unlocked 
                      ? 'bg-white border-[#2e5a44]' 
                      : 'bg-[#f4f7f4] border-[#e2eae4]'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a6b5d]">
                      Topic Key: <span className="font-mono text-[#112217]">{selectedNodeData.node_key || 'node'}</span>
                    </span>
                    {selectedNodeData.best_score_percentage !== null && selectedNodeData.best_score_percentage !== undefined && (
                      <span className="text-[10px] font-bold text-[#2e5a44]">
                        Best Score: {Math.round(selectedNodeData.best_score_percentage)}%
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-[#112217] leading-snug">
                    {selectedNodeData.label || selectedNodeData.title}
                  </h4>
                </div>

                {/* TAB 1: CONCEPT CONTENT */}
                {activeTab === 'content' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <h5 className="text-xs font-extrabold text-[#4a6b5d] uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen size={14} className="text-[#2e5a44]" />
                        Syllabus Concept Summary
                      </h5>

                      {selectedNodeData.is_unlocked ? (
                        <div className="text-xs text-[#1e2923] leading-relaxed bg-white p-4 rounded-2xl border border-[#e2eae4] prose prose-xs max-w-none shadow-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedNodeData.summary || selectedNodeData.description || 'No detailed syllabus summary available for this node.'}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl flex items-center gap-2.5 text-xs text-[#4a6b5d] italic shadow-sm">
                          <Lock size={15} className="shrink-0 text-slate-400" />
                          <span>Content locked. Pass upstream prerequisite quizzes to view this topic summary.</span>
                        </div>
                      )}
                    </div>

                    {/* Textbook Page References & PDF Viewer Button */}
                    <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#4a6b5d] flex items-center gap-1">
                          <FileText size={12} className="text-[#2e5a44]" /> Textbook Page References
                        </span>
                        <p className="text-xs font-bold text-[#112217] mt-0.5">
                          {Array.isArray(selectedNodeData.page_references) 
                            ? selectedNodeData.page_references.join(', ') 
                            : String(selectedNodeData.page_references || "General Material")}
                        </p>
                      </div>
                      <button
                        onClick={handleOpenPdf}
                        className="px-3.5 py-2 bg-[#112217] hover:bg-[#223d2f] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <span>📄 View PDF</span>
                      </button>
                    </div>

                    {(selectedNodeData.youtube_url || selectedNodeData.video_url) && selectedNodeData.is_unlocked && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-extrabold text-[#4a6b5d] uppercase tracking-wider flex items-center gap-1.5">
                          <PlayCircle size={14} className="text-[#2e5a44]" />
                          Curated Video Lesson
                        </h5>
                        {getEmbedYoutubeUrl(selectedNodeData.youtube_url || selectedNodeData.video_url, selectedNodeData.youtube_timestamp_seconds) ? (
                          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-[#e2eae4] shadow-sm">
                            <iframe
                              src={getEmbedYoutubeUrl(selectedNodeData.youtube_url || selectedNodeData.video_url, selectedNodeData.youtube_timestamp_seconds)!}
                              title="Video Lecture"
                              className="w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <a 
                            href={selectedNodeData.youtube_url || selectedNodeData.video_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-3 bg-white border border-[#e2eae4] rounded-2xl text-xs font-bold text-[#2e5a44] block hover:underline"
                          >
                            Open External Video Lecture &rarr;
                          </a>
                        )}
                      </div>
                    )}

                    {selectedNodeData.is_unlocked && (
                      <button
                        onClick={() => setActiveTab('quiz')}
                        className="w-full py-3 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <HelpCircle size={14} /> Start Knowledge Assessment &rarr;
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 2: QUIZ ASSESSMENT */}
                {activeTab === 'quiz' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-3 bg-white border border-[#e2eae4] rounded-2xl shadow-sm">
                      <span className="text-xs font-bold text-[#112217]">Assessment Batch:</span>
                      <div className="flex gap-1.5">
                        {[1, 2].map((setNum) => (
                          <button
                            key={setNum}
                            onClick={() => setActiveQuizSet(setNum)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              activeQuizSet === setNum
                                ? 'bg-[#112217] text-white shadow-sm'
                                : 'bg-[#f4f7f4] border border-[#e2eae4] text-[#4a6b5d] hover:bg-[#d3efdc]/40'
                            }`}
                          >
                            Set {setNum}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loadingQuiz ? (
                      <div className="text-center py-12 space-y-2">
                        <Loader2 size={20} className="animate-spin text-[#2e5a44] mx-auto" />
                        <p className="text-xs text-[#4a6b5d] font-bold">Loading questions for Set {activeQuizSet}...</p>
                      </div>
                    ) : quizzes.length === 0 ? (
                      <div className="p-6 bg-white border border-[#e2eae4] rounded-2xl text-center space-y-2 shadow-sm">
                        <p className="text-xs font-bold text-[#112217]">No quizzes configured for Set {activeQuizSet}.</p>
                        <p className="text-[11px] text-[#4a6b5d]">Try switching to Set 1 or check other modules.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {quizzes.map((quiz, qIdx) => (
                          <div key={quiz.id} className="p-4 bg-white border border-[#e2eae4] rounded-2xl space-y-2.5 shadow-sm">
                            <p className="text-xs font-bold text-[#112217] leading-snug">
                              {qIdx + 1}. {quiz.question_text}
                            </p>
                            <div className="space-y-1.5">
                              {quiz.options?.map((opt: string, optIdx: number) => {
                                const isChecked = selectedAnswers[quiz.id] === optIdx;
                                return (
                                  <label 
                                    key={optIdx} 
                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                                      isChecked
                                        ? 'bg-[#d3efdc]/60 border-[#2e5a44] text-[#112217] font-bold shadow-sm'
                                        : 'bg-white border-[#e2eae4] text-[#4a6b5d] hover:bg-[#f4f7f4]'
                                    }`}
                                  >
                                    <input 
                                      type="radio" 
                                      name={`quiz-${quiz.id}`} 
                                      checked={isChecked}
                                      disabled={submittingQuiz}
                                      onChange={() => setSelectedAnswers({ ...selectedAnswers, [quiz.id]: optIdx })}
                                      className="accent-[#112217]"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {quizResult && (
                          <div className={`p-4 rounded-2xl border text-xs space-y-2 shadow-sm ${
                            quizResult.is_passed 
                              ? 'bg-[#d3efdc]/70 border-[#bce8c9] text-[#112217]' 
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm">
                                {quizResult.is_passed ? 'Set Passed!' : 'Set Attempt Failed'}
                              </span>
                              <span className="font-mono font-bold text-xs">
                                {quizResult.score_percentage}% ({quizResult.correct_answers_count}/{quizResult.total_questions})
                              </span>
                            </div>

                            {quizResult.node_fully_completed && (
                              <p className="text-[11px] font-black text-[#2e5a44] pt-1">
                                Node Fully Completed! All required quiz sets passed.
                              </p>
                            )}

                            {quizResult.unlocked_next_node_keys?.length > 0 && (
                              <p className="text-[11px] font-bold text-[#2e5a44]">
                                Unlocked downstream concept(s): {quizResult.unlocked_next_node_keys.join(', ')}
                              </p>
                            )}

                            {quizResult.feedback?.length > 0 && (
                              <div className="pt-2 border-t border-[#bce8c9] space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider block">Question Explanations:</span>
                                {quizResult.feedback.map((fb, fbIdx) => (
                                  <div key={fbIdx} className="bg-white/80 p-2.5 rounded-xl border border-white/60 space-y-1">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="font-bold text-[#112217]">Q{fbIdx + 1}</span>
                                      <span className={fb.is_correct ? 'text-[#2e5a44] font-bold' : 'text-rose-600 font-bold'}>
                                        {fb.is_correct ? 'Correct' : 'Incorrect'}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 leading-relaxed">{fb.explanation}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={handleQuizSubmit}
                          disabled={submittingQuiz || Object.keys(selectedAnswers).length === 0}
                          className="w-full bg-[#112217] text-white rounded-2xl py-3.5 text-xs font-bold hover:bg-[#223d2f] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {submittingQuiz ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Evaluating Answers...
                            </>
                          ) : (
                            <>
                              Submit Assessment (Set {activeQuizSet}) &rarr;
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: AI DOUBT SOLVER CHAT */}
                {activeTab === 'doubt' && (
                  <div className="space-y-4 flex flex-col h-[460px]">
                    <div className="p-3 bg-[#d3efdc]/40 border border-[#bce8c9] rounded-2xl flex items-center gap-2">
                      <MessageSquare size={16} className="text-[#2e5a44] shrink-0" />
                      <p className="text-[11px] font-bold text-[#112217]">
                        Asking doubts for: <span className="text-[#2e5a44]">{selectedNodeData.title}</span>
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-white border border-[#e2eae4] rounded-2xl shadow-inner">
                      {chatMessages.map((msg, mIdx) => (
                        <div key={mIdx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-[#112217] text-white rounded-br-none' 
                              : 'bg-[#f4f7f4] border border-[#e2eae4] text-[#112217] rounded-bl-none'
                          }`}>
                            <p>{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {loadingDoubt && (
                        <div className="flex justify-start">
                          <div className="bg-[#f4f7f4] border border-[#e2eae4] p-3 rounded-2xl text-xs text-[#4a6b5d] flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-[#2e5a44]" />
                            <span>AI is analyzing textbook excerpts...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleDoubtSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your doubt or question..."
                        className="flex-1 px-4 py-2.5 bg-white border border-[#e2eae4] rounded-xl text-xs text-[#112217] focus:outline-none focus:border-[#2e5a44]"
                      />
                      <button
                        type="submit"
                        disabled={loadingDoubt || !chatInput.trim()}
                        className="px-4 py-2.5 bg-[#112217] hover:bg-[#223d2f] text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50 flex items-center justify-center cursor-pointer"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-24 space-y-3 text-[#4a6b5d]">
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#e2eae4] flex items-center justify-center mx-auto shadow-sm">
                  <Network size={24} className="text-[#2e5a44]" />
                </div>
                <p className="text-xs font-bold text-[#112217]">Select a node on the canvas</p>
                <p className="text-[11px] text-[#4a6b5d] max-w-xs mx-auto">
                  Click any concept circle on your interactive graph to inspect curriculum references and unlock quiz questions.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 cursor-pointer" onClick={() => setIsSidebarMinimized(false)}>
            <div className="[writing-mode:vertical-lr] text-[11px] font-black text-[#4a6b5d] uppercase tracking-widest flex items-center gap-2 py-4">
              <span>Concept Inspector</span>
              <ChevronLeft size={16} />
            </div>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className={`border-t border-[#e2eae4] bg-white ${isSidebarMinimized ? 'p-3 flex justify-center' : 'p-6'}`}>
          {!isSidebarMinimized ? (
            <button 
              onClick={() => router.push('/student/dashboard')}
              className="w-full bg-[#f4f7f4] text-[#112217] border border-[#e2eae4] rounded-2xl py-3 text-xs font-bold hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"
            >
              Return to Dashboard
            </button>
          ) : (
            <button 
              onClick={() => router.push('/student/dashboard')}
              className="p-2.5 bg-[#f4f7f4] text-[#112217] border border-[#e2eae4] rounded-xl hover:bg-[#d3efdc]/40 transition cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
          )}
        </div>

      </aside>

      {/* PDF Viewer Modal with Download Button */}
      {isPdfModalOpen && selectedPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">📚</span>
                <h3 className="font-semibold text-base truncate">{selectedPdfTitle}</h3>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={`${selectedPdfUrl}#view=FitH`}
                className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-inner"
                title="Course PDF Viewer"
              />
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={handleDownloadPdf}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow"
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}