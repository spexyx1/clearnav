import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X, HelpCircle } from 'lucide-react';
import { useTutorial } from '../../lib/tutorial/TutorialContext';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_ESTIMATE = 180;

function computeTooltipPos(
  target: Rect,
  placement: string,
  vw: number,
  vh: number
): { top: number; left: number } {
  const { top, left, width, height } = target;
  let t = 0, l = 0;

  if (placement === 'bottom') {
    t = top + height + PADDING;
    l = left + width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === 'top') {
    t = top - TOOLTIP_HEIGHT_ESTIMATE - PADDING;
    l = left + width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === 'right') {
    t = top + height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
    l = left + width + PADDING;
  } else {
    t = top + height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
    l = left - TOOLTIP_WIDTH - PADDING;
  }

  // clamp to viewport
  l = Math.max(12, Math.min(l, vw - TOOLTIP_WIDTH - 12));
  t = Math.max(12, Math.min(t, vh - TOOLTIP_HEIGHT_ESTIMATE - 12));
  return { top: t, left: l };
}

export function TourOverlay() {
  const { isOpen, step, currentStep, totalSteps, advance, back, skip, openHelp } = useTutorial();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const [visible, setVisible] = useState(false);

  // Find target element and compute rect
  useLayoutEffect(() => {
    if (!isOpen || !step?.target) {
      setTargetRect(null);
      return;
    }

    let attempts = 0;
    const MAX = 20;

    function tryFind() {
      const el = document.querySelector(step!.target) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setVisible(true);
        return true;
      }
      return false;
    }

    if (tryFind()) return;

    // Poll via MutationObserver
    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      if (tryFind()) {
        observerRef.current?.disconnect();
      } else if (++attempts > MAX) {
        observerRef.current?.disconnect();
        // Show tooltip at center if target not found
        setTargetRect(null);
        setVisible(true);
      }
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observerRef.current?.disconnect();
  }, [isOpen, step, currentStep]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance();
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'Escape') skip();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, advance, back, skip]);

  if (!isOpen || !step || !visible) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Spotlight dimensions
  const spot = targetRect
    ? { top: targetRect.top - PADDING, left: targetRect.left - PADDING, width: targetRect.width + PADDING * 2, height: targetRect.height + PADDING * 2 }
    : null;

  const tooltipPos = targetRect
    ? computeTooltipPos(targetRect, step.placement, vw, vh)
    : { top: vh / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2, left: vw / 2 - TOOLTIP_WIDTH / 2 };

  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <div className="fixed inset-0 z-[9990] pointer-events-none">
        {spot ? (
          <svg className="w-full h-full" style={{ display: 'block' }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spot.left}
                  y={spot.top}
                  width={spot.width}
                  height={spot.height}
                  rx={8}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.6)"
              mask="url(#spotlight-mask)"
            />
            {/* Spotlight border ring */}
            <rect
              x={spot.left - 2}
              y={spot.top - 2}
              width={spot.width + 4}
              height={spot.height + 4}
              rx={10}
              fill="none"
              stroke="rgba(59,130,246,0.7)"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <div className="w-full h-full" style={{ background: 'rgba(0,0,0,0.6)' }} />
        )}
      </div>

      {/* Click-blocker on backdrop (outside spotlight) */}
      <div
        className="fixed inset-0 z-[9991]"
        style={{ pointerEvents: spot ? 'none' : 'auto' }}
        onClick={skip}
      />

      {/* Tooltip card */}
      <div
        className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-blue-600 to-blue-500">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-white' : i < currentStep ? 'w-2 bg-blue-200' : 'w-2 bg-blue-400/50'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-blue-100 font-medium">
                  Step {currentStep + 1} of {totalSteps}
                </p>
              </div>
              <button
                onClick={skip}
                className="text-blue-200 hover:text-white transition-colors p-0.5 flex-shrink-0"
                title="Skip tour"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pt-4 pb-2">
            <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2">{step.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{step.body}</p>
          </div>

          {/* Footer */}
          <div className="px-5 pt-2 pb-4 flex items-center justify-between gap-2">
            <button
              onClick={openHelp}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
            >
              <HelpCircle size={13} />
              Ask AI
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={back}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ArrowLeft size={13} />
                  Back
                </button>
              )}

              {isLast ? (
                <button
                  onClick={advance}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Finish
                </button>
              ) : (
                <button
                  onClick={advance}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Next
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
