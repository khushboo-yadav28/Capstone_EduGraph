'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Lock, Unlock, CheckCircle2 } from 'lucide-react';

export default function ConceptNode({ data }: any) {
  const isCompleted = data.is_completed;
  const isUnlocked = data.is_unlocked;

  let bgStyles = 'bg-white border-[#e2eae4] text-slate-400';
  let icon = <Lock size={16} className="text-slate-400 shrink-0" />;
  let badgeText = 'Locked';
  let badgeBg = 'bg-[#f4f7f4] text-[#4a6b5d]';

  if (isCompleted) {
    bgStyles = 'bg-[#fbfcfb] border-[#2e5a44] text-[#112217] shadow-sm';
    icon = <CheckCircle2 size={16} className="text-[#2e5a44] shrink-0" />;
    badgeText = 'Completed';
    badgeBg = 'bg-[#d3efdc]/60 text-[#112217]';
  } else if (isUnlocked) {
    bgStyles = 'bg-[#fbfcfb] border-[#112217] text-[#112217] shadow-md ring-2 ring-[#d3efdc]/50';
    icon = <Unlock size={16} className="text-[#112217] shrink-0" />;
    badgeText = 'Available';
    badgeBg = 'bg-[#d3efdc] text-[#112217]';
  }

  return (
    <div className={`px-4 py-3 rounded-2xl border-2 w-auto max-w-[280px] min-w-[200px] transition-all ${bgStyles}`}>
      <Handle type="target" position={Position.Top} className="!bg-[#4a6b5d] !w-2.5 !h-2.5" />
      
      <div className="flex items-start gap-2 mb-2">
        {icon}
        <div className="flex-1">
          <h4 className="text-xs font-black leading-snug break-words whitespace-normal text-[#112217]">
            {data.label}
          </h4>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#e2eae4]">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${badgeBg}`}>
          {badgeText}
        </span>
        {data.question_count > 0 && (
          <span className="text-[10px] text-[#4a6b5d] font-semibold">
            {data.question_count} Qs
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#4a6b5d] !w-2.5 !h-2.5" />
    </div>
  );
}