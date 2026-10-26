// Scales through toPrecision(15) so binary float noise (1.005 * 100 = 100.49999...) rounds half away from zero.
export function roundTo(v: number, d = 2) {
  if (!Number.isFinite(v)) return v;
  const f = 10 ** d;
  return (Math.sign(v) * Math.round(Number((Math.abs(v) * f).toPrecision(15)))) / f || 0;
}

export const cents = (v: number) => roundTo(v, 2);
