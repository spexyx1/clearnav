import { useEffect, useRef, useState } from 'react';
import { PenLine, Type, Eraser } from 'lucide-react';
import { GOLD, GREEN, CREAM, inputCls, inputStyle } from './applicationTheme';

export interface SignatureValue { type: 'draw' | 'type'; data: string }

const INK = '#0E2219';
const WIDTH = 600;
const HEIGHT = 180;

export default function SignatureCapture({ defaultName, onChange }: { defaultName: string; onChange: (v: SignatureValue | null) => void }) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState(defaultName);
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (mode === 'type') onChange(typed.trim().length >= 2 ? { type: 'type', data: typed.trim() } : null);
    else onChange(hasInk && canvasRef.current ? { type: 'draw', data: canvasRef.current.toDataURL('image/png') } : null);
  }, [mode, typed, hasInk, onChange]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setHasInk(true);
    const c = canvasRef.current;
    if (c) onChange({ type: 'draw', data: c.toDataURL('image/png') });
  }

  function clear() {
    const c = canvasRef.current;
    c?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
    setHasInk(false);
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-sm p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        {([['draw', PenLine, 'Draw'], ['type', Type, 'Type']] as const).map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setHasInk(false); }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-xs font-semibold transition-all"
            style={mode === m ? { backgroundColor: GOLD, color: GREEN } : { color: CREAM, opacity: 0.6 }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {mode === 'draw' ? (
        <div>
          <div className="relative rounded-sm overflow-hidden bg-white" style={{ border: `1px solid ${GOLD}66` }}>
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              className="w-full touch-none cursor-crosshair block"
              style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
            />
            <div className="absolute left-6 right-6 bottom-8 border-b pointer-events-none" style={{ borderColor: '#cbd5e1' }} />
            {!hasInk && <p className="absolute inset-0 flex items-center justify-center text-sm pointer-events-none" style={{ color: '#94a3b8' }}>Sign here with your mouse, finger or stylus</p>}
          </div>
          <button type="button" onClick={clear} className="mt-2 flex items-center gap-1 text-xs hover:opacity-80" style={{ color: GOLD }}>
            <Eraser size={12} /> Clear
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input value={typed} onChange={e => setTyped(e.target.value.slice(0, 80))} placeholder="Type your full name" className={inputCls} style={inputStyle} />
          <div className="rounded-sm bg-white px-6 py-5 min-h-[88px] flex items-center" style={{ border: `1px solid ${GOLD}66` }}>
            <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 34, color: INK }}>{typed || ' '}</span>
          </div>
        </div>
      )}
    </div>
  );
}
