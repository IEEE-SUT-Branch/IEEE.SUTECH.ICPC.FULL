import React, { useState } from 'react';
import LobbyHeader from './LobbyHeader';
import CountdownTimer from './CountdownTimer';
import RulesPanel from './RulesPanel';
import ConnectionBox from './ConnectionBox';
import { useTime } from './TimeContext';

export default function Lobby() {
  const [agreed, setAgreed]           = useState(false);
  const { contest } = useTime();

  const isServerReady = Boolean(
    contest && (contest.status === 'running' || contest.status === 'paused')
  );
  const canEnter = agreed && isServerReady;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-slate-800">
      <LobbyHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto py-10 px-6">
        <CountdownTimer />

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <RulesPanel agreed={agreed} setAgreed={setAgreed} />
          </div>
          <div className="col-span-1">
            <ConnectionBox isServerReady={isServerReady} canEnter={canEnter} agreed={agreed} />
          </div>
        </div>
      </main>

      <footer className="py-6 text-center shrink-0">
        <div className="flex items-center justify-center space-x-4">
          <div className="h-px w-12 bg-slate-300"></div>
          <span className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">Powered By IEEE SUTECH</span>
          <div className="h-px w-12 bg-slate-300"></div>
        </div>
      </footer>
    </div>
  );
}
