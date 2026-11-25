import {
  ELEMENTS,
  ElementalPools,
  ElementalVector,
  ElementSymbol,
  POOL_NAMES,
  PoolName,
  SerializedElementalPools,
  SerializedElementalVector,
} from './types';

export function zeroVector(): ElementalVector {
  return {
    C: 0n,
    H: 0n,
    O: 0n,
    N: 0n,
    P: 0n,
    S: 0n,
    Fe: 0n,
  };
}

export function cloneVector(v: ElementalVector): ElementalVector {
  return {
    C: v.C,
    H: v.H,
    O: v.O,
    N: v.N,
    P: v.P,
    S: v.S,
    Fe: v.Fe,
  };
}

export function clonePools(pools: ElementalPools): ElementalPools {
  return {
    abiotic: cloneVector(pools.abiotic),
    biomass: cloneVector(pools.biomass),
    detritus: cloneVector(pools.detritus),
    atmosphere: cloneVector(pools.atmosphere),
  };
}

export function addVectors(a: ElementalVector, b: ElementalVector): ElementalVector {
  return {
    C: a.C + b.C,
    H: a.H + b.H,
    O: a.O + b.O,
    N: a.N + b.N,
    P: a.P + b.P,
    S: a.S + b.S,
    Fe: a.Fe + b.Fe,
  };
}

export function subVectors(a: ElementalVector, b: ElementalVector): ElementalVector {
  return {
    C: a.C - b.C,
    H: a.H - b.H,
    O: a.O - b.O,
    N: a.N - b.N,
    P: a.P - b.P,
    S: a.S - b.S,
    Fe: a.Fe - b.Fe,
  };
}

export function scaleVector(v: ElementalVector, k: bigint): ElementalVector {
  return {
    C: v.C * k,
    H: v.H * k,
    O: v.O * k,
    N: v.N * k,
    P: v.P * k,
    S: v.S * k,
    Fe: v.Fe * k,
  };
}

export function sumPools(pools: ElementalPools): ElementalVector {
  const total = zeroVector();
  for (const pool of POOL_NAMES) {
    for (const el of ELEMENTS) {
      total[el] += pools[pool][el];
    }
  }
  return total;
}

export function computeDrift(
  pools: ElementalPools,
  initialTotal: ElementalVector
): ElementalVector {
  return subVectors(sumPools(pools), initialTotal);
}

export function hasNonZeroDrift(drift: ElementalVector): boolean {
  for (const el of ELEMENTS) {
    if (drift[el] !== 0n) return true;
  }
  return false;
}

export function totalDriftMagnitude(drift: ElementalVector): bigint {
  let acc = 0n;
  for (const el of ELEMENTS) {
    const val = drift[el];
    acc += val < 0n ? -val : val;
  }
  return acc;
}

export function hasNegativePool(pools: ElementalPools): { pool: PoolName; el: ElementSymbol } | null {
  for (const pool of POOL_NAMES) {
    for (const el of ELEMENTS) {
      if (pools[pool][el] < 0n) {
        return { pool, el };
      }
    }
  }
  return null;
}

/**
 * Computes the maximum integer multiple of `stoich` available in `source`.
 */
export function maxAvailableReactionUnits(
  source: ElementalVector,
  stoich: ElementalVector,
  requested: bigint
): bigint {
  if (requested <= 0n) return 0n;
  let maxUnits = requested;
  for (const el of ELEMENTS) {
    const req = stoich[el];
    if (req > 0n) {
      const avail = source[el] / req;
      if (avail < maxUnits) {
        maxUnits = avail;
      }
    }
  }
  return maxUnits < 0n ? 0n : maxUnits;
}

/**
 * Closed conservative atomic transfer between two pools.
 * Returns the exact number of stoichiometric units transferred (clamped so source never goes negative).
 */
export function transferStoichiometricUnits(
  pools: ElementalPools,
  from: PoolName,
  to: PoolName,
  unitStoich: ElementalVector,
  requestedUnits: bigint
): bigint {
  if (from === to || requestedUnits <= 0n) return 0n;
  const units = maxAvailableReactionUnits(pools[from], unitStoich, requestedUnits);
  if (units <= 0n) return 0n;

  for (const el of ELEMENTS) {
    const delta = unitStoich[el] * units;
    pools[from][el] -= delta;
    pools[to][el] += delta;
  }
  return units;
}

/**
 * Transfers an exact elemental vector (clamped element-wise to source availability).
 * Always adds the exact same integer subtracted from `from` into `to`.
 */
export function transferAvailableAtoms(
  pools: ElementalPools,
  from: PoolName,
  to: PoolName,
  requested: ElementalVector
): ElementalVector {
  const actual = zeroVector();
  if (from === to) return actual;

  for (const el of ELEMENTS) {
    const req = requested[el];
    if (req <= 0n) continue;
    const avail = pools[from][el];
    const moved = req <= avail ? req : avail;
    if (moved > 0n) {
      pools[from][el] -= moved;
      pools[to][el] += moved;
      actual[el] = moved;
    }
  }
  return actual;
}

export interface ConservationAudit {
  ok: boolean;
  total: ElementalVector;
  drift: ElementalVector;
  message: string | null;
}

export function verifyConservation(
  pools: ElementalPools,
  initialTotal: ElementalVector
): ConservationAudit {
  const total = sumPools(pools);
  const drift = subVectors(total, initialTotal);
  const neg = hasNegativePool(pools);

  if (neg) {
    return {
      ok: false,
      total,
      drift,
      message: `Invariant violation: negative atom count detected in pool '${neg.pool}' for element ${neg.el}.`,
    };
  }

  if (hasNonZeroDrift(drift)) {
    const details = ELEMENTS.filter((el) => drift[el] !== 0n)
      .map((el) => `${el}:${drift[el] > 0n ? '+' : ''}${drift[el].toString()}`)
      .join(', ');
    return {
      ok: false,
      total,
      drift,
      message: `Invariant violation: non-zero elemental drift detected (${details}). Simulation halted.`,
    };
  }

  return {
    ok: true,
    total,
    drift,
    message: null,
  };
}

export function createDefaultInitialPools(): ElementalPools {
  return {
    abiotic: {
      C: 6_000_000n,
      H: 18_000_000n,
      O: 8_000_000n,
      N: 1_500_000n,
      P: 250_000n,
      S: 200_000n,
      Fe: 120_000n,
    },
    biomass: zeroVector(),
    detritus: zeroVector(),
    atmosphere: {
      C: 4_000_000n,
      H: 12_000_000n,
      O: 6_000_000n,
      N: 500_000n,
      P: 0n,
      S: 50_000n,
      Fe: 0n,
    },
  };
}

export function serializeVector(v: ElementalVector): SerializedElementalVector {
  return {
    C: v.C.toString(),
    H: v.H.toString(),
    O: v.O.toString(),
    N: v.N.toString(),
    P: v.P.toString(),
    S: v.S.toString(),
    Fe: v.Fe.toString(),
  };
}

export function deserializeVector(v: SerializedElementalVector): ElementalVector {
  return {
    C: BigInt(v.C),
    H: BigInt(v.H),
    O: BigInt(v.O),
    N: BigInt(v.N),
    P: BigInt(v.P),
    S: BigInt(v.S),
    Fe: BigInt(v.Fe),
  };
}

export function serializePools(pools: ElementalPools): SerializedElementalPools {
  return {
    abiotic: serializeVector(pools.abiotic),
    biomass: serializeVector(pools.biomass),
    detritus: serializeVector(pools.detritus),
    atmosphere: serializeVector(pools.atmosphere),
  };
}

export function deserializePools(pools: SerializedElementalPools): ElementalPools {
  return {
    abiotic: deserializeVector(pools.abiotic),
    biomass: deserializeVector(pools.biomass),
    detritus: deserializeVector(pools.detritus),
    atmosphere: deserializeVector(pools.atmosphere),
  };
}

export function formatBigIntCompact(n: bigint): string {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const s = abs.toString();
  const formatted = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `-${formatted}` : formatted;
}
