'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Network, 
  BookOpen, 
  Upload, 
  LogOut, 
  Layers, 
  RefreshCw,
  X,
  PlayCircle,
  HelpCircle
} from 'lucide-react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges,
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { api } from '@/src/lib/api';

interface QuizItem {
  id: string;
  question: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
}

interface NodeData {
  id: string;
  node_key: string;
  title: string;
  summary?: string;
  page_references?: string[];
  video_url?: string;
  youtube_url?: string;
  youtube_timestamp_seconds?: number;
  quizzes: QuizItem[];
}

export default function InstructorCourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  // Course & Data States
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // React Flow Canvas States
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Selected Node State
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Fetch Knowledge Graph from API
  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/courses/instructor/${courseId}/graph`).catch((err) => {
        if (err.response?.status === 403 || err.response?.status === 401) {
          setIsOwner(false);
        }
        return null;
      });

      if (res?.data) {
        const graphData = res.data;
        setCourse({
          id: graphData.course_id,
          title: graphData.course_title,
          description: graphData.course_description,
        });

        const rawNodes = graphData.nodes || [];
        const rawEdges = graphData.edges || [];

        const keyToNodeIdMap: Record<string, string> = {};

        const formattedNodes: Node[] = rawNodes.map((n: any, index: number) => {
          const reactFlowNodeId = String(n.id || n.node_key || `node-${index}`);
          if (n.node_key) {
            keyToNodeIdMap[n.node_key] = reactFlowNodeId;
          }

          const posX = n.position_x ?? (100 + (index % 3) * 240);
          const posY = n.position_y ?? (80 + Math.floor(index / 3) * 140);

          return {
            id: reactFlowNodeId,
            data: { 
              label: n.title || n.node_key || `Concept ${index + 1}`,
              rawNodeData: n 
            },
            position: { x: posX, y: posY },
            style: {
              background: '#ffffff',
              border: '1.5px solid #0f172a',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#1e293b',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              width: 180,
              textAlign: 'center',
              cursor: 'pointer'
            }
          };
        });

        const formattedEdges: Edge[] = rawEdges.map((e: any, index: number) => {
          const sourceId = keyToNodeIdMap[e.source_node_key] || String(e.source_node_key);
          const targetId = keyToNodeIdMap[e.target_node_key] || String(e.target_node_key);

          return {
            id: e.id || `edge-${index}-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            animated: true,
            style: { stroke: '#059669', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' }
          };
        });

        setNodes(formattedNodes);
        setEdges(formattedEdges);
      }
    } catch (err) {
      setError('Failed to render course knowledge graph.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.data?.rawNodeData) {
      setSelectedNode(node.data.rawNodeData as NodeData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
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
            <button 
              onClick={() => router.push('/instructor/courses')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition text-left"
            >
              <BookOpen size={16} /> Manage Courses
            </button>
            <button 
              onClick={() => router.push('/instructor/courses')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-medium transition text-left"
            >
              <Upload size={16} /> Upload Material
            </button>
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
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/instructor')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition bg-slate-100 px-3 py-1.5 rounded-xl"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              INSTRUCTOR / COURSE GRAPH
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchCourseData} 
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
              title="Refresh Graph"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-xs gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Loading Knowledge Graph...
            </div>
          ) : (
            <>
              {/* Header Info */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold text-slate-900">{course?.title}</h1>
                  <p className="text-xs text-slate-500">{course?.description || 'Knowledge graph node relationships.'}</p>
                </div>
              </div>

              {/* Main Graph & Detail Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[480px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Knowledge Graph Canvas</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                      Click Node to View Details
                    </span>
                  </div>

                  <div className="w-full h-[400px] bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onNodeClick={onNodeClick}
                      fitView
                    >
                      <Background color="#cbd5e1" gap={16} size={1} />
                      <Controls />
                    </ReactFlow>
                  </div>
                </div>

                {/* Node Detail Inspector */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                  {selectedNode ? (
                    <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-900">{selectedNode.title}</h3>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={16} />
                        </button>
                      </div>

                      {/* Rendered with ReactMarkdown */}
                      {selectedNode.summary && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Summary</span>
                          <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 prose prose-slate prose-xs max-w-none">
                            <ReactMarkdown>{selectedNode.summary}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {(selectedNode.youtube_url || selectedNode.video_url) && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <PlayCircle size={14} className="text-emerald-600" /> Embedded Video
                          </span>
                          {getEmbedYoutubeUrl(selectedNode.youtube_url || selectedNode.video_url, selectedNode.youtube_timestamp_seconds) ? (
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200">
                              <iframe
                                src={getEmbedYoutubeUrl(selectedNode.youtube_url || selectedNode.video_url, selectedNode.youtube_timestamp_seconds)!}
                                title="Node Video"
                                className="w-full h-full"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <a 
                              href={selectedNode.youtube_url || selectedNode.video_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs text-emerald-600 underline font-medium"
                            >
                              Open External Resource
                            </a>
                          )}
                        </div>
                      )}

                      {selectedNode.quizzes && selectedNode.quizzes.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <HelpCircle size={14} className="text-indigo-600" /> Quizzes ({selectedNode.quizzes.length})
                          </span>
                          <div className="space-y-3">
                            {selectedNode.quizzes.map((quiz, qIdx) => (
                              <div key={quiz.id || qIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <p className="text-xs font-semibold text-slate-800">{quiz.question}</p>
                                <div className="space-y-1 pl-1">
                                  {quiz.options?.map((opt, oIdx) => (
                                    <div 
                                      key={oIdx} 
                                      className={`text-[11px] px-2 py-1 rounded-lg ${
                                        opt === quiz.correct_answer 
                                          ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200' 
                                          : 'text-slate-600 bg-white border border-slate-100'
                                      }`}
                                    >
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[380px] text-center text-slate-400 space-y-2">
                      <Layers size={32} strokeWidth={1.5} />
                      <p className="text-xs">Select any node on the graph to inspect its summary, embedded videos, and quiz questions.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}