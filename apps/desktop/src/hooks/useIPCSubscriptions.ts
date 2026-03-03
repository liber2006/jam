import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { TimeoutTimer } from '@jam/core';
import type { AgentEntry } from '@/store/agentSlice';
import type { ChatMessage } from '@/store/chatSlice';
import type { SoulEntry } from '@/store/teamSlice';

// ── Renderer Diagnostics ──────────────────────────────────────────
const DIAG_PREFIX = '[Renderer Diag]';

/** Detect long tasks (>50ms) blocking the renderer main thread */
function startLongTaskObserver(): (() => void) | null {
  if (typeof PerformanceObserver === 'undefined') return null;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const dur = Math.round(entry.duration);
        if (dur > 50) {
          console.warn(`${DIAG_PREFIX} Long task detected: ${dur}ms (started at ${Math.round(entry.startTime)}ms)`);
        }
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
    return () => observer.disconnect();
  } catch {
    // longtask not supported in this environment
    return null;
  }
}

/** Simple event loop lag detector for the renderer */
function startRendererLagDetector(): () => void {
  let lastCheck = Date.now();
  const interval = setInterval(() => {
    const now = Date.now();
    const lag = now - lastCheck - 1000;
    if (lag > 200) {
      console.warn(`${DIAG_PREFIX} Renderer event loop lag: ${lag}ms`);
    }
    lastCheck = now;
  }, 1000);
  return () => clearInterval(interval);
}

/** Track IPC callback invocations per second */
function startIPCCallLogger(): { track: (name: string) => void; stop: () => void } {
  const ipcCallCounts = new Map<string, number>();
  const track = (name: string) => {
    ipcCallCounts.set(name, (ipcCallCounts.get(name) ?? 0) + 1);
  };
  const interval = setInterval(() => {
    if (ipcCallCounts.size === 0) return;
    const lines: string[] = [];
    let total = 0;
    for (const [name, count] of ipcCallCounts) {
      lines.push(`  ${name}: ${count}`);
      total += count;
    }
    console.log(`${DIAG_PREFIX} IPC callbacks in 5s: ${total} total\n${lines.join('\n')}`);
    ipcCallCounts.clear();
  }, 5000);
  return { track, stop: () => clearInterval(interval) };
}

/**
 * Subscribes to all IPC events from the main process and dispatches to Zustand store.
 * Extracted from App.tsx to keep it a pure layout component.
 *
 * Uses `useAppStore.getState()` inside callbacks to avoid dependency on store action
 * references — prevents re-subscription loops that cause 100% CPU.
 */
export function useIPCSubscriptions(enqueueTTS: (data: string) => void): void {
  useEffect(() => {
    const store = () => useAppStore.getState();
    const transcriptTimer = new TimeoutTimer();

    // Start renderer diagnostics
    const stopLongTask = startLongTaskObserver();
    const stopLagDetector = startRendererLagDetector();
    const { track: trackIPCCall, stop: stopIPCLogger } = startIPCCallLogger();
    console.log(`${DIAG_PREFIX} Diagnostics started — monitoring long tasks, event loop lag, IPC rate`);

    // Load initial agent list, then load conversation history
    const t0 = performance.now();
    window.jam.agents.list().then((agents) => {
      const agentListMs = Math.round(performance.now() - t0);
      console.log(`${DIAG_PREFIX} agents.list() returned ${agents.length} agents in ${agentListMs}ms`);

      store().setAgents(agents as AgentEntry[]);
      for (const agent of agents) {
        if (agent.status === 'running') {
          store().setAgentActive(agent.profile.id as string, true);
        }
      }

      const s = store();
      if (!s.historyLoaded && !s.isLoadingHistory) {
        s.setIsLoadingHistory(true);
        const histT0 = performance.now();
        window.jam.chat.loadHistory({ limit: 20 }).then((result) => {
          const histMs = Math.round(performance.now() - histT0);
          const totalChars = result.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
          console.log(`${DIAG_PREFIX} loadHistory() returned ${result.messages.length} messages (${totalChars} chars) in ${histMs}ms`);

          if (result.messages.length > 0) {
            const prepT0 = performance.now();
            const chatMessages: ChatMessage[] = result.messages.map((m, i) => ({
              id: `history-${m.timestamp}-${m.agentId}-${m.role}-${i}`,
              role: m.role === 'user' ? 'user' as const : 'agent' as const,
              agentId: m.agentId,
              agentName: m.agentName,
              agentRuntime: m.agentRuntime,
              agentColor: m.agentColor,
              content: m.content,
              status: 'complete' as const,
              source: (m.source ?? 'voice') as 'text' | 'voice',
              timestamp: new Date(m.timestamp).getTime(),
            }));
            store().prependMessages(chatMessages);
            const prepMs = Math.round(performance.now() - prepT0);
            console.log(`${DIAG_PREFIX} prependMessages(${chatMessages.length}) took ${prepMs}ms`);
          }
          store().setHasMoreHistory(result.hasMore);
          store().setIsLoadingHistory(false);
          store().setHistoryLoaded(true);
        }).catch(() => {
          store().setIsLoadingHistory(false);
          store().setHistoryLoaded(true);
        });
      }
    });

    // Subscribe to events from main process
    const unsubStatusChange = window.jam.agents.onStatusChange(
      ({ agentId, status }) => {
        trackIPCCall('statusChange');
        store().updateAgentStatus(agentId, status);
        if (status === 'running' || status === 'starting') {
          store().setAgentActive(agentId, true);
        } else if (status === 'stopped' || status === 'error') {
          store().setAgentActive(agentId, false);
        }
      },
    );

    const unsubCreated = window.jam.agents.onCreated(({ profile }) => {
      trackIPCCall('created');
      store().addAgent({
        profile: profile as AgentEntry['profile'],
        status: 'stopped',
        visualState: 'offline',
      });
    });

    const unsubDeleted = window.jam.agents.onDeleted(({ agentId }) => {
      trackIPCCall('deleted');
      store().removeAgent(agentId);
    });

    const unsubUpdated = window.jam.agents.onUpdated(({ agentId, profile }) => {
      trackIPCCall('updated');
      store().updateAgentProfile(agentId, profile as AgentEntry['profile']);
    });

    const unsubVisualState = window.jam.agents.onVisualStateChange(
      ({ agentId, visualState }) => {
        trackIPCCall('visualState');
        store().updateAgentVisualState(agentId, visualState as AgentEntry['visualState']);
      },
    );

    const unsubTerminalData = window.jam.terminal.onData(
      ({ agentId, output }) => {
        trackIPCCall('terminalData');
        store().appendTerminalData(agentId, output);
      },
    );

    const unsubExecuteOutput = window.jam.terminal.onExecuteOutput(
      ({ agentId, output, clear }) => {
        trackIPCCall('executeOutput');
        store().appendExecuteOutput(agentId, output, clear);
      },
    );

    const unsubTranscription = window.jam.voice.onTranscription(
      ({ text, isFinal }) => {
        trackIPCCall('transcription');
        store().setTranscript({ text, isFinal });
        if (isFinal) {
          transcriptTimer.cancelAndSet(() => {
            store().setTranscript(null);
          }, 2000);
        }
      },
    );

    const unsubVoiceState = window.jam.voice.onStateChange(
      ({ state }) => {
        trackIPCCall('voiceState');
        const s = state as 'idle' | 'capturing' | 'processing' | 'speaking';
        store().setVoiceState(s);
      },
    );

    const unsubTTSAudio = window.jam.voice.onTTSAudio(
      ({ audioData }) => {
        trackIPCCall('ttsAudio');
        if (!audioData) return;
        enqueueTTS(audioData);
      },
    );

    const unsubAcknowledged = window.jam.chat.onAgentAcknowledged(
      ({ agentId, agentName, agentRuntime, agentColor, ackText }) => {
        trackIPCCall('acknowledged');
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          agentId,
          agentName: agentName || null,
          agentRuntime: agentRuntime || null,
          agentColor: agentColor || null,
          content: ackText,
          status: 'complete',
          source: 'text',
          timestamp: Date.now(),
        };
        store().addMessage(msg);
        store().setIsProcessing(true, agentId);
      },
    );

    const unsubVoiceCommand = window.jam.chat.onVoiceCommand(
      ({ text, agentId, agentName }) => {
        trackIPCCall('voiceCommand');
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          agentId,
          agentName: agentName || null,
          agentRuntime: null,
          agentColor: null,
          content: text,
          status: 'complete',
          source: 'voice',
          timestamp: Date.now(),
        };
        store().addMessage(msg);
      },
    );

    const unsubAgentResponse = window.jam.chat.onAgentResponse(
      ({ agentId, agentName, agentRuntime, agentColor, text, error }) => {
        trackIPCCall('agentResponse');
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          agentId,
          agentName: agentName || null,
          agentRuntime: agentRuntime || null,
          agentColor: agentColor || null,
          content: text,
          status: error ? 'error' : 'complete',
          source: 'voice',
          timestamp: Date.now(),
          error,
        };
        store().addMessage(msg);
      },
    );

    const unsubAppError = window.jam.app.onError(({ message, details }) => {
      trackIPCCall('appError');
      const errorText = details ? `${message}: ${details}` : message;
      store().addMessage({
        id: crypto.randomUUID(),
        role: 'agent',
        agentId: null,
        agentName: 'System',
        agentRuntime: null,
        agentColor: '#ef4444',
        content: errorText,
        status: 'error',
        source: 'text',
        timestamp: Date.now(),
        error: errorText,
      });
    });

    const unsubProgress = window.jam.chat.onAgentProgress(
      ({ agentId, agentName, agentRuntime, agentColor, summary }) => {
        trackIPCCall('agentProgress');
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          agentId,
          agentName: agentName || null,
          agentRuntime: agentRuntime || null,
          agentColor: agentColor || null,
          content: `${agentName || 'Agent'}: ${summary}`,
          status: 'complete',
          source: 'voice',
          timestamp: Date.now(),
        };
        store().addMessage(msg);
      },
    );

    const unsubQueued = window.jam.chat.onMessageQueued(
      ({ agentName, queuePosition }) => {
        trackIPCCall('messageQueued');
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          agentId: null,
          agentName: null,
          agentRuntime: null,
          agentColor: null,
          content: `${agentName || 'Agent'} is busy — your message is queued (#${queuePosition}). It will run when the current task finishes.`,
          status: 'complete',
          source: 'text',
          timestamp: Date.now(),
        };
        store().addMessage(msg);
      },
    );

    const unsubSystemNotification = window.jam.chat.onSystemNotification(
      ({ taskId, agentId, title, success, summary }) => {
        trackIPCCall('systemNotification');
        const s = store();
        s.addNotification({
          id: crypto.randomUUID(),
          type: success ? 'task_completed' : 'task_failed',
          agentId,
          title,
          summary: summary ?? '',
          taskId,
          timestamp: Date.now(),
          read: false,
        });
        s.setIsProcessing(false);
      },
    );

    // Sandbox initialization progress
    const unsubSandboxProgress = window.jam.app.onSandboxProgress(
      ({ status, message }) => {
        trackIPCCall('sandboxProgress');
        console.log(`${DIAG_PREFIX} sandbox:progress → ${status}: ${message}`);
        store().setSandboxProgress(status as Parameters<ReturnType<typeof useAppStore.getState>['setSandboxProgress']>[0], message);
      },
    );

    // Soul evolved — global listener (clear reflecting state even when not viewing agent detail)
    const unsubSoulEvolved = window.jam.team.soul.onEvolved((data) => {
      trackIPCCall('soulEvolved');
      store().setSoul(data.agentId, data.soul as unknown as SoulEntry);
      store().setReflecting(data.agentId, false);
    });

    // System resume — reset stale renderer state after sleep/lock
    const unsubSystemResumed = window.jam.app.onSystemResumed(() => {
      trackIPCCall('systemResumed');
      window.dispatchEvent(new Event('jam:interrupt-tts'));
      window.dispatchEvent(new Event('jam:system-resumed'));
    });

    // NOTE: Task, stats, relationship, and channel subscriptions are owned by
    // their dedicated hooks (useTasks, useTeamStats, useChannels) — not here.
    // This prevents double-handling IPC events.

    return () => {
      stopLongTask?.();
      stopLagDetector();
      stopIPCLogger();
      transcriptTimer.dispose();
      unsubStatusChange();
      unsubCreated();
      unsubDeleted();
      unsubUpdated();
      unsubVisualState();
      unsubTerminalData();
      unsubExecuteOutput();
      unsubTranscription();
      unsubVoiceState();
      unsubTTSAudio();
      unsubAcknowledged();
      unsubVoiceCommand();
      unsubAgentResponse();
      unsubAppError();
      unsubProgress();
      unsubQueued();
      unsubSystemNotification();
      unsubSandboxProgress();
      unsubSoulEvolved();
      unsubSystemResumed();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enqueueTTS]);
}
