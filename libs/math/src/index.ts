export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const z = (r: number) => (r - 50) / 12;
export const logistic = (s: number) => 1 / (1 + Math.exp(-s));
export function softmax(xs: number[], T = 1) {
  const m = Math.max(...xs);
  const ex = xs.map(v => Math.exp((v - m) / T));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(v => v / s);
}
