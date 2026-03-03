import type { IPortAllocator } from '@jam/core';
import { createLogger } from '@jam/core';

const log = createLogger('PortAllocator');

/**
 * Allocates host port ranges for Docker containers.
 * Each agent gets a block of ports mapped to a fixed container port range (3000+).
 *
 * Robust against reclaim/release gaps: always checks for overlaps before allocating.
 */
export class PortAllocator implements IPortAllocator {
  private allocations = new Map<string, { hostStart: number; containerStart: number; count: number }>();

  constructor(
    private readonly basePort: number = 10_000,
    private readonly portsPerAgent: number = 20,
    private readonly containerBasePort: number = 3000,
  ) {}

  /**
   * Allocate a port range for an agent.
   * Scans for the first non-overlapping slot to avoid conflicts with
   * reclaimed allocations that may use different port counts.
   */
  allocate(agentId: string): { hostStart: number; containerStart: number; count: number } {
    const existing = this.allocations.get(agentId);
    if (existing) return existing;

    // Find the first slot whose range doesn't overlap any existing allocation
    let slot = 0;
    let hostStart: number;
    const MAX_SLOTS = 100; // safety limit

    do {
      hostStart = this.basePort + slot * this.portsPerAgent;
      if (!this.overlapsExisting(hostStart, this.portsPerAgent)) break;
      slot++;
    } while (slot < MAX_SLOTS);

    const allocation = {
      hostStart,
      containerStart: this.containerBasePort,
      count: this.portsPerAgent,
    };

    this.allocations.set(agentId, allocation);

    log.info(
      `Allocated ports ${hostStart}-${hostStart + this.portsPerAgent - 1} ` +
        `→ container ${this.containerBasePort}-${this.containerBasePort + this.portsPerAgent - 1} ` +
        `for agent ${agentId} (slot ${slot})`,
    );

    return allocation;
  }

  /** Check if a candidate range [start, start+count) overlaps any existing allocation */
  private overlapsExisting(start: number, count: number): boolean {
    const end = start + count;
    for (const alloc of this.allocations.values()) {
      const allocEnd = alloc.hostStart + alloc.count;
      // Two ranges overlap if one starts before the other ends
      if (start < allocEnd && alloc.hostStart < end) return true;
    }
    return false;
  }

  /** Reclaim an allocation from an existing container's actual port mappings.
   *  Uses the lowest mapped container and host ports to reconstruct the range. */
  reclaim(agentId: string, actualMappings: Map<number, number>): void {
    if (actualMappings.size === 0) {
      // No port mappings — fall back to computed allocation
      this.allocate(agentId);
      return;
    }

    // Find the lowest container port and its host port
    let minContainer = Infinity;
    let minHost = Infinity;
    for (const [containerPort, hostPort] of actualMappings) {
      if (containerPort < minContainer) {
        minContainer = containerPort;
        minHost = hostPort;
      }
    }

    const allocation = {
      hostStart: minHost,
      containerStart: minContainer,
      count: actualMappings.size,
    };

    this.allocations.set(agentId, allocation);

    log.info(
      `Reclaimed ports ${allocation.hostStart}-${allocation.hostStart + allocation.count - 1} ` +
        `→ container ${allocation.containerStart}-${allocation.containerStart + allocation.count - 1} ` +
        `for agent ${agentId}`,
    );
  }

  /** Release a port allocation when an agent's container is removed */
  release(agentId: string): void {
    this.allocations.delete(agentId);
  }

  /** Resolve a container port to its mapped host port for a specific agent */
  resolveHostPort(agentId: string, containerPort: number): number | undefined {
    const alloc = this.allocations.get(agentId);
    if (!alloc) return undefined;

    const offset = containerPort - alloc.containerStart;
    if (offset < 0 || offset >= alloc.count) return undefined;

    return alloc.hostStart + offset;
  }

  /** Build Docker -p flag mappings for an agent's allocation */
  buildPortMappings(agentId: string): Array<{ hostPort: number; containerPort: number }> {
    const alloc = this.allocate(agentId);
    const mappings: Array<{ hostPort: number; containerPort: number }> = [];

    for (let i = 0; i < alloc.count; i++) {
      mappings.push({
        hostPort: alloc.hostStart + i,
        containerPort: alloc.containerStart + i,
      });
    }

    return mappings;
  }
}
