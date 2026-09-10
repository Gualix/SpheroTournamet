import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Tournament, Match, Participant } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import { Trophy, ZoomIn, ZoomOut, RotateCcw, Maximize2, Sparkles, Swords } from 'lucide-react';
import { playClickSfx } from '../utils/audio';

interface RadialBracketProps {
  tournament: Tournament;
  onSelectMatch: (match: Match) => void;
  onOpenChampionModal: () => void;
  focusedMatchId?: string | null;
  isSequentialMode?: boolean;
}

interface NodePosition {
  x: number;
  y: number;
  radius: number;
  angle: number;
  participant: Participant | null;
  roundIndex: number;
  slotIndex: number;
  matchId?: string;
  isWinner?: boolean;
}

export const RadialBracket: React.FC<RadialBracketProps> = ({
  tournament,
  onSelectMatch,
  onOpenChampionModal,
  focusedMatchId,
  isSequentialMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);
  const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    tournament.participants.forEach(p => map.set(p.id, p));
    return map;
  }, [tournament.participants]);

  const champion = tournament.championId ? participantMap.get(tournament.championId) : null;

  // SVG coordinate configuration
  const SVG_SIZE = 1400;
  const CENTER = SVG_SIZE / 2;
  const totalRounds = tournament.totalRounds; // e.g. 3 for 8, 4 for 16, 5 for 32

  // Radii for each concentric round (Ring 0 = outer participants, Ring totalRounds - 1 = final)
  const ringRadii = useMemo(() => {
    const radii: number[] = [];
    const maxR = SVG_SIZE * 0.42; // ~588px
    const minR = 150; // Inner final ring
    for (let r = 0; r < totalRounds; r++) {
      // From outer ring (r=0) to inner ring (r=totalRounds-1)
      const ratio = totalRounds > 1 ? (totalRounds - 1 - r) / (totalRounds - 1) : 0;
      radii.push(minR + ratio * (maxR - minR));
    }
    return radii;
  }, [totalRounds, SVG_SIZE]);

  // Compute positions of all nodes across rounds
  // Round 0: 2^totalRounds participants at outer ring
  // Each match m in round r has two input participants/branches
  const totalParticipants = Math.pow(2, totalRounds);

  // Compute angles for every slot in every round
  // Outer slots: 0 to totalParticipants - 1
  const roundNodes = useMemo(() => {
    const rounds: NodePosition[][] = [];

    // Round 0: Initial participants placed evenly around circle
    const r0Nodes: NodePosition[] = [];
    for (let i = 0; i < totalParticipants; i++) {
      const angle = (2 * Math.PI * i) / totalParticipants - Math.PI / 2;
      const radius = ringRadii[0];
      const matchIndex = Math.floor(i / 2);
      const match = tournament.matches.find(m => m.roundIndex === 0 && m.matchIndex === matchIndex);
      const isSlot1 = i % 2 === 0;
      const participantId = isSlot1 ? match?.participant1Id : match?.participant2Id;
      const participant = participantId ? participantMap.get(participantId) || null : null;
      const isWinner = match?.winnerId === participantId && match?.status === 'completed';

      r0Nodes.push({
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        radius,
        angle,
        participant,
        roundIndex: 0,
        slotIndex: i,
        matchId: match?.id,
        isWinner,
      });
    }
    rounds.push(r0Nodes);

    // Subsequent rounds (r from 1 to totalRounds - 1)
    for (let r = 1; r < totalRounds; r++) {
      const prevNodes = rounds[r - 1];
      const currentNodes: NodePosition[] = [];
      const count = totalParticipants / Math.pow(2, r);

      for (let i = 0; i < count; i++) {
        const child1 = prevNodes[i * 2];
        const child2 = prevNodes[i * 2 + 1];

        // Midpoint angle calculation taking circular wrap into account
        let a1 = child1.angle;
        let a2 = child2.angle;
        let diff = a2 - a1;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        const angle = a1 + diff / 2;

        const radius = ringRadii[r];
        const matchIndex = Math.floor(i / 2);
        const match = tournament.matches.find(m => m.roundIndex === r && m.matchIndex === matchIndex);
        const isSlot1 = i % 2 === 0;
        const participantId = isSlot1 ? match?.participant1Id : match?.participant2Id;
        const participant = participantId ? participantMap.get(participantId) || null : null;
        const isWinner = match?.winnerId === participantId && match?.status === 'completed';

        currentNodes.push({
          x: CENTER + radius * Math.cos(angle),
          y: CENTER + radius * Math.sin(angle),
          radius,
          angle,
          participant,
          roundIndex: r,
          slotIndex: i,
          matchId: match?.id,
          isWinner,
        });
      }
      rounds.push(currentNodes);
    }

    return rounds;
  }, [totalRounds, totalParticipants, ringRadii, tournament.matches, participantMap, CENTER]);

  // Auto-fit initial zoom based on participant count
  useEffect(() => {
    if (!isSequentialMode) {
      if (totalParticipants >= 32) {
        setZoom(0.72);
      } else if (totalParticipants >= 16) {
        setZoom(0.85);
      } else {
        setZoom(0.95);
      }
      setPan({ x: 0, y: 0 });
    }
  }, [totalParticipants, isSequentialMode]);

  // Auto-focus camera pan & zoom directly to focusedMatchId in sequential mode
  useEffect(() => {
    if (!focusedMatchId) return;

    const match = tournament.matches.find(m => m.id === focusedMatchId);
    if (!match) return;

    const r = match.roundIndex;
    const mIdx = match.matchIndex;
    const rNodes = roundNodes[r];
    const node1 = rNodes?.[mIdx * 2];
    const node2 = rNodes?.[mIdx * 2 + 1];

    let targetX = CENTER;
    let targetY = CENTER;

    if (node1 && node2) {
      targetX = (node1.x + node2.x) / 2;
      targetY = (node1.y + node2.y) / 2;
    } else if (node1) {
      targetX = node1.x;
      targetY = node1.y;
    }

    // High zoom for duel intimacy
    const targetZoom = match.isFinal ? 1.45 : totalParticipants >= 32 ? 1.9 : 1.75;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const scaleRatio = Math.min(rect.width, rect.height) / SVG_SIZE;
      const targetPanX = -(targetX - CENTER) * scaleRatio * targetZoom;
      // Slight vertical offset upwards so bottom HUD doesn't occlude the active duel
      const verticalOffset = isSequentialMode ? -40 : 0;
      const targetPanY = -(targetY - CENTER) * scaleRatio * targetZoom + verticalOffset;
      setZoom(targetZoom);
      setPan({ x: targetPanX, y: targetPanY });
    } else {
      setZoom(targetZoom);
      setPan({ x: -(targetX - CENTER) * 0.5 * targetZoom, y: -(targetY - CENTER) * 0.5 * targetZoom });
    }
  }, [focusedMatchId, isSequentialMode, tournament.matches, roundNodes, CENTER, SVG_SIZE, totalParticipants]);

  // Drag and pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse button
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.45), 2.8));
  }, []);

  const resetView = () => {
    playClickSfx();
    setPan({ x: 0, y: 0 });
    setZoom(totalParticipants >= 32 ? 0.72 : totalParticipants >= 16 ? 0.85 : 0.95);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className="relative w-full h-[740px] md:h-[820px] bg-slate-900/40 rounded-3xl border border-slate-800/50 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none backdrop-blur-md shadow-2xl"
    >
      {/* Background Atmospheric Rings */}
      <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
        <div className="w-[620px] h-[620px] border border-slate-600/40 rounded-full" />
        <div className="absolute w-[420px] h-[420px] border border-cyan-500/40 rounded-full shadow-[inset_0_0_50px_rgba(6,182,212,0.25)]" />
        <div className="absolute w-[220px] h-[220px] border border-yellow-500/50 rounded-full" />
      </div>

      {/* Zoom/Pan Controls */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
        <button
          onClick={() => {
            playClickSfx();
            setZoom(z => Math.min(z * 1.15, 2.8));
          }}
          className="w-10 h-10 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-700 text-slate-200 shadow-lg backdrop-blur-md transition-colors"
          title="Acercar (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            playClickSfx();
            setZoom(z => Math.max(z * 0.85, 0.45));
          }}
          className="w-10 h-10 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-700 text-slate-200 shadow-lg backdrop-blur-md transition-colors"
          title="Alejar (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            playClickSfx();
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-10 h-10 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-700 text-slate-200 shadow-lg backdrop-blur-md transition-colors"
          title="Centrar"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-700 text-slate-200 shadow-lg backdrop-blur-md transition-colors text-[10px] font-mono font-bold"
          title="Reiniciar Vista"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Controls Tooltip Overlay */}
      <div className="absolute bottom-6 right-6 z-20 bg-slate-800/80 p-3 rounded-2xl border border-slate-700 backdrop-blur-xl flex gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Cuartos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Semifinales</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
          <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Gran Final</span>
        </div>
      </div>

      {/* Floating Instructions Tooltip on bottom left */}
      <div className="absolute bottom-6 left-6 z-20 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-slate-700 shadow-xl text-xs text-slate-300 pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Arrastra para mover • Rueda para zoom • Clic en nodo para registrar marcador</span>
      </div>

      {/* Main SVG Render Canvas */}
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="w-full h-full origin-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <defs>
          {/* Neon & Electric Filters */}
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="electric-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          <linearGradient id="semi-neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          <radialGradient id="center-podium-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.25)" />
            <stop offset="70%" stopColor="rgba(15, 23, 42, 0.85)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.98)" />
          </radialGradient>
        </defs>

        {/* Concentric Guide Circles with Subtle Degree Markings */}
        {ringRadii.map((radius, idx) => (
          <g key={`ring-${idx}`}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={radius}
              fill="none"
              stroke="rgba(148, 163, 184, 0.08)"
              strokeWidth="1.5"
              strokeDasharray={idx === ringRadii.length - 1 ? '4 4' : 'none'}
            />
            <text
              x={CENTER}
              y={CENTER - radius - 6}
              textAnchor="middle"
              fill="rgba(148, 163, 184, 0.35)"
              fontSize="11"
              fontWeight="600"
              letterSpacing="1.5"
              className="pointer-events-none uppercase"
            >
              {idx === ringRadii.length - 1
                ? '⭐ Gran Final'
                : idx === ringRadii.length - 2
                ? '⚡ Semifinales'
                : idx === ringRadii.length - 3
                ? 'Cuartos de Final'
                : `Ronda ${idx + 1}`}
            </text>
          </g>
        ))}

        {/* Connecting Curves from Outer to Inner Rounds */}
        {roundNodes.map((nodes, roundIdx) => {
          if (roundIdx >= totalRounds - 1) return null; // Last round connects to center separately
          const nextNodes = roundNodes[roundIdx + 1];

          return nodes.map((node, nodeIdx) => {
            const nextNodeIdx = Math.floor(nodeIdx / 2);
            const targetNode = nextNodes[nextNodeIdx];
            if (!targetNode) return null;

            // Match details
            const matchIndex = Math.floor(nodeIdx / 2);
            const match = tournament.matches.find(
              m => m.roundIndex === roundIdx && m.matchIndex === matchIndex
            );
            const isMatchHovered = hoveredMatchId === match?.id;
            const isWinnerBranch = node.participant && match?.winnerId === node.participant.id;
            const isParticipantHovered = hoveredParticipantId === node.participant?.id;

            const isSemifinal = match?.isSemifinal;
            const isFinal = match?.isFinal;

            // Cubic Bezier path between radial concentric nodes
            // Control points radiate inward/outward along the nodes' angles
            const midRadius = (node.radius + targetNode.radius) / 2;
            const cp1x = CENTER + midRadius * Math.cos(node.angle);
            const cp1y = CENTER + midRadius * Math.sin(node.angle);
            const cp2x = CENTER + midRadius * Math.cos(targetNode.angle);
            const cp2y = CENTER + midRadius * Math.sin(targetNode.angle);

            const pathD = `M ${node.x} ${node.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetNode.x} ${targetNode.y}`;

            // Line styling logic
            let strokeColor = 'rgba(148, 163, 184, 0.18)';
            let strokeWidth = 2.5;
            let filter = '';
            let strokeDasharray = 'none';
            let animationClass = '';

            if (isWinnerBranch) {
              strokeColor = node.participant?.animal.accentColor || '#10b981';
              strokeWidth = 4.5;
              filter = `drop-shadow(0 0 6px ${node.participant?.animal.glowColor || 'rgba(16,185,129,0.8)'})`;
            }

            if (isSemifinal) {
              if (match?.status === 'completed' && isWinnerBranch) {
                strokeColor = '#ec4899';
                strokeWidth = 5;
                filter = 'url(#glow-cyan)';
              } else {
                strokeColor = 'url(#semi-neon-grad)';
                strokeWidth = 3.5;
                animationClass = 'animate-pulse-glow';
              }
            }

            if (isMatchHovered || isParticipantHovered) {
              strokeWidth = Math.max(strokeWidth, 4);
              strokeColor = '#38bdf8';
            }

            return (
              <g key={`branch-${roundIdx}-${nodeIdx}`}>
                {/* Wider invisible hit path for easier hover/interaction */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  className="cursor-pointer"
                  onMouseEnter={() => match && setHoveredMatchId(match.id)}
                  onMouseLeave={() => setHoveredMatchId(null)}
                  onClick={() => match && onSelectMatch(match)}
                />
                {/* Visual Branch */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  filter={filter}
                  className={`transition-all duration-300 pointer-events-none ${animationClass}`}
                />
              </g>
            );
          });
        })}

        {/* Finalists to Central Trophy Lines */}
        {roundNodes[totalRounds - 1]?.map((finalNode, fIdx) => {
          const finalMatch = tournament.matches.find(m => m.isFinal);
          const isWinner = finalNode.participant && finalMatch?.winnerId === finalNode.participant.id;
          const isSemifinalsCompleted = Boolean(
            tournament.matches
              .filter(m => m.isSemifinal)
              .every(m => m.status === 'completed')
          );

          // Path directly from finalist to Center (with slight curve)
          const midR = finalNode.radius * 0.45;
          const cpX = CENTER + midR * Math.cos(finalNode.angle);
          const cpY = CENTER + midR * Math.sin(finalNode.angle);
          const finalPathD = `M ${finalNode.x} ${finalNode.y} Q ${cpX} ${cpY} ${CENTER} ${CENTER}`;

          let stroke = 'rgba(234, 179, 8, 0.35)';
          let strokeWidth = 3;
          let animClass = '';
          let filter = '';

          if (isWinner) {
            stroke = 'url(#electric-gold-grad)';
            strokeWidth = 6;
            filter = 'url(#glow-gold)';
            animClass = 'animate-electric-gold';
          } else if (isSemifinalsCompleted || finalMatch?.participant1Id || finalMatch?.participant2Id) {
            stroke = 'url(#electric-gold-grad)';
            strokeWidth = 4;
            animClass = 'animate-electric-gold';
          }

          return (
            <path
              key={`final-line-${fIdx}`}
              d={finalPathD}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={animClass ? '8 6' : 'none'}
              filter={filter}
              className={`transition-all duration-500 pointer-events-none ${animClass}`}
            />
          );
        })}

        {/* Match Controller Pills on Ring Midpoints */}
        {tournament.matches.map(match => {
          if (match.roundIndex >= totalRounds) return null;
          const rNodes = roundNodes[match.roundIndex];
          const node1 = rNodes?.[match.matchIndex * 2];
          const node2 = rNodes?.[match.matchIndex * 2 + 1];
          if (!node1 || !node2) return null;

          // Midpoint between pair
          const midX = (node1.x + node2.x) / 2;
          const midY = (node1.y + node2.y) / 2;
          const isHovered = hoveredMatchId === match.id;
          const isFocused = focusedMatchId === match.id;
          const isCompleted = match.status === 'completed';

          return (
            <g
              key={`match-pill-${match.id}`}
              transform={`translate(${midX}, ${midY})`}
              className="cursor-pointer group"
              onClick={e => {
                e.stopPropagation();
                playClickSfx();
                onSelectMatch(match);
              }}
              onMouseEnter={() => setHoveredMatchId(match.id)}
              onMouseLeave={() => setHoveredMatchId(null)}
            >
              {/* Focused match pulsating rings */}
              {isFocused && (
                <>
                  <circle
                    cx="0"
                    cy="0"
                    r="34"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    className="animate-ping opacity-60 pointer-events-none"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="28"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="animate-spin-slow pointer-events-none"
                  />
                </>
              )}

              {/* Pulsing indicator ring if in-progress or ready to play */}
              {!isFocused && match.participant1Id && match.participant2Id && !isCompleted && (
                <circle
                  cx="0"
                  cy="0"
                  r="18"
                  fill="none"
                  stroke={match.isFinal ? '#eab308' : match.isSemifinal ? '#ec4899' : '#06b6d4'}
                  strokeWidth="2"
                  className="animate-ping opacity-40 pointer-events-none"
                />
              )}

              {/* Active duel banner badge above pill */}
              {isFocused && (
                <g transform="translate(0, -22)" className="pointer-events-none">
                  <rect
                    x="-24"
                    y="-7"
                    width="48"
                    height="14"
                    rx="7"
                    fill="#06b6d4"
                    filter="drop-shadow(0 0 8px rgba(6,182,212,0.8))"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="900"
                    fill="#020617"
                    className="font-mono tracking-wider uppercase"
                  >
                    EN JUEGO
                  </text>
                </g>
              )}

              {/* Pill Background */}
              <rect
                x="-26"
                y="-13"
                width="52"
                height="26"
                rx="13"
                fill={
                  isFocused
                    ? '#0284c7'
                    : isHovered
                    ? '#1e293b'
                    : isCompleted
                    ? '#0f172a'
                    : '#1e293b'
                }
                stroke={
                  isFocused
                    ? '#38bdf8'
                    : match.isFinal
                    ? '#f59e0b'
                    : match.isSemifinal
                    ? '#ec4899'
                    : isHovered
                    ? '#38bdf8'
                    : 'rgba(148, 163, 184, 0.4)'
                }
                strokeWidth={isFocused ? '2.5' : isHovered || match.isFinal ? '2' : '1.5'}
                filter={
                  isFocused
                    ? 'drop-shadow(0 0 16px rgba(6, 182, 212, 0.9))'
                    : isHovered
                    ? 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))'
                    : 'none'
                }
                className="transition-all duration-200"
              />

              {/* Text: Score or VS */}
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={
                  isCompleted
                    ? '#f8fafc'
                    : match.isFinal
                    ? '#fbbf24'
                    : match.isSemifinal
                    ? '#f472b6'
                    : '#94a3b8'
                }
                className="select-none pointer-events-none font-mono"
              >
                {isCompleted && match.score1 !== null && match.score2 !== null
                  ? `${match.score1}-${match.score2}`
                  : 'VS'}
              </text>
            </g>
          );
        })}

        {/* Participant Nodes on All Concentric Rings */}
        {roundNodes.map((nodes, rIdx) =>
          nodes.map((node, sIdx) => {
            const participant = node.participant;
            const nodeSize = rIdx === totalRounds - 1 ? 48 : rIdx === totalRounds - 2 ? 42 : 36;
            const isHovered = hoveredParticipantId === participant?.id;
            const isWinner = node.isWinner;

            // Name label orientation & offset
            const isRightHalf = Math.cos(node.angle) >= 0;
            const labelDist = nodeSize / 2 + 10;
            const labelX = node.x + (isRightHalf ? labelDist : -labelDist);
            const labelY = node.y + 4;
            const textAnchor = isRightHalf ? 'start' : 'end';

            // Truncate name cleanly
            const displayName = participant
              ? participant.name.length > 14
                ? `${participant.name.slice(0, 13)}…`
                : participant.name
              : 'Por Definir';

            return (
              <g
                key={`node-${rIdx}-${sIdx}`}
                className="cursor-pointer group"
                onMouseEnter={() => participant && setHoveredParticipantId(participant.id)}
                onMouseLeave={() => setHoveredParticipantId(null)}
                onClick={() => {
                  if (node.matchId) {
                    const match = tournament.matches.find(m => m.id === node.matchId);
                    if (match) {
                      playClickSfx();
                      onSelectMatch(match);
                    }
                  }
                }}
              >
                {/* Outer Glow Ring for Winners */}
                {isWinner && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize / 2 + 5}
                    fill="none"
                    stroke={participant?.animal.accentColor || '#10b981'}
                    strokeWidth="2.5"
                    filter={`drop-shadow(0 0 8px ${participant?.animal.glowColor || '#10b981'})`}
                    className="animate-pulse"
                  />
                )}

                {/* Node Container (Foreign Object to render react AnimalAvatar) */}
                <foreignObject
                  x={node.x - nodeSize / 2}
                  y={node.y - nodeSize / 2}
                  width={nodeSize}
                  height={nodeSize}
                  className="overflow-visible"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {participant ? (
                      <AnimalAvatar
                        animal={participant.animal}
                        size={nodeSize}
                        isWinner={isWinner}
                        className={`transform transition-transform duration-200 ${
                          isHovered ? 'scale-125 z-30 ring-2 ring-cyan-400 shadow-xl' : ''
                        }`}
                      />
                    ) : (
                      <div
                        style={{ width: nodeSize, height: nodeSize }}
                        className="rounded-full bg-slate-900 border-2 border-dashed border-slate-700/80 flex items-center justify-center text-slate-500 font-mono text-xs"
                      >
                        ?
                      </div>
                    )}
                  </div>
                </foreignObject>

                {/* Seed Badge */}
                {participant && rIdx === 0 && (
                  <g transform={`translate(${node.x - nodeSize / 2 - 2}, ${node.y - nodeSize / 2 - 2})`}>
                    <circle cx="0" cy="0" r="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#cbd5e1"
                      className="font-mono pointer-events-none"
                    >
                      {participant.seed}
                    </text>
                  </g>
                )}

                {/* Participant Label (Only on Outer Ring or Finalists to maintain clean aesthetics) */}
                {(rIdx === 0 || rIdx === totalRounds - 1) && participant && (
                  <g className="pointer-events-none select-none">
                    <rect
                      x={isRightHalf ? labelX - 4 : labelX - 96}
                      y={labelY - 14}
                      width="100"
                      height="20"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke={isHovered ? '#38bdf8' : 'rgba(51, 65, 85, 0.6)'}
                      strokeWidth="1"
                    />
                    <text
                      x={isRightHalf ? labelX : labelX}
                      y={labelY}
                      textAnchor={textAnchor}
                      fontSize="10"
                      fontWeight="600"
                      fill={isHovered ? '#38bdf8' : '#e2e8f0'}
                      className="font-sans"
                    >
                      {displayName}
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}

        {/* Center Podium & Trophy Area */}
        <g
          transform={`translate(${CENTER}, ${CENTER})`}
          className="cursor-pointer group"
          onClick={() => {
            if (champion) {
              playClickSfx();
              onOpenChampionModal();
            } else {
              const finalMatch = tournament.matches.find(m => m.isFinal);
              if (finalMatch) {
                playClickSfx();
                onSelectMatch(finalMatch);
              }
            }
          }}
        >
          {/* Base Outer Glowing Aura */}
          <circle
            cx="0"
            cy="0"
            r="82"
            fill="url(#center-podium-grad)"
            stroke={champion ? '#eab308' : 'rgba(234, 179, 8, 0.4)'}
            strokeWidth={champion ? '3' : '2'}
            strokeDasharray={champion ? 'none' : '6 4'}
            filter={champion ? 'url(#glow-gold)' : 'none'}
            className="transition-all duration-300"
          />

          <circle
            cx="0"
            cy="0"
            r="68"
            fill="#0b1329"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1.5"
          />

          {/* If Champion crowned: Avatar Ascending with Golden Aura and Crown */}
          {champion ? (
            <g className="animate-trophy-float">
              {/* Golden Rays */}
              <circle
                cx="0"
                cy="-4"
                r="46"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="animate-spin-slow"
              />

              {/* Champion Avatar */}
              <foreignObject x="-30" y="-34" width="60" height="60">
                <div className="w-full h-full flex items-center justify-center">
                  <AnimalAvatar
                    animal={champion.animal}
                    size={56}
                    isChampion={true}
                    className="ring-4 ring-yellow-400 shadow-2xl"
                  />
                </div>
              </foreignObject>

              {/* Crown Icon floating above avatar */}
              <g transform="translate(0, -44)">
                <text x="0" y="0" textAnchor="middle" fontSize="24" className="filter drop-shadow-md">
                  👑
                </text>
              </g>

              {/* Champion Badge Banner below */}
              <g transform="translate(0, 36)">
                <rect
                  x="-48"
                  y="-8"
                  width="96"
                  height="20"
                  rx="10"
                  fill="#f59e0b"
                  filter="drop-shadow(0 2px 8px rgba(245, 158, 11, 0.6))"
                />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="800"
                  fill="#0f172a"
                  letterSpacing="1"
                  className="uppercase font-mono"
                >
                  ¡CAMPEÓN!
                </text>
              </g>
            </g>
          ) : (
            /* Unclaimed Trophy Waiting in the Center */
            <g className="flex flex-col items-center justify-center">
              <foreignObject x="-26" y="-28" width="52" height="52">
                <div className="w-full h-full flex flex-col items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-200">
                  <Trophy className="w-9 h-9 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
                </div>
              </foreignObject>

              <g transform="translate(0, 34)">
                <rect
                  x="-42"
                  y="-8"
                  width="84"
                  height="18"
                  rx="9"
                  fill="#1e293b"
                  stroke="rgba(245, 158, 11, 0.5)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="700"
                  fill="#fbbf24"
                  letterSpacing="0.8"
                  className="uppercase font-mono"
                >
                  GRAN COPA
                </text>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
