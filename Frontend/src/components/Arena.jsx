import React, { useState, useEffect } from 'react';
import Header from './ArenaHeader';
import WorkspaceLeft from './WorkspaceLeft';
import WorkspaceRight from './WorkspaceRight';
import api from '../api';
import {  ShieldAlert } from 'lucide-react';
export default function Arena() {
  const [cheatWarning, setCheatWarning] = useState(null);
  const [leftWidth, setLeftWidth]       = useState(50);
  const [isDragging, setIsDragging]     = useState(false);
  const [isContestOver, setIsContestOver] = useState(false);
  const [activeTab, setActiveTab]       = useState('A');
  const [problems, setProblems]         = useState([]);

  // Load problems once on mount (shared between Left and Right workspaces)
  useEffect(() => {
    api.get('/problems/contest')
      .then(({ data }) => setProblems(data.data || []))
      .catch(() => {});
  }, []);

  // Anti-cheat: report events to API and show local warning
  const reportCheatEvent = (eventType, details) => {
    setCheatWarning(details);
    api.post('/anticheat/event', { eventType, details }).catch(() => {});
  };

  // Anti-cheat: browser focus / visibility guards
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportCheatEvent('tab_switch', 'Violation: You switched tabs or minimized the browser.');
      }
    };

    const handleBlur = () => {
      reportCheatEvent('window_blur', 'Violation: The contest window lost focus.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Resizable pane drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 80) setLeftWidth(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans select-none overflow-hidden">
      {cheatWarning && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100 animate-in fade-in zoom-in duration-300">
            <div className="bg-red-600 p-6 flex justify-center">
              <div className="bg-white/20 p-3 rounded-full animate-pulse">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">SECURITY ALERT</h2>
              <div className="inline-block px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest rounded-full mb-6 border border-red-100">
                Action Logged on Server
              </div>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed italic">
                "{cheatWarning}"
              </p>
              <button 
                onClick={() => setCheatWarning(null)} 
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-200 active:scale-95"
              >
                <span>ACKNOWLEDGE & RESUME</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <Header isContestOver={isContestOver} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel — Problem Statement */}
        <div
          style={{ width: `${leftWidth}%` }}
          className={`flex flex-col bg-white border-r border-slate-200 ${isDragging ? 'pointer-events-none' : ''}`}
        >
          <WorkspaceLeft
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            problems={problems}
          />
        </div>

        {/* Drag Handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          className={`w-1.5 cursor-col-resize z-10 transition-colors flex-shrink-0 flex items-center justify-center ${
            isDragging ? 'bg-[#00629b]' : 'bg-transparent hover:bg-slate-300'
          }`}
        >
          <div className="w-0.5 h-8 bg-slate-300 rounded-full" />
        </div>

        {/* Right Panel — Code Editor */}
        <div
          style={{ width: `${100 - leftWidth}%` }}
          className={`flex flex-col bg-white ${isDragging ? 'pointer-events-none' : ''}`}
        >
          <WorkspaceRight
            activeTab={activeTab}
            problems={problems}
            onFinalSubmit={() => setIsContestOver(true)}
          />
        </div>
      </div>
    </div>
  );
}
