// xorshift128+ deterministic RNG
export class XRng {
  private s0: bigint;
  private s1: bigint;
  constructor(seed: number) {
    // simple splitmix
    let x = BigInt(seed | 0) + 0x9e3779b97f4a7c15n;
    function split(): bigint {
      x ^= x >> 30n;
      x *= 0xbf58476d1ce4e5b9n;
      x ^= x >> 27n;
      x *= 0x94d049bb133111ebn;
      x ^= x >> 31n;
      return x;
    }
    this.s0 = split();
    this.s1 = split();
  }
  next() {
    let x = this.s0;
    const y = this.s1;
    this.s0 = y;
    x ^= x << 23n;
    this.s1 = x ^ y ^ (x >> 17n) ^ (y >> 26n);
    const t = (this.s1 + y) & ((1n << 64n) - 1n);
    return Number(t >> 11n) / Number(1n << 53n);
  }
  pick<T>(arr: T[]) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
