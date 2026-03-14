import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentId, AgentMemory, SessionEntry, IMemoryStore } from '@jam/core';

const VALID_AGENT_ID = /^[a-zA-Z0-9_-]+$/;

/** Session JSONL files older than this are pruned on append */
const SESSION_RETENTION_DAYS = 180;

export class FileMemoryStore implements IMemoryStore {
  /** Tracks last prune time per agent to avoid running on every append */
  private readonly lastPruneTime = new Map<AgentId, number>();
  /** Minimum interval between prune checks (24 hours) */
  private static readonly PRUNE_INTERVAL_MS = 24*60 * 60 * 1000;

  constructor(private baseDir: string) {}

  private validateAgentId(agentId: AgentId): void {
    if (!VALID_AGENT_ID.test(agentId)) {
      throw new Error(`Invalid agentId: ${agentId}`);
    }
  }

  async load(agentId: AgentId): Promise<AgentMemory | null> {
    this.validateAgentId(agentId);
    const filePath = join(this.baseDir, agentId, 'memory.json');
    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw) as AgentMemory;
    } catch {
      return null;
    }
  }

  async save(agentId: AgentId, memory: AgentMemory): Promise<void> {
    this.validateAgentId(agentId);
    const dir = join(this.baseDir, agentId);
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, 'memory.json');
    const tmpPath = `${filePath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(memory, null, 2), 'utf-8');
    await rename(tmpPath, filePath);
  }

  async appendSession(
    agentId: AgentId,
    entry: SessionEntry,
  ): Promise<void> {
    this.validateAgentId(agentId);
    const dir = join(this.baseDir, agentId, 'sessions');
    await mkdir(dir, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    const filePath = join(dir, `${today}.jsonl`);
    const line = JSON.stringify(entry) + '\n';

    const { appendFile } = await import('node:fs/promises');
    await appendFile(filePath, line, 'utf-8');

    // Opportunistic pruning — at most once per PRUNE_INTERVAL_MS per agent
    const now = Date.now();
    const lastPrune = this.lastPruneTime.get(agentId) ?? 0;
    if (now - lastPrune > FileMemoryStore.PRUNE_INTERVAL_MS) {
      this.lastPruneTime.set(agentId, now);
      this.pruneSessions(dir).catch(() => {});
    }
  }

  /** Delete session files older than SESSION_RETENTION_DAYS */
  private async pruneSessions(dir: string): Promise<void> {
    const { readdir, unlink } = await import('node:fs/promises');
    try {
      const files = await readdir(dir);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - SESSION_RETENTION_DAYS);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const dateStr = file.replace('.jsonl', '');
        if (dateStr < cutoffStr) {
          await unlink(join(dir, file));
        }
      }
    } catch {
      // Non-critical — pruning will retry next interval
    }
  }

  async getSessionHistory(
    agentId: AgentId,
    limit = 100,
  ): Promise<SessionEntry[]> {
    this.validateAgentId(agentId);
    const { readdir } = await import('node:fs/promises');
    const dir = join(this.baseDir, agentId, 'sessions');

    try {
      const files = await readdir(dir);
      const jsonlFiles = files
        .filter((f) => f.endsWith('.jsonl'))
        .sort()
        .reverse();

      const entries: SessionEntry[] = [];

      for (const file of jsonlFiles) {
        if (entries.length >= limit) break;

        const content = await readFile(join(dir, file), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        for (const line of lines.reverse()) {
          if (entries.length >= limit) break;
          try {
            entries.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }
      }

      return entries;
    } catch {
      return [];
    }
  }
}
