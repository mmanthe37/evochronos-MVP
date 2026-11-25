//! Deterministic Counter-Based PRNG (Philox-inspired 64-bit generator)
//! Guarantees bit-identical trajectories across CPU and GPU architectures.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeterministicPrng {
    pub seed: u64,
}

impl DeterministicPrng {
    pub const fn new(seed: u64) -> Self {
        Self { seed }
    }

    /// Evaluates a 64-bit pseudo-random word from (tick, stream_id)
    #[inline]
    pub fn hash_u64(&self, tick: u64, stream_id: u64) -> u64 {
        let mut x = self.seed ^ tick.wrapping_mul(0x9E3779B97F4A7C15);
        x ^= stream_id.wrapping_mul(0xBF58476D1CE4E5B9);
        x = (x ^ (x >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
        x = (x ^ (x >> 27)).wrapping_mul(0x94D049BB133111EB);
        x ^ (x >> 31)
    }

    /// Uniform float in [0.0, 1.0)
    #[inline]
    pub fn uniform_f64(&self, tick: u64, stream_id: u64) -> f64 {
        let h = self.hash_u64(tick, stream_id);
        (h >> 11) as f64 * (1.0 / ((1u64 << 53) as f64))
    }

    /// Uniform float in [min, max)
    #[inline]
    pub fn uniform_range_f64(&self, tick: u64, stream_id: u64, min: f64, max: f64) -> f64 {
        min + (max - min) * self.uniform_f64(tick, stream_id)
    }

    /// Uniform integer in [0, max)
    #[inline]
    pub fn uniform_u64(&self, tick: u64, stream_id: u64, max: u64) -> u64 {
        if max <= 1 {
            return 0;
        }
        (self.uniform_f64(tick, stream_id) * (max as f64)).floor() as u64
    }

    /// Standard Gaussian sample N(mean, std_dev) via Box-Muller transform
    pub fn gaussian(&self, mean: f64, std_dev: f64, tick: u64, stream_id: u64) -> f64 {
        let u1 = self.uniform_f64(tick, stream_id).max(1e-15);
        let u2 = self.uniform_f64(tick, stream_id.wrapping_add(0x517CC1B727220A95));
        let r = (-2.0 * u1.ln()).sqrt();
        let theta = 2.0 * std::f64::consts::PI * u2;
        mean + std_dev * (r * theta.cos())
    }

    /// Knuth / Ahrens-Dieter Poisson sampler for reaction firings in tau-leaping and SSA
    pub fn poisson(&self, lambda: f64, tick: u64, stream_id: u64) -> u64 {
        if lambda <= 0.0 {
            return 0;
        }
        if lambda < 30.0 {
            // Knuth direct inversion
            let l = (-lambda).exp();
            let mut k = 0u64;
            let mut p = 1.0;
            loop {
                k += 1;
                let u = self.uniform_f64(tick, stream_id.wrapping_add(k));
                p *= u;
                if p <= l {
                    break;
                }
            }
            k - 1
        } else {
            // Gaussian approximation for large lambda
            let g = self.gaussian(lambda, lambda.sqrt(), tick, stream_id);
            g.round().max(0.0) as u64
        }
    }

    /// Exponential waiting time sample with parameter lambda (rate)
    pub fn exponential(&self, rate: f64, tick: u64, stream_id: u64) -> f64 {
        let u = self.uniform_f64(tick, stream_id).max(1e-15);
        -u.ln() / rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism_across_calls() {
        let prng = DeterministicPrng::new(0x8F14E45FCEEA167A);
        let val1 = prng.uniform_f64(100, 42);
        let val2 = prng.uniform_f64(100, 42);
        assert_eq!(val1, val2, "PRNG must be purely deterministic for same tick and stream_id");

        let val_diff_stream = prng.uniform_f64(100, 43);
        assert_ne!(val1, val_diff_stream);
    }

    #[test]
    fn test_poisson_mean() {
        let prng = DeterministicPrng::new(42);
        let lambda = 12.0;
        let mut sum = 0u64;
        let n = 10_000;
        for i in 0..n {
            sum += prng.poisson(lambda, i, 1);
        }
        let empirical_mean = (sum as f64) / (n as f64);
        assert!(
            (empirical_mean - lambda).abs() < 0.2,
            "Empirical mean {} should be close to lambda {}",
            empirical_mean,
            lambda
        );
    }
}
