/**
 * Deterministic counter-based PRNG modeled on Philox-4x32-10.
 * Pure functional: given (seed, counter), output is bit-identical across runs and browsers.
 */

const PHILOX_M0 = 0xd2511f53;
const PHILOX_M1 = 0xcd9e8d57;
const PHILOX_W0 = 0x9e3779b9;
const PHILOX_W1 = 0xbb67ae85;

function mulHiLo32(a: number, b: number): [number, number] {
  const aBig = BigInt(a >>> 0);
  const bBig = BigInt(b >>> 0);
  const prod = aBig * bBig;
  const lo = Number(prod & 0xffffffffn) >>> 0;
  const hi = Number((prod >> 32n) & 0xffffffffn) >>> 0;
  return [hi, lo];
}

export function philox4x32(
  seed: number,
  counter: number,
  stream: number = 0
): [number, number, number, number] {
  let c0 = counter >>> 0;
  let c1 = stream >>> 0;
  let c2 = 0;
  let c3 = 0;

  let k0 = seed >>> 0;
  let k1 = ((seed ^ 0x9e3779b9) >>> 0);

  for (let round = 0; round < 10; round++) {
    const [hi0, lo0] = mulHiLo32(PHILOX_M0, c0);
    const [hi1, lo1] = mulHiLo32(PHILOX_M1, c2);

    const nextC0 = (hi1 ^ c1 ^ k0) >>> 0;
    const nextC1 = lo1 >>> 0;
    const nextC2 = (hi0 ^ c3 ^ k1) >>> 0;
    const nextC3 = lo0 >>> 0;

    c0 = nextC0;
    c1 = nextC1;
    c2 = nextC2;
    c3 = nextC3;

    k0 = (k0 + PHILOX_W0) >>> 0;
    k1 = (k1 + PHILOX_W1) >>> 0;
  }

  return [c0, c1, c2, c3];
}

export interface CounterRng {
  nextUniform: () => number;
  nextGaussian: () => number;
  nextPoisson: (lambda: number) => number;
  getCounter: () => number;
}

export function createCounterRng(seed: number, startCounter: number): CounterRng {
  let counter = startCounter >>> 0;
  let buffer: number[] = [];

  const nextUint32 = (): number => {
    if (buffer.length === 0) {
      const [r0, r1, r2, r3] = philox4x32(seed, counter, 0x51a7e1);
      counter = (counter + 1) >>> 0;
      buffer = [r3, r2, r1, r0];
    }
    return buffer.pop()! >>> 0;
  };

  const nextUniform = (): number => {
    // Open-closed (0, 1) avoids log(0) in Box-Muller / Gillespie exponential sampling
    return (nextUint32() + 0.5) / 4294967296.0;
  };

  const nextGaussian = (): number => {
    const u1 = Math.max(1e-12, nextUniform());
    const u2 = nextUniform();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  };

  const nextPoisson = (lambda: number): number => {
    if (!Number.isFinite(lambda) || lambda <= 0) return 0;
    // Exact Knuth algorithm for small lambda, normal approximation clamped >= 0 for large lambda
    if (lambda < 30) {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1.0;
      do {
        k++;
        p *= nextUniform();
      } while (p > L && k < 1000);
      return k - 1;
    }
    const sample = Math.round(lambda + Math.sqrt(lambda) * nextGaussian());
    return Math.max(0, sample);
  };

  return {
    nextUniform,
    nextGaussian,
    nextPoisson,
    getCounter: () => counter,
  };
}
