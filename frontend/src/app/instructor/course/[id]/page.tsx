'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  HelpCircle,
  Save,
  Globe,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  Plus,
  Trash2,
  Link2,
  Sliders,
  Move
} from 'lucide-react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges,
  addEdge,
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange,
  OnConnect,
  MarkerType,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { 
  api, 
  getInstructorCourseGraph, 
  updateInstructorCourseGraph, 
  publishCourse 
} from '@/src/lib/api';

interface QuizItem {
  id: string;
  question: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
}

interface RawNodeData {
  id: string;
  node_key: string;
  title: string;
  summary?: string;
  page_references?: string[] | string;
  video_url?: string;
  youtube_url?: string;
  youtube_timestamp_seconds?: number;
  position_x?: number;
  position_y?: number;
  quizzes?: QuizItem[];
}

export default function InstructorCourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  // Course & Data States
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseDesc, setCourseDesc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // React Flow Canvas States
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Selected Node State for Editing
  const [selectedNode, setSelectedNode] = useState<RawNodeData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [inspectorTab, setInspectorTab] = useState<'edit' | 'preview' | 'quizzes'>('edit');

  // Fetch Knowledge Graph from Backend (GET /courses/instructor/{course_id}/graph)
  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setStatusMessage(null);

      const graphData = await getInstructorCourseGraph(courseId);

      setCourseTitle(graphData.course_title || 'Untitled Curriculum');
      setCourseDesc(graphData.course_description || '');

      const rawNodes: RawNodeData[] = graphData.nodes || [];
      const rawEdges = graphData.edges || [];

      const keyToNodeIdMap: Record<string, string> = {};
      const idToKeyMap: Record<string, string> = {};

      const formattedNodes: Node[] = rawNodes.map((n, index) => {
        const reactFlowNodeId = String(n.id || n.node_key || `node-${index}`);
        const nodeKey = n.node_key || `k_${index}`;
        keyToNodeIdMap[nodeKey] = reactFlowNodeId;
        idToKeyMap[reactFlowNodeId] = nodeKey;

        const posX = n.position_x ?? (150 + (index % 3) * 260);
        const posY = n.position_y ?? (100 + Math.floor(index / 3) * 160);

        return {
          id: reactFlowNodeId,
          data: { 
            label: n.title || nodeKey,
            nodeKey: nodeKey,
            rawNodeData: n 
          },
          position: { x: posX, y: posY },
          style: {
            background: '#ffffff',
            border: '2px solid #112217',
            borderRadius: '20px',
            padding: '12px 18px',
            fontSize: '11px',
            fontWeight: '800',
            color: '#112217',
            boxShadow: '0 4px 10px -2px rgba(17, 34, 23, 0.08)',
            width: 210,
            textAlign: 'center',
            cursor: 'grab'
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
          style: { stroke: '#2e5a44', strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2e5a44' }
        };
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      setHasUnsavedChanges(false);

      if (formattedNodes.length > 0 && !selectedNode) {
        const first = formattedNodes[0].data?.rawNodeData as RawNodeData;
        setSelectedNode(first);
        setEditTitle(first.title);
        setEditSummary(first.summary || '');
      }
    } catch (err: any) {
      console.error('Failed to load instructor course graph:', err);
      setStatusMessage({ 
        type: 'error', 
        text: 'Failed to load course knowledge graph. Ensure you are authorized as instructor.' 
      });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Node position drag change handler
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Edge changes handler
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Connect new prerequisite edge
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({
        ...connection,
        animated: true,
        style: { stroke: '#2e5a44', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2e5a44' }
      }, eds));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Click on node in canvas
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.data?.rawNodeData) {
      const raw = node.data.rawNodeData as RawNodeData;
      setSelectedNode(raw);
      setEditTitle(raw.title);
      setEditSummary(raw.summary || '');
    }
  };

  // Sync edits from sidebar to local nodes state
  const handleApplyNodeTextEdit = () => {
    if (!selectedNode) return;

    setNodes((currentNodes) =>
      currentNodes.map((n) => {
        if (n.id === selectedNode.id || n.data?.nodeKey === selectedNode.node_key) {
          return {
            ...n,
            data: {
              ...n.data,
              label: editTitle,
              rawNodeData: {
                ...(n.data.rawNodeData as any),
                title: editTitle,
                summary: editSummary
              }
            }
          };
        }
        return n;
      })
    );

    setSelectedNode((prev) => prev ? { ...prev, title: editTitle, summary: editSummary } : null);
    setHasUnsavedChanges(true);
    setStatusMessage({ type: 'success', text: 'Node changes staged in editor. Click "Save Graph Layout" to commit.' });
  };

  // PUT /courses/instructor/{course_id}/graph
  const handleSaveGraphLayout = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      const nodeIdToKeyMap = new Map<string, string>();
      nodes.forEach((n) => {
        const raw = n.data?.rawNodeData as RawNodeData;
        const key = raw?.node_key || (n.data?.nodeKey as string) || n.id;
        nodeIdToKeyMap.set(n.id, key);
      });

      const payloadNodes = nodes.map((n) => {
        const raw = (n.data?.rawNodeData as RawNodeData) || {};
        return {
          id: raw.id || n.id,
          node_key: raw.node_key || nodeIdToKeyMap.get(n.id) || n.id,
          title: (n.data?.label as string) || raw.title,
          summary: raw.summary || '',
          position_x: Number(n.position.x),
          position_y: Number(n.position.y)
        };
      });

      const payloadEdges = edges.map((e) => ({
        source_node_key: nodeIdToKeyMap.get(e.source) || e.source,
        target_node_key: nodeIdToKeyMap.get(e.target) || e.target
      }));

      await updateInstructorCourseGraph(courseId, {
        course_title: courseTitle,
        course_description: courseDesc,
        nodes: payloadNodes,
        edges: payloadEdges
      });

      setHasUnsavedChanges(false);
      setStatusMessage({ type: 'success', text: 'Graph node layouts and links saved successfully!' });
    } catch (err: any) {
      console.error('Failed to save instructor graph:', err);
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to update graph layout on backend.' 
      });
    } finally {
      setSaving(false);
    }
  };

  // PUT /courses/{course_id}/publish
  const handlePublishCourse = async () => {
    if (hasUnsavedChanges) {
      const confirmSave = confirm('You have unsaved layout modifications. Would you like to save them first before publishing?');
      if (confirmSave) {
        await handleSaveGraphLayout();
      }
    }

    setPublishing(true);
    setStatusMessage(null);
    try {
      await publishCourse(courseId);
      setStatusMessage({ type: 'success', text: 'Course published successfully! It is now accessible to all students.' });
    } catch (err: any) {
      console.error('Failed to publish course:', err);
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to publish course.' 
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f7f4] text-[#1e2923] overflow-hidden selection:bg-[#2e5a44] selection:text-white">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e2eae4] p-6 flex flex-col justify-between hidden md:flex shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-2xl bg-[#112217] text-white flex items-center justify-center font-bold shadow-md">
              <Network size={20} />
            </div>
            <h1 className="text-base font-black tracking-tight text-[#112217]">
              EduGraph <span className="text-[#2e5a44]">Editor</span>
            </h1>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => router.push('/instructor/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#d3efdc]/50 text-[#112217] rounded-2xl text-xs font-bold transition text-left cursor-pointer shadow-sm"
            >
              <BookOpen size={16} className="text-[#2e5a44]" /> Manage Courses & Drafts
            </button>
            <button 
              onClick={() => router.push('/instructor/courses')}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition text-left cursor-pointer"
            >
              <Upload size={16} /> Fast Ingest Material
            </button>
            <button 
              onClick={() => router.push(`/student/course/${courseId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#4a6b5d] hover:bg-[#f4f7f4] hover:text-[#112217] rounded-2xl text-xs font-semibold transition text-left cursor-pointer"
            >
              <Eye size={16} /> Student Preview
            </button>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition px-3 py-2 rounded-xl hover:bg-rose-50 w-fit cursor-pointer"
        >
          <LogOut size={15} /> Logout
        </button>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-[#e2eae4] px-8 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/instructor/dashboard')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#4a6b5d] hover:text-[#112217] transition bg-[#f4f7f4] px-4 py-2.5 rounded-2xl border border-[#e2eae4] cursor-pointer shadow-sm"
            >
              <ArrowLeft size={14} /> Back to Drafts
            </button>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2e5a44] flex items-center gap-1">
                <Sliders size={12} /> ADVANCED GRAPH EDITOR
              </span>
              <h2 className="text-sm font-black text-[#112217] truncate max-w-sm">
                {courseTitle || 'Curriculum Workspace'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold animate-pulse">
                Unsaved Canvas Layout
              </span>
            )}

            <button 
              onClick={handleSaveGraphLayout}
              disabled={saving}
              className="px-4 py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Graph Layout'}</span>
            </button>

            <button 
              onClick={handlePublishCourse}
              disabled={publishing}
              className="px-4 py-2.5 bg-[#2e5a44] text-white rounded-2xl text-xs font-bold hover:bg-[#244735] transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Globe size={14} />
              <span>{publishing ? 'Publishing...' : 'Publish Course'}</span>
            </button>

            <button 
              onClick={fetchCourseData} 
              className="w-10 h-10 rounded-2xl bg-[#f4f7f4] border border-[#e2eae4] flex items-center justify-center text-[#4a6b5d] hover:bg-[#d3efdc]/40 transition shadow-sm cursor-pointer"
              title="Reset & Sync Graph"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Status Toast */}
        {statusMessage && (
          <div className="px-8 pt-4">
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
              statusMessage.type === 'success' 
                ? 'bg-[#d3efdc]/80 border-[#bce8c9] text-[#112217]' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Workspace Canvas & Inspector */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6 bg-[#f4f7f4]">
          
          {/* ReactFlow Canvas Card */}
          <div className="flex-1 bg-white border border-[#e2eae4] rounded-[32px] overflow-hidden shadow-sm flex flex-col relative">
            <div className="p-4 bg-white/90 backdrop-blur-sm border-b border-[#e2eae4] flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#112217]">Interactive Canvas:</span>
                <span className="text-[11px] text-[#4a6b5d] font-medium">
                  Drag nodes to adjust layout • Drag from handle to link prerequisites
                </span>
              </div>
              <span className="text-[10px] font-bold bg-[#d3efdc]/60 text-[#112217] px-3 py-1 rounded-xl border border-[#bce8c9]">
                {nodes.length} Nodes • {edges.length} Edges
              </span>
            </div>

            <div className="flex-1 w-full h-full bg-[#f4f7f4]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-xs text-[#4a6b5d] gap-2 animate-pulse">
                  <RefreshCw size={18} className="animate-spin text-[#2e5a44]" />
                  Loading Knowledge Graph...
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Background color="#cbd5e1" gap={20} size={1} />
                  <Controls className="!bg-white !border-[#e2eae4] !rounded-2xl !shadow-md" />
                </ReactFlow>
              )}
            </div>
          </div>

          {/* Node Inspector & Editor Sidebar */}
          <div className="w-96 bg-[#fbfcfb] border border-[#e2eae4] rounded-[32px] p-6 shadow-sm flex flex-col justify-between overflow-hidden">
            {selectedNode ? (
              <div className="space-y-5 flex-1 overflow-y-auto pr-1">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#e2eae4] pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#4a6b5d]">Node Inspector</span>
                    <h3 className="text-sm font-black text-[#112217]">{selectedNode.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#f4f7f4] px-2.5 py-1 rounded-xl border border-[#e2eae4] text-[#4a6b5d]">
                    {selectedNode.node_key}
                  </span>
                </div>

                {/* Inspector Tabs */}
                <div className="flex bg-[#f4f7f4] border border-[#e2eae4] p-1 rounded-2xl gap-1">
                  <button
                    onClick={() => setInspectorTab('edit')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      inspectorTab === 'edit'
                        ? 'bg-white text-[#112217] shadow-sm'
                        : 'text-[#4a6b5d] hover:text-[#112217]'
                    }`}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setInspectorTab('preview')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      inspectorTab === 'preview'
                        ? 'bg-white text-[#112217] shadow-sm'
                        : 'text-[#4a6b5d] hover:text-[#112217]'
                    }`}
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <button
                    onClick={() => setInspectorTab('quizzes')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      inspectorTab === 'quizzes'
                        ? 'bg-white text-[#112217] shadow-sm'
                        : 'text-[#4a6b5d] hover:text-[#112217]'
                    }`}
                  >
                    <HelpCircle size={13} /> Quizzes ({selectedNode.quizzes?.length || 0})
                  </button>
                </div>

                {/* TAB 1: EDIT FORM */}
                {inspectorTab === 'edit' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4a6b5d] mb-1 uppercase tracking-wider">
                        Topic Title
                      </label>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-white border border-[#e2eae4] rounded-2xl px-3.5 py-2.5 text-xs text-[#112217] font-semibold focus:outline-none focus:ring-2 focus:ring-[#112217] shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4a6b5d] mb-1 uppercase tracking-wider">
                        Concept Summary (Markdown Supported)
                      </label>
                      <textarea 
                        rows={6}
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="w-full bg-white border border-[#e2eae4] rounded-2xl p-3 text-xs text-[#112217] focus:outline-none focus:ring-2 focus:ring-[#112217] resize-none shadow-sm leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={handleApplyNodeTextEdit}
                      className="w-full py-2.5 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md cursor-pointer"
                    >
                      Stage Node Text Changes
                    </button>
                  </div>
                )}

                {/* TAB 2: PREVIEW SUMMARY */}
                {inspectorTab === 'preview' && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#4a6b5d] block">
                      Rendered Markdown Summary
                    </span>
                    <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl text-xs text-[#1e2923] prose prose-xs max-w-none shadow-sm">
                      <ReactMarkdown>{editSummary || 'No summary text entered.'}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* TAB 3: QUIZZES */}
                {inspectorTab === 'quizzes' && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#4a6b5d] block">
                      Node Quiz Bank ({selectedNode.quizzes?.length || 0} Questions)
                    </span>
                    {selectedNode.quizzes && selectedNode.quizzes.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {selectedNode.quizzes.map((quiz, qIdx) => (
                          <div key={quiz.id || qIdx} className="p-3.5 bg-white border border-[#e2eae4] rounded-2xl space-y-2 shadow-sm">
                            <p className="text-xs font-bold text-[#112217]">{qIdx + 1}. {quiz.question}</p>
                            <div className="space-y-1">
                              {quiz.options?.map((opt, oIdx) => (
                                <div 
                                  key={oIdx} 
                                  className={`text-[10px] px-2.5 py-1 rounded-xl font-medium ${
                                    opt === quiz.correct_answer 
                                      ? 'bg-[#d3efdc] text-[#112217] font-bold border border-[#bce8c9]' 
                                      : 'text-[#4a6b5d] bg-[#f4f7f4]'
                                  }`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-white border border-[#e2eae4] rounded-2xl text-xs text-[#4a6b5d] text-center shadow-sm">
                        No quiz questions stored for this node.
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-32 space-y-3 text-[#4a6b5d]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2eae4] flex items-center justify-center mx-auto shadow-sm">
                  <Move size={20} className="text-[#2e5a44]" />
                </div>
                <p className="text-xs font-bold text-[#112217]">Select Node to Edit</p>
                <p className="text-[11px] text-[#4a6b5d] max-w-xs mx-auto">
                  Click any node on the graph canvas to modify its title, concept summary, or inspect quiz questions.
                </p>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-[#e2eae4] space-y-2">
              <button 
                onClick={handleSaveGraphLayout}
                disabled={saving}
                className="w-full py-3 bg-[#112217] text-white rounded-2xl text-xs font-bold hover:bg-[#223d2f] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>Save All Layout Changes</span>
              </button>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}