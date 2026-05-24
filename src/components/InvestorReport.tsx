import { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, Loader2, ChevronLeft, MapPin, Mail } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface InvestorReportProps {
  onBack: () => void;
  passphrase?: string;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:           '#0E2219',
  bgCard:       'rgba(255,255,255,0.04)',
  bgCardHover:  'rgba(255,255,255,0.06)',
  gold:         '#B8934A',
  goldMuted:    'rgba(184,147,74,0.18)',
  goldBorder:   'rgba(184,147,74,0.28)',
  text:         '#F5F2EE',
  textMid:      'rgba(245,242,238,0.70)',
  textLow:      'rgba(245,242,238,0.45)',
  textLowest:   'rgba(245,242,238,0.25)',
  border:       'rgba(255,255,255,0.10)',
  borderLight:  'rgba(255,255,255,0.06)',
  positive:     '#4CAF80',
  negative:     '#E05050',
  positiveMuted:'rgba(76,175,128,0.80)',
  negativeMuted:'rgba(224,80,80,0.80)',
  benchmarkBar: 'rgba(184,147,74,0.55)',
  strategyBar:  '#4CAF80',
  allGainsBar:  'rgba(184,147,74,0.75)',
  guidelinesBar:'#4CAF80',
  navLine:      '#B8934A',
};

const HEADING_FONT  = '"Cormorant Garamond", Georgia, serif';
const BODY_FONT     = '"Nunito Sans", system-ui, sans-serif';

// ─── Shared header & footer ────────────────────────────────────────────────────
function VaultHeader({ onBack }: { onBack: () => void }) {
  return (
    <header
      className="flex-shrink-0 px-6 py-5 flex items-center justify-between border-b"
      style={{ borderColor: C.border }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
        style={{ color: C.text, opacity: 0.5 }}
      >
        <ChevronLeft size={16} />
        <span>Back</span>
      </button>
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: C.gold, color: C.bg }}
        >
          A
        </div>
        <span
          className="text-base uppercase"
          style={{ fontFamily: HEADING_FONT, fontWeight: 500, letterSpacing: '0.18em', color: C.text }}
        >
          Arkline Trust
        </span>
      </div>
      <div className="w-20" />
    </header>
  );
}

function VaultFooter() {
  return (
    <footer className="flex-shrink-0 border-t px-6 py-8" style={{ borderColor: C.border }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row gap-6 text-xs" style={{ color: C.textLow }}>
            <div className="flex items-start gap-2">
              <MapPin size={13} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-0.5" style={{ color: C.gold }}>Australia</p>
                <p>Level 6, 111 Cecil Street</p>
                <p>South Melbourne VIC 3205</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={13} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-0.5" style={{ color: C.gold }}>Jerusalem</p>
                <p>Level 2, 20 King George Street</p>
                <p>Jerusalem, Israel</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.textLow }}>
            <Mail size={13} />
            <a href="mailto:enquiries@arklinetrust.com" className="hover:opacity-70 transition-opacity">
              enquiries@arklinetrust.com
            </a>
          </div>
        </div>
        <p
          className="text-center text-xs mt-6 max-w-3xl mx-auto leading-relaxed"
          style={{ color: C.textLowest }}
        >
          This document contains confidential information prepared exclusively for prospective wholesale investors
          as defined under the Corporations Act 2001 (Cth). It does not constitute an offer to sell or a
          solicitation to acquire any financial product. Past performance is not indicative of future results.
        </p>
      </div>
    </footer>
  );
}

// ─── Typography helpers ────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2
        className="text-3xl md:text-4xl font-semibold tracking-tight"
        style={{ fontFamily: HEADING_FONT, color: C.text }}
      >
        {children}
      </h2>
      <div className="mt-3 w-10 h-px" style={{ backgroundColor: C.gold }} />
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xl md:text-2xl font-semibold mb-3"
      style={{ fontFamily: HEADING_FONT, color: C.gold }}
    >
      {children}
    </h3>
  );
}

function Body({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-sm md:text-base leading-relaxed mb-4 ${className}`}
      style={{ fontFamily: BODY_FONT, color: C.textMid }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-10 h-px w-full" style={{ backgroundColor: C.borderLight }} />;
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-sm border p-6 ${className}`}
      style={{ backgroundColor: C.bgCard, borderColor: C.goldBorder }}
    >
      {children}
    </div>
  );
}

// ─── Key metric pill ───────────────────────────────────────────────────────────
function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const valColor = positive === undefined ? C.text : positive ? C.positive : C.negative;
  return (
    <div
      className="flex flex-col gap-1 px-5 py-4 rounded-sm border"
      style={{ backgroundColor: C.bgCard, borderColor: C.goldBorder }}
    >
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textLow, fontFamily: BODY_FONT }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: HEADING_FONT, color: valColor }}>
        {value}
      </span>
    </div>
  );
}

// ─── Data table ───────────────────────────────────────────────────────────────
interface TableColumn {
  header: string;
  key: string;
  align?: 'left' | 'right' | 'center';
  colorFn?: (val: string) => string;
}

function DataTable({ columns, rows }: { columns: TableColumn[]; rows: Record<string, string>[] }) {
  return (
    <div className="overflow-x-auto rounded-sm border" style={{ borderColor: C.goldBorder }}>
      <table className="w-full text-sm" style={{ fontFamily: BODY_FONT }}>
        <thead>
          <tr style={{ backgroundColor: C.goldMuted }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-widest ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                style={{ color: C.gold }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                borderTop: `1px solid ${C.borderLight}`,
              }}
            >
              {columns.map((col) => {
                const val = row[col.key] ?? '';
                const color = col.colorFn ? col.colorFn(val) : C.textMid;
                return (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    style={{ color }}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface BarChartProps {
  title: string;
  labels: string[];
  series: BarSeries[];
  data: Record<string, number>[];
  height?: number;
  yUnit?: string;
  yFormat?: (v: number) => string;
}

function BarChart({ title, labels, series, data, height = 220, yUnit = '%', yFormat }: BarChartProps) {
  const allVals = data.flatMap((d) => series.map((s) => d[s.key] ?? 0));
  const maxVal = Math.max(...allVals, 0);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const svgW = 800;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 56;
  const chartW = svgW - padL - padR;
  const chartH = height;
  const zeroY = padT + chartH * (maxVal / range);

  const groupW = chartW / labels.length;
  const barW = Math.max(4, Math.min(18, groupW / series.length - 2));
  const groupPad = (groupW - barW * series.length) / 2;

  const fmt = yFormat ?? ((v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}${yUnit}`);

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = minVal + (range * i) / tickCount;
    return { v, y: padT + chartH * ((maxVal - v) / range) };
  });

  return (
    <div className="rounded-sm border p-4" style={{ backgroundColor: C.bgCard, borderColor: C.goldBorder }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.textLow, fontFamily: BODY_FONT }}>
        {title}
      </p>
      <svg
        viewBox={`0 0 ${svgW} ${chartH + padT + padB}`}
        className="w-full"
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines */}
        {ticks.map(({ v, y }) => (
          <g key={v}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke={C.borderLight} strokeWidth={1} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={10} fill={C.textLowest} fontFamily={BODY_FONT}>
              {v.toFixed(0)}{yUnit}
            </text>
          </g>
        ))}

        {/* Zero line */}
        <line x1={padL} y1={zeroY} x2={svgW - padR} y2={zeroY} stroke={C.border} strokeWidth={1.5} />

        {/* Bars */}
        {labels.map((label, gi) => {
          const gx = padL + gi * groupW + groupPad;
          return (
            <g key={label}>
              {series.map((s, si) => {
                const val = data[gi]?.[s.key] ?? 0;
                const barH = Math.abs((val / range) * chartH);
                const barY = val >= 0 ? zeroY - barH : zeroY;
                const bx = gx + si * barW;
                return (
                  <rect
                    key={s.key}
                    x={bx}
                    y={barY}
                    width={barW - 1}
                    height={Math.max(1, barH)}
                    fill={s.color}
                    rx={1}
                  />
                );
              })}
              <text
                x={gx + (barW * series.length) / 2}
                y={chartH + padT + padB - 6}
                textAnchor="middle"
                fontSize={9}
                fill={C.textLowest}
                fontFamily={BODY_FONT}
                transform={`rotate(-45, ${gx + (barW * series.length) / 2}, ${chartH + padT + padB - 6})`}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-xs" style={{ color: C.textLow, fontFamily: BODY_FONT }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SVG Line Chart ────────────────────────────────────────────────────────────
interface LineSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

interface LineChartProps {
  title: string;
  labels: string[];
  series: LineSeries[];
  data: Record<string, number>[];
  height?: number;
  yUnit?: string;
}

function LineChart({ title, labels, series, data, height = 200, yUnit = '%' }: LineChartProps) {
  const allVals = data.flatMap((d) => series.map((s) => d[s.key] ?? 0));
  const maxVal = Math.max(...allVals, 0);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const svgW = 800;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 56;
  const chartW = svgW - padL - padR;
  const chartH = height;

  const xStep = chartW / Math.max(labels.length - 1, 1);
  const yScale = (v: number) => padT + chartH * ((maxVal - v) / range);

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = minVal + (range * i) / tickCount;
    return { v, y: yScale(v) };
  });

  return (
    <div className="rounded-sm border p-4" style={{ backgroundColor: C.bgCard, borderColor: C.goldBorder }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.textLow, fontFamily: BODY_FONT }}>
        {title}
      </p>
      <svg
        viewBox={`0 0 ${svgW} ${chartH + padT + padB}`}
        className="w-full"
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines */}
        {ticks.map(({ v, y }) => (
          <g key={v}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke={C.borderLight} strokeWidth={1} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={10} fill={C.textLowest} fontFamily={BODY_FONT}>
              {v.toFixed(0)}{yUnit}
            </text>
          </g>
        ))}

        {/* Zero line */}
        {minVal < 0 && (
          <line x1={padL} y1={yScale(0)} x2={svgW - padR} y2={yScale(0)} stroke={C.border} strokeWidth={1.5} />
        )}

        {/* Lines */}
        {series.map((s) => {
          const points = labels.map((_, i) => {
            const x = padL + i * xStep;
            const y = yScale(data[i]?.[s.key] ?? 0);
            return `${x},${y}`;
          });
          return (
            <polyline
              key={s.key}
              points={points.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '6 4' : undefined}
            />
          );
        })}

        {/* X labels */}
        {labels.map((label, i) => (
          <text
            key={label}
            x={padL + i * xStep}
            y={chartH + padT + padB - 6}
            textAnchor="middle"
            fontSize={9}
            fill={C.textLowest}
            fontFamily={BODY_FONT}
            transform={`rotate(-45, ${padL + i * xStep}, ${chartH + padT + padB - 6})`}
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <svg width={20} height={10}>
              <line
                x1={0} y1={5} x2={20} y2={5}
                stroke={s.color}
                strokeWidth={2.5}
                strokeDasharray={s.dashed ? '4 3' : undefined}
              />
            </svg>
            <span className="text-xs" style={{ color: C.textLow, fontFamily: BODY_FONT }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart data ────────────────────────────────────────────────────────────────

// Monthly realised gains 2025 (Opportunistic)
const OPPO_MONTHS = ['Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25'];
const OPPO_REALISED_DATA = [
  { all: 1.0,  guidelines: 0.8 },
  { all: 5.9,  guidelines: 5.8 },
  { all: 7.6,  guidelines: 6.7 },
  { all: 6.4,  guidelines: 3.2 },
  { all: 12.0, guidelines: 7.0 },
  { all: 4.4,  guidelines: 5.0 },
  { all: 9.8,  guidelines: 7.4 },
  { all: 4.5,  guidelines: 6.3 },
  { all: -12.7,guidelines: 2.6 },
  { all: 3.2,  guidelines: 2.2 },
  { all: -32.1,guidelines: -5.6},
  { all: 7.5,  guidelines: 4.4 },
];

// Monthly returns Quant-Value vs SXR8
const QV_MONTHS = ['Dec-24','Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26','Apr-26','May-26'];
const QV_DATA = [
  { sxr8: -0.96, qv: -0.82 },
  { sxr8:  3.22, qv: -0.03 },
  { sxr8: -3.64, qv: -0.19 },
  { sxr8: -9.00, qv:  2.36 },
  { sxr8: -5.36, qv: -2.19 },
  { sxr8:  6.88, qv:  2.41 },
  { sxr8:  1.50, qv:  3.75 },
  { sxr8:  6.09, qv: -0.62 },
  { sxr8: -1.11, qv:  3.43 },
  { sxr8:  2.81, qv:  0.30 },
  { sxr8:  4.74, qv: -1.45 },
  { sxr8: -0.49, qv:  1.79 },
  { sxr8: -0.45, qv:  0.30 },
  { sxr8: -0.36, qv:  5.01 },
  { sxr8: -0.36, qv:  3.99 },
  { sxr8: -3.83, qv: -3.44 },
  { sxr8:  9.41, qv:  5.95 },
  { sxr8:  3.12, qv:  0.54 },
];

// Cumulative returns (running sum)
function cumulative(data: { sxr8: number; qv: number }[]) {
  let s = 0, q = 0;
  return data.map((d) => { s += d.sxr8; q += d.qv; return { sxr8: s, qv: q }; });
}
const QV_CUMUL_DATA = cumulative(QV_DATA);

// ─── Table data ────────────────────────────────────────────────────────────────
function pctColor(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return C.textMid;
  if (n > 0) return C.positive;
  if (n < 0) return C.negative;
  return C.textMid;
}

const OPPO_TABLE_COLS = [
  { header: 'Month', key: 'month', align: 'left' as const },
  { header: 'Realised Gains % of NAV (All Holdings)', key: 'all', align: 'right' as const, colorFn: pctColor },
  { header: 'Realised Gains % of NAV (Within Guidelines)', key: 'guidelines', align: 'right' as const, colorFn: pctColor },
];
const OPPO_TABLE_ROWS = OPPO_MONTHS.map((m, i) => ({
  month: m,
  all: `${OPPO_REALISED_DATA[i].all > 0 ? '+' : ''}${OPPO_REALISED_DATA[i].all.toFixed(1)}%`,
  guidelines: `${OPPO_REALISED_DATA[i].guidelines > 0 ? '+' : ''}${OPPO_REALISED_DATA[i].guidelines.toFixed(1)}%`,
}));

const QV_TABLE_COLS = [
  { header: 'Date', key: 'date', align: 'left' as const },
  { header: 'SXR8 %', key: 'sxr8', align: 'right' as const, colorFn: pctColor },
  { header: 'Quant-Value %', key: 'qv', align: 'right' as const, colorFn: pctColor },
];
const QV_TABLE_ROWS = QV_MONTHS.map((m, i) => ({
  date: m,
  sxr8: `${QV_DATA[i].sxr8 > 0 ? '+' : ''}${QV_DATA[i].sxr8.toFixed(2)}%`,
  qv:   `${QV_DATA[i].qv   > 0 ? '+' : ''}${QV_DATA[i].qv.toFixed(2)}%`,
}));

// ─── Report body ───────────────────────────────────────────────────────────────
function ReportContent({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.bg, fontFamily: BODY_FONT, color: C.text }}
    >
      <VaultHeader onBack={onBack} />

      <main className="flex-1 px-4 md:px-8 lg:px-16 py-12">
        <div className="max-w-4xl mx-auto">

          {/* ── Cover ── */}
          <div className="text-center mb-14">
            {/* Arkline logo mark */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: C.gold, color: C.bg, fontFamily: HEADING_FONT, fontSize: '1.1rem' }}
              >
                A
              </div>
              <span
                className="text-sm tracking-widest uppercase"
                style={{ fontFamily: HEADING_FONT, fontWeight: 500, letterSpacing: '0.2em', color: C.textMid }}
              >
                Arkline Trust
              </span>
            </div>
            <span
              className="inline-flex items-center px-4 py-1.5 rounded-sm text-xs font-semibold tracking-widest uppercase border mb-6"
              style={{ color: C.gold, borderColor: C.goldBorder, backgroundColor: C.goldMuted }}
            >
              Investor Update · 2026
            </span>
            <h1
              className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight mb-4"
              style={{ fontFamily: HEADING_FONT }}
            >
              Arkline Investments Fund
            </h1>
            <div className="w-14 h-px mx-auto my-5" style={{ backgroundColor: C.gold }} />
            <p className="text-lg" style={{ color: C.textMid }}>
              Investor Update #1 — May 2026
            </p>
          </div>

          {/* ── Executive summary ── */}
          <Card className="mb-10">
            <Body>
              This 2026 Investor Update #1 provides an overview of the Arkline Investment Fund and its two
              current portfolio strategies: <strong style={{ color: C.text }}>Opportunistic</strong> and{' '}
              <strong style={{ color: C.text }}>Quant-Value</strong>.
            </Body>
            <Body>
              The Fund is designed to deliver consistent, absolute returns while prioritising capital preservation
              and long-term growth. It offers a diversified structure across two complementary strategies, each
              tailored to different investment horizons and risk preferences.
            </Body>
            <Body>
              Both strategies utilise a value-driven investment philosophy and target a return of at least{' '}
              <strong style={{ color: C.gold }}>15% per annum</strong> by striving to identify and capture
              opportunities and mispriced securities across varying market conditions. Through active management,
              rigorous analysis, and continuous refinement, we seek to generate sustainable returns while
              prudently managing risk on behalf of our investors.
            </Body>
            <Body className="!mb-0">
              This update details the investment approach for each strategy, reviews recent performance, and
              clarifies the most appropriate basis for evaluating results.
            </Body>
          </Card>

          <Divider />

          {/* ── Fund Strategies ── */}
          <SectionTitle>Fund Strategies</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold" style={{ backgroundColor: C.gold, color: C.bg }}>1</div>
                <SubTitle>Opportunistic Strategy</SubTitle>
              </div>
              <Body>
                A pure value strategy focused on identifying temporary mismatches between market price and
                underlying security value. The portfolio seeks to capitalise on short-term dislocations where
                quality opportunities become available at prices below intrinsic value.
              </Body>
              <Body className="!mb-0">
                Holdings are generally maintained for between{' '}
                <strong style={{ color: C.text }}>1 and 12 months</strong>, reflecting the shorter-term trading
                cycle of this strategy.
              </Body>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold" style={{ backgroundColor: C.gold, color: C.bg }}>2</div>
                <SubTitle>Quant-Value Strategy</SubTitle>
              </div>
              <Body>
                A classic value-based approach focused on identifying excellent companies with strong operating
                histories and comparatively low-risk future earnings prospects. Designed for longer-term
                compounding, it typically holds investments for{' '}
                <strong style={{ color: C.text }}>at least 3 to 5 years</strong>.
              </Body>
              <Body className="!mb-0">
                Powered by a proprietary algorithm evaluating a wide range of business fundamentals, with each
                investment reviewed by the analysis team before inclusion.
              </Body>
            </Card>
          </div>

          <Divider />

          {/* ── Opportunistic Performance ── */}
          <SectionTitle>Performance Update</SectionTitle>
          <SubTitle>Opportunistic Strategy</SubTitle>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Metric label="2025 Peak (YTD)" value="~30%" positive={true} />
            <Metric label="Core Strategy 2025" value="~32%" positive={true} />
            <Metric label="2026 YTD Recovery" value="~14%" positive={true} />
            <Metric label="Target Return p.a." value="≥ 15%" />
          </div>

          <Body>
            The Opportunistic Strategy generated strong gains through the first three quarters of 2025, reaching
            approximately 30% before a period of significant market instability in the final quarter materially
            affected performance.
          </Body>
          <Body>
            This drawdown was further amplified by a small number of experimental investments made outside the
            strategy's pre-established guidelines, resulting in a significant decline by year-end. Since the first
            quarter of 2026, however, the strategy has recovered a substantial portion of those losses and is
            currently up approximately <strong style={{ color: C.positive }}>14% YTD</strong>.
          </Body>
          <Body>
            Importantly, when performance is assessed excluding holdings outside the main strategy guidelines, the
            strategy delivered returns of around <strong style={{ color: C.positive }}>32% in 2025</strong>. This
            reinforces the effectiveness of the core Opportunistic framework and highlights the importance of
            maintaining disciplined adherence to established portfolio parameters.
          </Body>
          <Body>
            An analysis of realised 2025 returns further reinforces this conclusion. The guideline-compliant
            portfolio remained meaningfully more resilient, finishing the year with realised gains of approximately{' '}
            <strong style={{ color: C.positive }}>32.2%</strong> of year-end NAV, compared with approximately{' '}
            <strong style={{ color: C.negative }}>7.5%</strong> for the full set of holdings. The divergence was
            most evident in September and November 2025, when investments outside the guidelines contributed to
            sharp realised losses.
          </Body>

          {/* Monthly realised gains table */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.textLow }}>
              Monthly Realised Gains — 2025
            </p>
            <DataTable columns={OPPO_TABLE_COLS} rows={OPPO_TABLE_ROWS} />
          </div>

          {/* Chart 1: Monthly realised gains bars */}
          <div className="mb-8">
            <BarChart
              title="Fig. 1 — Monthly Realised Gain % (All Holdings vs. Within Guidelines)"
              labels={OPPO_MONTHS}
              series={[
                { key: 'all',        label: 'All Holdings',       color: C.allGainsBar },
                { key: 'guidelines', label: 'Within Guidelines',  color: C.guidelinesBar },
              ]}
              data={OPPO_REALISED_DATA}
            />
            <p className="text-xs mt-2 leading-relaxed italic" style={{ color: C.textLow }}>
              Monthly return profile for the Opportunistic Strategy, illustrating the strong mid-2025 advance, the
              sharp drawdown in the final quarter of 2025, and the beginning of recovery in 2026.
            </p>
          </div>

          <Body>
            The Opportunistic Strategy exhibited both the return potential and volatility characteristic of a
            shorter-duration value approach. Strong rebounds in January and April 2026 demonstrate the strategy's
            ability to recapture value as market conditions stabilise. Taken together, the results support the
            underlying strength of the Opportunistic process while underscoring the importance of disciplined
            execution within its original investment parameters.
          </Body>

          <Divider />

          {/* ── Quant-Value Performance ── */}
          <SubTitle>Quant-Value Strategy</SubTitle>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Metric label="2025 Full Year" value=">17%" positive={true} />
            <Metric label="Since Inception" value=">20%" positive={true} />
            <Metric label="Dec-24 to May-26" value="+22.7%" positive={true} />
            <Metric label="SXR8 Benchmark" value="+11.0%" />
          </div>

          <Body>
            The Quant-Value Strategy continued to perform reliably through the market turbulence experienced in
            the final quarter of 2025, demonstrating the resilience typically associated with a longer-term,
            quality-focused value portfolio. The strategy delivered returns of more than{' '}
            <strong style={{ color: C.positive }}>17%</strong> for the year and has generated in excess of{' '}
            <strong style={{ color: C.positive }}>20%</strong> since inception.
          </Body>
          <Body>
            Over the period from December 2024 through May 2026, the Quant-Value strategy generated a cumulative
            return of approximately <strong style={{ color: C.positive }}>+22.7%</strong>, materially
            outperforming the SXR8 benchmark, which delivered a cumulative return of approximately{' '}
            <strong style={{ color: C.textMid }}>+11.0%</strong> over the same timeframe.
          </Body>
          <Body>
            Notable relative outperformance occurred during equity market drawdowns in early 2025 and again
            through late 2025 and early 2026. More recently, the strategy continued to participate in the market
            recovery, delivering a positive return of{' '}
            <strong style={{ color: C.positive }}>+0.54% in May 2026</strong>, following a strong{' '}
            <strong style={{ color: C.positive }}>+5.95% gain in April 2026</strong>.
          </Body>
          <Body>
            While the portfolio has lagged during certain sharp benchmark rallies, this reflects its structural
            bias towards attractively valued stocks and disciplined risk controls. Overall, cumulative performance
            underscores the strategy's ability to compound returns over time and deliver differentiated outcomes
            versus the benchmark.
          </Body>

          {/* QV table */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.textLow }}>
              Monthly Returns — Quant-Value vs. SXR8 Benchmark
            </p>
            <DataTable columns={QV_TABLE_COLS} rows={QV_TABLE_ROWS} />
          </div>

          {/* Chart 2: Monthly bar chart QV vs SXR8 */}
          <div className="mb-8">
            <BarChart
              title="Fig. 2 — Monthly Returns: Quant-Value % vs. SXR8 %"
              labels={QV_MONTHS}
              series={[
                { key: 'sxr8', label: 'SXR8 Benchmark', color: C.benchmarkBar },
                { key: 'qv',   label: 'Quant-Value',     color: C.strategyBar },
              ]}
              data={QV_DATA}
            />
          </div>

          {/* Chart 3: Cumulative line chart */}
          <div className="mb-8">
            <LineChart
              title="Fig. 3 — Cumulative Returns: Quant-Value vs. SXR8 (Dec-24 to May-26)"
              labels={QV_MONTHS}
              series={[
                { key: 'sxr8', label: 'SXR8 Benchmark', color: C.benchmarkBar, dashed: true },
                { key: 'qv',   label: 'Quant-Value',     color: C.strategyBar },
              ]}
              data={QV_CUMUL_DATA}
            />
            <p className="text-xs mt-2 leading-relaxed italic" style={{ color: C.textLow }}>
              Cumulative performance of the Quant-Value Strategy relative to the SXR8 benchmark, highlighting
              consistent alpha generation and outperformance through multiple market environments.
            </p>
          </div>

          <Divider />

          {/* ── Evaluation Methodology ── */}
          <SectionTitle>Evaluation Methodology</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: C.gold }}
              >
                Opportunistic Strategy
              </p>
              <p className="text-sm leading-relaxed" style={{ color: C.textMid }}>
                Should primarily be assessed on <strong style={{ color: C.text }}>realised gains</strong>, due to
                the nature of its trading cycle. Positions are often accumulated while share prices are falling
                and sold as prices recover toward true value. Unrealised performance may at times appear
                suppressed due to timing effects rather than underlying investment quality.
              </p>
            </Card>
            <Card>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: C.gold }}
              >
                Quant-Value Strategy
              </p>
              <p className="text-sm leading-relaxed" style={{ color: C.textMid }}>
                Should be assessed primarily on <strong style={{ color: C.text }}>unrealised returns</strong>,
                given its long-term holding period and the relatively rare sale of existing positions. This
                provides a more accurate reflection of the strategy's ongoing value creation.
              </p>
            </Card>
          </div>

          <Divider />

          {/* ── Conclusion ── */}
          <SectionTitle>Conclusion</SectionTitle>

          <Card>
            <Body>
              Overall, the Arkline Investments Fund reflects two distinct but complementary value-oriented
              strategies: one designed to capitalise on shorter-term market dislocations, and the other to
              compound value steadily over the longer term. Together, they provide investors with differentiated
              exposure across both tactical and long-duration opportunities.
            </Body>
            <Body className="!mb-0">
              The Quant-Value strategy's consistent outperformance relative to the SXR8 benchmark since inception
              demonstrates the strength of our systematic approach. The Opportunistic strategy's recovery and the
              lessons drawn from 2025 reinforce the value of disciplined adherence to established portfolio
              parameters. We remain committed to both strategies and to delivering superior risk-adjusted returns
              on behalf of our investors.
            </Body>
          </Card>

          {/* Confidentiality notice */}
          <div className="mt-10 pt-6 border-t" style={{ borderColor: C.borderLight }}>
            <p className="text-xs leading-relaxed text-center" style={{ color: C.textLowest }}>
              <strong style={{ color: C.textLow }}>Confidential.</strong> This update is prepared exclusively for
              prospective wholesale investors as defined under the Corporations Act 2001 (Cth). It does not
              constitute an offer to sell or a solicitation to acquire any financial product. Past performance is
              not indicative of future results. Arkline Investments Pty Ltd — May 2026.
            </p>
          </div>

        </div>
      </main>

      <VaultFooter />
    </div>
  );
}

// ─── Password gate (only shown on direct navigation to /vault/report) ──────────
export default function InvestorReport({ onBack, passphrase: preAuthPassphrase }: InvestorReportProps) {
  // Pre-authenticated from InvestorVault — skip gate entirely
  if (preAuthPassphrase) {
    return <ReportContent onBack={onBack} />;
  }

  return <ReportGate onBack={onBack} />;
}

function ReportGate({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<'gate' | 'error'>('gate');
  const [passphrase, setPassphrase] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setSubmitting(true);
    setAuthError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-vault-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: passphrase.trim(), tenant_slug: 'arkline' }),
      });
      if (res.status === 401) {
        setAuthError('Incorrect passphrase. Please try again.');
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error('Server error');
      setUnlocked(true);
    } catch {
      setGeneralError('Unable to connect. Please try again shortly.');
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (unlocked) {
    return <ReportContent onBack={onBack} />;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.bg, fontFamily: BODY_FONT, color: C.text }}
    >
      <VaultHeader onBack={onBack} />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        {phase === 'error' ? (
          <div className="text-center max-w-sm">
            <AlertCircle size={40} className="mx-auto mb-4" style={{ color: C.textLow }} />
            <p className="text-sm mb-6" style={{ color: C.textMid }}>{generalError}</p>
            <button
              onClick={() => { setPhase('gate'); setGeneralError(''); }}
              className="px-6 py-2.5 rounded-sm text-sm font-semibold"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: C.goldMuted, border: `1px solid ${C.goldBorder}` }}
              >
                <Lock size={28} style={{ color: C.gold }} />
              </div>
              <h1
                className="text-3xl md:text-4xl font-semibold mb-3 tracking-tight"
                style={{ fontFamily: HEADING_FONT }}
              >
                Investor Update #1
              </h1>
              <div className="w-10 h-px mx-auto my-4" style={{ backgroundColor: C.gold }} />
              <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: C.textLow }}>
                This report contains confidential materials prepared exclusively for prospective wholesale
                investors. Enter your access passphrase to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: C.textLow }}>
                  Access Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setAuthError(''); }}
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 rounded-sm text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: authError ? '1px solid rgba(239,68,68,0.6)' : `1px solid ${C.border}`,
                    color: C.text,
                  }}
                  placeholder="Enter passphrase"
                  disabled={submitting}
                />
                {authError && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                    <AlertCircle size={13} />
                    <span>{authError}</span>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !passphrase.trim()}
                className="w-full py-3.5 rounded-sm text-sm font-semibold tracking-wide transition-all hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: C.gold, color: C.bg }}
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                ) : (
                  <><Unlock size={16} /> Read Report</>
                )}
              </button>
            </form>

            <p className="text-center text-xs mt-8" style={{ color: C.textLowest }}>
              Don't have a passphrase? Contact{' '}
              <a href="mailto:enquiries@arklinetrust.com" className="underline hover:opacity-80">
                enquiries@arklinetrust.com
              </a>
            </p>
          </div>
        )}
      </main>

      <VaultFooter />
    </div>
  );
}
