import React, { useMemo } from 'react';
import { JAM_SYSTEM_AGENT_ID } from '@jam/core';

interface RelationshipGraphProps {
  agents: Array<{ id: string; name: string; color: string }>;
  relationships: Array<{
    sourceAgentId: string;
    targetAgentId: string;
    trustScore: number;
  }>;
  onSelectAgent: (agentId: string) => void;
}

function getTrustColor(trust: number): string {
  if (trust > 0.7) return '#22c55e';
  if (trust >= 0.4) return '#eab308';
  return '#ef4444';
}

function getTrustWidth(trust: number): number {
  return 1 + trust * 2;
}

/** Minimum arc-distance between adjacent node centers */
const NODE_SLOT = 70;
/** Padding around SVG edges */
const PADDING = 50;

export const RelationshipGraph = React.memo(function RelationshipGraph({
  agents,
  relationships,
  onSelectAgent,
}: RelationshipGraphProps) {
  const n = agents.length;

  // Order: JAM first (top of circle), then the rest in their original order
  const ordered = useMemo(() => {
    const jam = agents.find((a) => a.id === JAM_SYSTEM_AGENT_ID);
    const rest = agents.filter((a) => a.id !== JAM_SYSTEM_AGENT_ID);
    return jam ? [jam, ...rest] : rest;
  }, [agents]);

  // Radius scales with agent count so adjacent nodes stay ≥ NODE_SLOT apart
  // Arc between neighbours = 2πR / n  ≥  NODE_SLOT  →  R ≥ n·NODE_SLOT / 2π
  const radius = Math.max(90, Math.min(220, (n * NODE_SLOT) / (2 * Math.PI)));

  const size = (radius + PADDING) * 2;
  const cx = size / 2;
  const cy = size / 2;

  // Place every agent on one circle; index 0 (JAM) sits at 12 o'clock
  const positions = useMemo(() => {
    return ordered.map((agent, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return {
        ...agent,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [ordered, n, cx, cy, radius]);

  const positionMap = useMemo(
    () => new Map(positions.map((a) => [a.id, a])),
    [positions],
  );

  return (
    <div className="flex justify-center p-4">
      <svg width={size} height={size} className="overflow-visible">
        {/* Relationship edges */}
        {relationships.map((rel) => {
          const source = positionMap.get(rel.sourceAgentId);
          const target = positionMap.get(rel.targetAgentId);
          if (!source || !target) return null;
          return (
            <line
              key={`${rel.sourceAgentId}-${rel.targetAgentId}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={getTrustColor(rel.trustScore)}
              strokeWidth={getTrustWidth(rel.trustScore)}
              opacity={0.5}
            />
          );
        })}

        {/* Nodes */}
        {positions.map((agent) => {
          const isJam = agent.id === JAM_SYSTEM_AGENT_ID;
          const outerR = isJam ? 24 : 18;
          const innerR = isJam ? 16 : 12;

          return (
            <g
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className="cursor-pointer"
            >
              <circle
                cx={agent.x}
                cy={agent.y}
                r={outerR}
                fill={agent.color}
                opacity={0.15}
                stroke={agent.color}
                strokeWidth={2}
              />
              <circle cx={agent.x} cy={agent.y} r={innerR} fill={agent.color} />
              <text
                x={agent.x}
                y={agent.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={isJam ? 9 : 9}
                fontWeight="bold"
              >
                {isJam ? 'JAM' : agent.name.charAt(0).toUpperCase()}
              </text>
              <text
                x={agent.x}
                y={agent.y + (isJam ? 30 : 26)}
                textAnchor="middle"
                fill="#d4d4d8"
                fontSize={10}
              >
                {agent.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});
