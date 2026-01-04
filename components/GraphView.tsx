import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Note, NoteCategory } from '../types';
import { ChevronLeft, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Node extends Note {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  source: string;
  target: string;
}

interface GraphViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onBack: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  [NoteCategory.WORK]: '#6366f1', // Indigo
  [NoteCategory.PERSONAL]: '#10b981', // Emerald
  [NoteCategory.IDEAS]: '#f59e0b', // Amber
  [NoteCategory.UNCATEGORIZED]: '#9ca3af', // Gray
};

const GraphView: React.FC<GraphViewProps> = ({ notes, onSelectNote, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const requestRef = useRef<number>(null);

  // Initialize nodes and links
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }

    const initialNodes: Node[] = notes.map((note) => ({
      ...note,
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: 0,
      vy: 0,
    }));

    const initialLinks: Link[] = [];
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const sharedTags = notes[i].tags.filter((tag) => notes[j].tags.includes(tag));
        if (sharedTags.length > 0) {
          initialLinks.push({ source: notes[i].id, target: notes[j].id });
        }
      }
    }

    setNodes(initialNodes);
    setLinks(initialLinks);
  }, [notes]);

  // Force simulation logic
  const animate = () => {
    setNodes((prevNodes) => {
      const newNodes = prevNodes.map((n) => ({ ...n }));
      const k = 0.05; // spring constant
      const repulsion = 1000;
      const centerForce = 0.01;

      // 1. Repulsion between all nodes
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const dx = newNodes[i].x - newNodes[j].x;
          const dy = newNodes[i].y - newNodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          newNodes[i].vx += fx;
          newNodes[i].vy += fy;
          newNodes[j].vx -= fx;
          newNodes[j].vy -= fy;
        }
      }

      // 2. Attraction between linked nodes
      links.forEach((link) => {
        const source = newNodes.find((n) => n.id === link.source);
        const target = newNodes.find((n) => n.id === link.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance - 150) * k;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // 3. Force towards center
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      newNodes.forEach((n) => {
        n.vx += (centerX - n.x) * centerForce;
        n.vy += (centerY - n.y) * centerForce;

        // Apply velocities and friction
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.9;
        n.vy *= 0.9;

        // Boundary check
        n.x = Math.max(50, Math.min(dimensions.width - 50, n.x));
        n.y = Math.max(50, Math.min(dimensions.height - 50, n.y));
      });

      return newNodes;
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [links, dimensions]);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden" ref={containerRef}>
      <div className="p-6 flex justify-between items-center bg-white border-b border-gray-100 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Knowledge Graph</h1>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full font-medium">
          Links represent shared tags
        </div>
      </div>

      <div className="flex-1 relative cursor-grab active:cursor-grabbing">
        <svg width="100%" height="100%" className="absolute inset-0">
          {/* Render Links */}
          {links.map((link, idx) => {
            const source = nodes.find((n) => n.id === link.source);
            const target = nodes.find((n) => n.id === link.target);
            if (!source || !target) return null;
            return (
              <line
                key={`${link.source}-${link.target}-${idx}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#e5e7eb"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="transition-transform duration-75 ease-linear cursor-pointer"
              onClick={() => onSelectNote(node)}
            >
              <circle
                r={Math.max(12, Math.min(40, 10 + node.content.length / 50))}
                fill={CATEGORY_COLORS[node.category] || '#9ca3af'}
                className={`shadow-sm hover:brightness-110 transition-all ${
                  node.status === 'In Progress' ? 'animate-pulse' : ''
                }`}
                stroke="white"
                strokeWidth="2"
              />
              <text
                dy="30"
                textAnchor="middle"
                className="text-[10px] font-semibold fill-gray-500 pointer-events-none select-none"
                style={{ filter: 'drop-shadow(0px 1px 1px white)' }}
              >
                {node.title || 'Untitled'}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute bottom-6 left-6 p-4 bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-lg text-xs space-y-2">
        <p className="font-bold text-gray-800 mb-2 uppercase tracking-wider text-[10px]">Legend</p>
        <div className="flex flex-col gap-2">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-gray-600">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphView;
