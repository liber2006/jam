import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore } from '@/store';
import { AgentAvatarContainer } from './AgentAvatarContainer';
import { AgentChatContainer } from './AgentChatContainer';

export const AgentStageContainer: React.FC = () => {
  const activeAgentIds = useAppStore((s) => s.activeAgentIds);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);

  // Use compact layout when many agents are shown
  const isCompact = activeAgentIds.length > 2;

  const gridClass =
    activeAgentIds.length === 1
      ? 'grid-cols-1'
      : activeAgentIds.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 xl:grid-cols-3';

  if (activeAgentIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-zinc-700">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" />
              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">
            No active agents. Start an agent from the sidebar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className={`grid ${gridClass} gap-3 auto-rows-[minmax(280px,1fr)]`}>
        <AnimatePresence mode="popLayout">
          {activeAgentIds.map((agentId) => (
            <motion.div
              key={agentId}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`
                flex flex-col rounded-xl border bg-zinc-900/60 overflow-hidden
                ${selectedAgentId === agentId ? 'border-blue-500/40' : 'border-zinc-800'}
              `}
            >
              {/* Avatar header — compact when many agents */}
              <div className={`flex items-center ${isCompact ? 'px-3 py-2' : 'justify-center p-3'} border-b border-zinc-800/50`}>
                <AgentAvatarContainer agentId={agentId} compact={isCompact} />
              </div>

              {/* Per-agent chat */}
              <div className="flex-1 min-h-0">
                <AgentChatContainer agentId={agentId} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
