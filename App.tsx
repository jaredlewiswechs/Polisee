
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Rubric, Response, Review, Reference, LedgerEvent, Domain, DeliverableType, LedgerEventType, SCHEMA_VERSION, RubricCriteria } from './types';
import { getInitialStore, saveStore, createEvent } from './services/db';
import { STARTER_TASKS, STARTER_RUBRICS } from './constants.tsx';
import { generatePolicyResponse, evaluateResponse } from './services/gemini';

// --- Icons ---
const HomeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const TasksIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const RubricsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const ReviewsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExportIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

type View = 'home' | 'tasks' | 'rubrics' | 'reviews' | 'export' | 'history';

const App: React.FC = () => {
  const [store, setStore] = useState(getInitialStore());
  const [activeView, setActiveView] = useState<View>('home');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    if (store.tasks.length === 0) {
      setStore(prev => ({
        ...prev,
        tasks: STARTER_TASKS,
        rubrics: STARTER_RUBRICS,
        ledger: [
          createEvent('CREATE_TASK', 'Task', 'system', 'Application initialized with starter templates')
        ]
      }));
    }
  }, []);

  const addEvent = (type: LedgerEventType, entityType: LedgerEvent['entity_type'], id: string, summary: string, patch: any = {}) => {
    const event = createEvent(type, entityType, id, summary, patch);
    setStore(prev => ({ ...prev, ledger: [event, ...prev.ledger] }));
  };

  const handleSaveTask = (t: Partial<Task>) => {
    if (t.id) {
      // Edit
      setStore(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => task.id === t.id ? { ...task, ...t, updated_at: Date.now() } as Task : task)
      }));
      addEvent('EDIT_TASK', 'Task', t.id, `Updated task: ${t.title}`, t);
    } else {
      // Create
      const newTask: Task = {
        id: `t-${Date.now()}`,
        title: t.title || 'Untitled Task',
        domain: t.domain || 'education',
        jurisdiction: t.jurisdiction || 'General',
        stakeholders: t.stakeholders || [],
        constraints: t.constraints || {},
        deliverable_type: t.deliverable_type || 'memo',
        difficulty: (t.difficulty as any) || 1,
        prompt_text: t.prompt_text || '',
        rubric_id: t.rubric_id,
        metadata: {},
        created_at: Date.now(),
        updated_at: Date.now()
      };
      setStore(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
      addEvent('CREATE_TASK', 'Task', newTask.id, `Created task: ${newTask.title}`, newTask);
    }
  };

  const handleCreateRubric = (r: Partial<Rubric>) => {
    const newRubric: Rubric = {
      id: `r-${Date.now()}`,
      name: r.name || 'Untitled Rubric',
      type: r.type || 'memo',
      criteria: r.criteria || [],
      hard_fails: r.hard_fails || [],
      failure_modes: r.failure_modes || [],
      created_at: Date.now()
    };
    setStore(prev => ({ ...prev, rubrics: [newRubric, ...prev.rubrics] }));
    addEvent('CREATE_RUBRIC', 'Rubric', newRubric.id, `Created rubric: ${newRubric.name}`, newRubric);
  };

  const handleGenerateResponse = async (task: Task) => {
    setLoading(true);
    try {
      const text = await generatePolicyResponse(task);
      const newResponse: Response = {
        id: `res-${Date.now()}`,
        task_id: task.id,
        model_info: 'gemini-3-flash-preview',
        text,
        created_at: Date.now()
      };
      setStore(prev => ({ ...prev, responses: [newResponse, ...prev.responses] }));
      addEvent('GENERATE_RESPONSE', 'Response', newResponse.id, `Generated response for task: ${task.title}`);
      setActiveView('reviews');
    } catch (e) {
      alert("Something went wrong with the AI generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'jsonl' | 'csv') => {
    const data = JSON.stringify(store, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polisee_export_${SCHEMA_VERSION}_${Date.now()}.${format === 'jsonl' ? 'jsonl' : 'csv'}`;
    a.click();
    addEvent('EXPORT_DATASET', 'Dataset', 'all', `Exported data as ${format}`);
  };

  // --- Views ---

  const HomeView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Polisee</h1>
        <p className="text-gray-500 font-medium">System of Systems Governance</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setActiveView('tasks')} className="apple-card p-6 flex flex-col items-center justify-center space-y-2 hover:bg-white/90 active:scale-95 transition-all">
          <div className="text-blue-500"><TasksIcon /></div>
          <span className="font-semibold text-sm">Policy Lab</span>
        </button>
        <button onClick={() => setActiveView('reviews')} className="apple-card p-6 flex flex-col items-center justify-center space-y-2 hover:bg-white/90 active:scale-95 transition-all">
          <div className="text-green-500"><ReviewsIcon /></div>
          <span className="font-semibold text-sm">Evaluations</span>
        </button>
        <button onClick={() => setActiveView('rubrics')} className="apple-card p-6 flex flex-col items-center justify-center space-y-2 hover:bg-white/90 active:scale-95 transition-all">
          <div className="text-orange-500"><RubricsIcon /></div>
          <span className="font-semibold text-sm">Rulesets</span>
        </button>
        <button onClick={() => setActiveView('export')} className="apple-card p-6 flex flex-col items-center justify-center space-y-2 hover:bg-white/90 active:scale-95 transition-all">
          <div className="text-purple-500"><ExportIcon /></div>
          <span className="font-semibold text-sm">Datasets</span>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center justify-between px-1">
          Activity History
          <button onClick={() => setActiveView('history')} className="text-blue-500 text-sm font-medium hover:underline">See All</button>
        </h2>
        <div className="space-y-3">
          {store.ledger.slice(0, 5).map(event => (
            <div key={event.id} className="apple-card p-4 flex justify-between items-center text-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${event.type.includes('CREATE') ? 'bg-blue-400' : 'bg-green-400'}`} />
                <div>
                  <p className="font-bold text-gray-800 text-[10px] tracking-wider uppercase">{event.type.replace('_', ' ')}</p>
                  <p className="text-gray-600 line-clamp-1 text-xs">{event.summary}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-gray-400">{new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TasksView = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Task>>({ 
      domain: 'education', 
      deliverable_type: 'memo', 
      difficulty: 1,
      constraints: {},
      rubric_id: ''
    });

    const updateConstraint = (key: keyof Task['constraints'], value: string) => {
      setFormData({
        ...formData,
        constraints: {
          ...formData.constraints,
          [key]: value
        }
      });
    };

    const handleEdit = (task: Task) => {
      setFormData(task);
      setIsFormOpen(true);
    };

    const handleNew = () => {
      setFormData({ 
        domain: 'education', 
        deliverable_type: 'memo', 
        difficulty: 1,
        constraints: {},
        rubric_id: ''
      });
      setIsFormOpen(true);
    };

    if (isFormOpen) {
      return (
        <div className="space-y-6 pb-32 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center space-x-2 px-2">
             <button onClick={() => setIsFormOpen(false)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
             <h2 className="text-2xl font-bold">{formData.id ? 'Edit Policy Task' : 'New Policy Task'}</h2>
          </div>
          <div className="apple-card p-6 space-y-6 shadow-xl overflow-y-auto max-h-[70vh] custom-scrollbar">
            {/* Primary Details */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-50 pb-1">Primary Details</h3>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Memo Title</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="e.g. Urban Housing Initiative"
                  value={formData.title || ''}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Policy Area</label>
                  <select 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none text-sm appearance-none"
                    value={formData.domain}
                    onChange={e => setFormData({...formData, domain: e.target.value as Domain})}
                  >
                    <option value="education">Education</option>
                    <option value="climate">Climate</option>
                    <option value="housing">Housing</option>
                    <option value="intl_relations">International</option>
                    <option value="tech_regulation">Technology</option>
                  </select>
                 </div>
                 <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Deliverable</label>
                  <select 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none text-sm appearance-none"
                    value={formData.deliverable_type}
                    onChange={e => setFormData({...formData, deliverable_type: e.target.value as DeliverableType})}
                  >
                    <option value="memo">Policy Memo</option>
                    <option value="brief">Executive Brief</option>
                    <option value="stakeholder_summary">Stakeholder Summary</option>
                    <option value="options_matrix">Options Matrix</option>
                  </select>
                 </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Linked Ruleset (Rubric)</label>
                <select 
                  className="w-full bg-gray-50 rounded-xl p-3 border-none text-sm appearance-none"
                  value={formData.rubric_id}
                  onChange={e => setFormData({...formData, rubric_id: e.target.value})}
                >
                  <option value="">No specific rubric (Select during evaluation)</option>
                  {store.rubrics.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1 italic">Associating a rubric ensures consistent assessment of this specific policy task.</p>
              </div>
            </div>

            {/* Constraints Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-orange-50 pb-1">Task Constraints</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Budgetary Limits</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    placeholder="e.g. $5.2M Capital Fund"
                    value={formData.constraints?.budget || ''}
                    onChange={e => updateConstraint('budget', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Timeline / Deadline</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    placeholder="e.g. FY 2026 Quarter 2"
                    value={formData.constraints?.timeline || ''}
                    onChange={e => updateConstraint('timeline', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Legal / Regulatory Boundaries</label>
                  <textarea 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none h-20 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="e.g. Must comply with State Zoning Code Section 4."
                    value={formData.constraints?.legal_limits || ''}
                    onChange={e => updateConstraint('legal_limits', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Political Feasibility</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    placeholder="e.g. Requires 2/3 majority approval."
                    value={formData.constraints?.political_feasibility || ''}
                    onChange={e => updateConstraint('political_feasibility', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Equity & Social Impact Goals</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    placeholder="e.g. Minimum 30% benefit to disadvantaged zones."
                    value={formData.constraints?.equity_impacts || ''}
                    onChange={e => updateConstraint('equity_impacts', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Core Narrative */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-1">Task Narrative</h3>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Instructions & Context</label>
                <textarea 
                  className="w-full bg-gray-50 rounded-xl p-3 border-none h-40 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Describe the problem and the specific goal for the analyst."
                  value={formData.prompt_text || ''}
                  onChange={e => setFormData({...formData, prompt_text: e.target.value})}
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button 
                onClick={() => { handleSaveTask(formData); setIsFormOpen(false); }} 
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                {formData.id ? 'Save Changes' : 'Create Task'}
              </button>
              <button onClick={() => setIsFormOpen(false)} className="flex-1 bg-gray-100 text-gray-800 font-bold py-4 rounded-2xl active:scale-95 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-bold tracking-tight">Policy Lab</h2>
          <button onClick={handleNew} className="bg-blue-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          {store.tasks.map(task => {
            const associatedRubric = store.rubrics.find(r => r.id === task.rubric_id);
            return (
              <div key={task.id} className="apple-card p-5 space-y-3 group hover:bg-white transition-colors relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight pr-8">{task.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{task.domain}</span>
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{task.deliverable_type}</span>
                      {associatedRubric && (
                        <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center">
                          <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                          {associatedRubric.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button 
                      disabled={loading}
                      onClick={() => handleGenerateResponse(task)}
                      className="bg-blue-600 text-white p-3 rounded-xl shadow-md active:scale-90 transition-all disabled:opacity-50"
                      title="Generate Memo"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={() => handleEdit(task)}
                      className="bg-gray-100 text-gray-500 p-2.5 rounded-xl hover:bg-gray-200 active:scale-90 transition-all"
                      title="Edit Task"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2 leading-snug italic">"{task.prompt_text}"</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ReviewsView = () => {
    const latestResponses = store.responses;
    const [selectedResponse, setSelectedResponse] = useState<Response | null>(latestResponses[0] || null);
    
    // Auto-select associated rubric if available
    const taskForSelected = useMemo(() => store.tasks.find(t => t.id === selectedResponse?.task_id), [selectedResponse, store.tasks]);
    const [selectedRubricId, setSelectedRubricId] = useState<string>('');

    useEffect(() => {
      if (taskForSelected?.rubric_id) {
        setSelectedRubricId(taskForSelected.rubric_id);
      } else if (store.rubrics.length > 0 && !selectedRubricId) {
        setSelectedRubricId(store.rubrics[0].id);
      }
    }, [taskForSelected, store.rubrics]);

    const [reviewLoading, setReviewLoading] = useState(false);
    const reviewsForSelected = useMemo(() => store.reviews.filter(r => r.response_id === selectedResponse?.id), [selectedResponse, store.reviews]);

    const handleRunEvaluation = async () => {
      if (!selectedResponse || !taskForSelected) return;
      setReviewLoading(true);
      try {
        const rubric = store.rubrics.find(r => r.id === selectedRubricId) || store.rubrics[0]; 
        const evalResult = await evaluateResponse(taskForSelected, rubric, selectedResponse.text);
        const newReview: Review = {
          id: `rev-${Date.now()}`,
          response_id: selectedResponse.id,
          rubric_id: rubric.id,
          scores: evalResult.scores || {},
          hard_fail_triggered: evalResult.hard_fail_triggered || false,
          notes: evalResult.notes || '',
          limitations: evalResult.limitations || [],
          assumptions: evalResult.assumptions || [],
          rationale: evalResult.rationale || '',
          created_at: Date.now()
        };
        setStore(prev => ({ ...prev, reviews: [newReview, ...prev.reviews] }));
        addEvent('SCORE_RESPONSE', 'Review', newReview.id, `Evaluated work for task: ${taskForSelected.title}`, newReview);
      } catch (e) {
        alert("Evaluation failed. Please try again.");
      } finally {
        setReviewLoading(false);
      }
    };

    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold tracking-tight px-2">Evaluation Center</h2>
        
        {latestResponses.length === 0 ? (
          <div className="apple-card p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-gray-400">
              <ReviewsIcon />
            </div>
            <p className="text-gray-500">No work samples yet.<br/>Generate a memo in the Policy Lab first.</p>
          </div>
        ) : (
          <>
            <div className="flex space-x-2 overflow-x-auto pb-4 px-1 no-scrollbar">
              {latestResponses.map(res => (
                 <button 
                  key={res.id} 
                  onClick={() => setSelectedResponse(res)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all shadow-sm ${selectedResponse?.id === res.id ? 'bg-black text-white' : 'bg-white text-gray-400 border border-gray-100'}`}
                 >
                   ID: {res.id.split('-')[1].slice(-4)}
                 </button>
              ))}
            </div>

            {selectedResponse && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="apple-card p-6 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-4 border-b pb-3 border-gray-50">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Work Output</h3>
                    <span className="text-[10px] text-gray-400 font-mono">{new Date(selectedResponse.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="prose prose-sm text-gray-800 whitespace-pre-wrap font-serif leading-relaxed max-h-[500px] overflow-y-auto pr-2 custom-scrollbar text-[15px]">
                    {selectedResponse.text}
                  </div>
                </div>

                <div className="apple-card p-6 space-y-6 shadow-lg border border-blue-50">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">AI Quality Review</h3>
                    </div>

                    {!reviewsForSelected.length && !reviewLoading && (
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Ruleset</label>
                        <select 
                          className="w-full bg-gray-50 rounded-xl p-3 border-none text-sm appearance-none mb-2"
                          value={selectedRubricId}
                          onChange={e => setSelectedRubricId(e.target.value)}
                        >
                          <option value="">-- Select a rubric --</option>
                          {store.rubrics.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleRunEvaluation}
                          className="w-full bg-blue-600 text-white text-[10px] font-black px-5 py-4 rounded-xl uppercase tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-blue-100 shadow-md"
                        >
                          Run Assessment
                        </button>
                      </div>
                    )}
                  </div>

                  {reviewsForSelected.length === 0 && !reviewLoading && (
                    <div className="py-4 text-center">
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Ready to Grade</p>
                    </div>
                  )}

                  {reviewLoading && (
                    <div className="py-12 text-center animate-pulse">
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Running Assessment...</p>
                    </div>
                  )}

                  {reviewsForSelected.map(review => {
                    const rubric = store.rubrics.find(r => r.id === review.rubric_id);
                    return (
                      <div key={review.id} className="space-y-6 animate-in zoom-in-95 duration-300 border-t pt-6 border-gray-100">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Ruleset: {rubric?.name || 'Unknown'}</span>
                        </div>
                        <div className={`p-4 rounded-2xl flex justify-between items-center shadow-inner ${review.hard_fail_triggered ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          <div className="flex items-center space-x-3">
                             <div className={`w-3 h-3 rounded-full animate-pulse ${review.hard_fail_triggered ? 'bg-red-500' : 'bg-green-500'}`} />
                             <span className="font-black text-xs uppercase tracking-tighter">Status: {review.hard_fail_triggered ? 'REJECTED' : 'APPROVED'}</span>
                          </div>
                          <span className="text-[10px] font-mono opacity-50">#REV-{review.id.slice(-4)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(review.scores).map(([cid, score]) => (
                            <div key={cid} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Score</p>
                              <p className="text-2xl font-black text-gray-900">{score}<span className="text-gray-300 text-sm">/4</span></p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Expert Summary</h4>
                            <div className="bg-white p-4 rounded-2xl text-[13px] text-gray-600 leading-relaxed border border-gray-50 shadow-sm">
                              {review.notes || review.rationale}
                            </div>
                          </div>

                          {review.limitations.length > 0 && (
                            <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                              <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Gaps Identified</h4>
                              <ul className="space-y-1.5">
                                {review.limitations.map((l, i) => (
                                  <li key={i} className="text-xs text-red-700 flex items-start space-x-2">
                                    <span>•</span>
                                    <span>{l}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const RubricsView = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<Partial<Rubric>>({ name: '', type: 'memo', criteria: [] });
    const [newCriterion, setNewCriterion] = useState<Partial<RubricCriteria>>({ label: '', description: '' });

    const handleAddCriterion = () => {
      if (!newCriterion.label) return;
      const criterion: RubricCriteria = {
        id: `c-${Date.now()}`,
        label: newCriterion.label || '',
        description: newCriterion.description || '',
        levels: [
          { score: 0, description: 'Fails to meet requirement' },
          { score: 4, description: 'Exemplary execution' }
        ]
      };
      setFormData({ ...formData, criteria: [...(formData.criteria || []), criterion] });
      setNewCriterion({ label: '', description: '' });
    };

    if (isAdding) {
      return (
        <div className="space-y-6 pb-20 animate-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-2xl font-bold px-2">New Ruleset</h2>
          <div className="apple-card p-6 space-y-6 shadow-xl">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ruleset Name</label>
              <input 
                type="text" 
                className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="e.g. Health Policy Standards"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Criteria</label>
              {formData.criteria?.map((c, i) => (
                <div key={i} className="bg-gray-100/50 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold">{c.label}</p>
                    <p className="text-[10px] text-gray-500">{c.description}</p>
                  </div>
                  <button onClick={() => setFormData({...formData, criteria: formData.criteria?.filter((_, idx) => idx !== i)})}>
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <input 
                  type="text" 
                  className="w-full bg-white rounded-xl p-2 border-none text-xs"
                  placeholder="Criterion Name (e.g. Legal Accuracy)"
                  value={newCriterion.label}
                  onChange={e => setNewCriterion({ ...newCriterion, label: e.target.value })}
                />
                <input 
                  type="text" 
                  className="w-full bg-white rounded-xl p-2 border-none text-xs"
                  placeholder="Detailed description..."
                  value={newCriterion.description}
                  onChange={e => setNewCriterion({ ...newCriterion, description: e.target.value })}
                />
                <button 
                  onClick={handleAddCriterion}
                  className="w-full bg-blue-100 text-blue-600 text-[10px] font-black py-2 rounded-xl uppercase tracking-widest"
                >
                  Add Criterion
                </button>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button 
                onClick={() => { handleCreateRubric(formData); setIsAdding(false); }} 
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Save Ruleset
              </button>
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-gray-100 text-gray-800 font-bold py-4 rounded-2xl active:scale-95 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-bold tracking-tight">Rulesets</h2>
          <button onClick={() => setIsAdding(true)} className="bg-orange-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          {store.rubrics.map(rubric => (
            <div key={rubric.id} className="apple-card p-6 space-y-5 border border-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{rubric.name}</h3>
                  <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mt-2 inline-block">Standards</span>
                </div>
                <span className="text-[10px] font-mono text-gray-300 uppercase">{rubric.criteria.length} Criteria</span>
              </div>
              <div className="space-y-3">
                {rubric.criteria.map(c => (
                  <div key={c.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="font-black text-xs text-gray-800 uppercase tracking-tight">{c.label}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ExportView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold tracking-tight px-2">Download Center</h2>
      <div className="apple-card p-8 text-center space-y-6 border border-gray-100 shadow-xl">
        <div className="mx-auto w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 shadow-inner">
          <ExportIcon />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Export All Data</h3>
          <p className="text-sm text-gray-500 mt-1">Download your tasks, responses, and evaluations for reporting or sharing.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 pt-4">
          <button 
            onClick={() => handleExport('jsonl')} 
            className="bg-black text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            Download JSON (Advanced)
          </button>
          <button 
            onClick={() => handleExport('csv')} 
            className="bg-gray-100 text-gray-800 font-black text-xs uppercase tracking-widest py-4 rounded-2xl active:scale-95 transition-all"
          >
            Download CSV (Standard)
          </button>
        </div>
      </div>
    </div>
  );

  const HistoryView = () => (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
       <div className="flex items-center space-x-3 px-2">
         <button onClick={() => setActiveView('home')} className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
         <h2 className="text-2xl font-bold tracking-tight">Full History</h2>
       </div>
       <div className="space-y-4">
         {store.ledger.map(event => (
           <div key={event.id} className="apple-card p-5 space-y-3 border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center">
               <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">{event.type.replace('_', ' ')}</span>
               <span className="text-[10px] font-mono text-gray-400">{new Date(event.ts).toLocaleString()}</span>
             </div>
             <p className="text-sm font-bold text-gray-800 leading-tight">{event.summary}</p>
           </div>
         ))}
       </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 px-4 pt-8 safe-bottom">
      
      <main className="transition-all duration-300">
        {activeView === 'home' && <HomeView />}
        {activeView === 'tasks' && <TasksView />}
        {activeView === 'rubrics' && <RubricsView />}
        {activeView === 'reviews' && <ReviewsView />}
        {activeView === 'export' && <ExportView />}
        {activeView === 'history' && <HistoryView />}
      </main>

      {/* Nav Bar */}
      <nav className="fixed bottom-6 left-4 right-4 max-w-md mx-auto h-16 bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/40 flex items-center justify-around px-2 z-50 transition-transform animate-in slide-in-from-bottom-8 duration-500">
        <NavButton active={activeView === 'home'} onClick={() => setActiveView('home')} icon={<HomeIcon />} />
        <NavButton active={activeView === 'tasks'} onClick={() => setActiveView('tasks')} icon={<TasksIcon />} />
        <NavButton active={activeView === 'reviews'} onClick={() => setActiveView('reviews')} icon={<ReviewsIcon />} />
        <NavButton active={activeView === 'rubrics'} onClick={() => setActiveView('rubrics')} icon={<RubricsIcon />} />
        <NavButton active={activeView === 'export'} onClick={() => setActiveView('export')} icon={<ExportIcon />} />
      </nav>

      {/* Global Loading */}
      {loading && activeView !== 'reviews' && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="apple-card p-8 flex flex-col items-center space-y-4 shadow-2xl scale-110">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
             <p className="text-xs font-black uppercase tracking-widest text-blue-600">AI is Writing Memo...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center active:scale-90 ${active ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {icon}
  </button>
);

export default App;
