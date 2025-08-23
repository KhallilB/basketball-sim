/**
 * Performance monitoring and caching system
 * Provides optimization for expensive calculations and performance tracking
 */

import { logger, performanceLogger } from './logger.js';
import {
  Badge,
  Position,
  Tendencies,
  TendencyDistributions,
  BadgeModifiers,
  BadgeContext
} from '@basketball-sim/types';
import { CONFIG } from './config.js';

// Cache interface
export interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  stats(): CacheStats;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

// LRU Cache implementation
export class LRUCache<K, V> implements Cache<K, V> {
  private cache = new Map<K, V>();
  private accessOrder = new Map<K, number>();
  private accessCounter = 0;
  private hits = 0;
  private misses = 0;

  constructor(private maxSize: number = CONFIG.PERFORMANCE.MAX_CACHE_SIZE) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      this.accessOrder.set(key, ++this.accessCounter);
      performanceLogger.cache('get', true, this.cache.size);
      return value;
    }

    this.misses++;
    performanceLogger.cache('get', false, this.cache.size);
    return undefined;
  }

  set(key: K, value: V): void {
    // If at capacity and key doesn't exist, remove LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.hits = 0;
    this.misses = 0;
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.delete(lruKey);
    }
  }
}

// Performance timer utility
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.duration();
  }

  duration(): number {
    const end = this.endTime || performance.now();
    return end - this.startTime;
  }

  static time<T>(operation: string, fn: () => T): T {
    const timer = new PerformanceTimer();
    try {
      const result = fn();
      const duration = timer.stop();
      performanceLogger.timing(operation, duration);
      return result;
    } catch (error) {
      const duration = timer.stop();
      performanceLogger.timing(`${operation} (ERROR)`, duration);
      throw error;
    }
  }

  static async timeAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const timer = new PerformanceTimer();
    try {
      const result = await fn();
      const duration = timer.stop();
      performanceLogger.timing(operation, duration);
      return result;
    } catch (error) {
      const duration = timer.stop();
      performanceLogger.timing(`${operation} (ERROR)`, duration);
      throw error;
    }
  }
}

// Memoization decorator
export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  keyGenerator?: (...args: Args) => string,
  cacheSize?: number
): (...args: Args) => Return {
  const cache = new LRUCache<string, Return>(cacheSize);
  const defaultKeyGen = (...args: Args) => JSON.stringify(args);
  const keyGen = keyGenerator || defaultKeyGen;

  return (...args: Args): Return => {
    const key = keyGen(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Cached calculation utilities for basketball simulation
export class SimulationCache {
  private tendencyDistributionCache = new LRUCache<string, TendencyDistributions>(100);
  private badgeLookupCache = new LRUCache<string, BadgeModifiers>(500);
  private shotQualityCache = new LRUCache<string, number>(200);
  private spacingCache = new LRUCache<string, number>(150);

  // Cache tendency distributions (expensive Dirichlet/Beta calculations)
  getTendencyDistribution(tendencies: Tendencies): TendencyDistributions | undefined {
    const key = JSON.stringify(tendencies);
    const distribution = this.tendencyDistributionCache.get(key);

    if (!distribution && CONFIG.PERFORMANCE.CACHE_TENDENCY_DISTRIBUTIONS) {
      // This would call the actual initializeTendencyDistributions function
      // distribution = initializeTendencyDistributions(tendencies);
      // this.tendencyDistributionCache.set(key, distribution);
    }

    return distribution;
  }

  // Cache badge lookups
  getBadgeModifiers(badges: Badge[], context: BadgeContext): BadgeModifiers | undefined {
    if (!CONFIG.PERFORMANCE.CACHE_BADGE_LOOKUPS) {
      return undefined; // Skip caching
    }

    const key = JSON.stringify({ badges: badges.map(b => b.id), context });
    return this.badgeLookupCache.get(key);
  }

  setBadgeModifiers(badges: Badge[], context: BadgeContext, modifiers: BadgeModifiers): void {
    if (!CONFIG.PERFORMANCE.CACHE_BADGE_LOOKUPS) {
      return;
    }

    const key = JSON.stringify({ badges: badges.map(b => b.id), context });
    this.badgeLookupCache.set(key, modifiers);
  }

  // Cache shot quality calculations
  getShotQuality(shooterPos: Position, defenderPos: Position, isOffense: boolean): number | undefined {
    const key = JSON.stringify({ shooterPos, defenderPos, isOffense });
    return this.shotQualityCache.get(key);
  }

  setShotQuality(shooterPos: Position, defenderPos: Position, isOffense: boolean, quality: number): void {
    const key = JSON.stringify({ shooterPos, defenderPos, isOffense });
    this.shotQualityCache.set(key, quality);
  }

  // Cache spacing calculations
  getSpacing(positions: Position[]): number | undefined {
    const key = JSON.stringify(positions);
    return this.spacingCache.get(key);
  }

  setSpacing(positions: Position[], spacing: number): void {
    const key = JSON.stringify(positions);
    this.spacingCache.set(key, spacing);
  }

  // Clear all caches
  clearAll(): void {
    this.tendencyDistributionCache.clear();
    this.badgeLookupCache.clear();
    this.shotQualityCache.clear();
    this.spacingCache.clear();
    logger.info('PERFORMANCE', 'All caches cleared');
  }

  // Get cache statistics
  getStats(): Record<string, CacheStats> {
    return {
      tendencyDistribution: this.tendencyDistributionCache.stats(),
      badgeLookup: this.badgeLookupCache.stats(),
      shotQuality: this.shotQualityCache.stats(),
      spacing: this.spacingCache.stats()
    };
  }
}

// Performance monitoring system
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private counters = new Map<string, number>();

  // Record a timing metric
  recordTiming(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    const timings = this.metrics.get(operation);
    if (timings) {
      timings.push(duration);
    }
  }

  // Increment a counter
  incrementCounter(name: string, amount = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + amount);
  }

  // Get timing statistics
  getTimingStats(
    operation: string
  ): { count: number; avg: number; min: number; max: number; total: number } | undefined {
    const timings = this.metrics.get(operation);
    if (!timings || timings.length === 0) return undefined;

    const total = timings.reduce((sum, t) => sum + t, 0);
    const avg = total / timings.length;
    const min = Math.min(...timings);
    const max = Math.max(...timings);

    return { count: timings.length, avg, min, max, total };
  }

  // Get counter value
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  // Get all metrics
  getAllMetrics(): {
    timings: Record<string, { count: number; avg: number; min: number; max: number; total: number }>;
    counters: Record<string, number>;
  } {
    const timings: Record<string, { count: number; avg: number; min: number; max: number; total: number }> = {};
    for (const operation of this.metrics.keys()) {
      const stats = this.getTimingStats(operation);
      if (stats) {
        timings[operation] = stats;
      }
    }

    const counters: Record<string, number> = {};
    for (const [name, value] of this.counters) {
      counters[name] = value;
    }

    return { timings, counters };
  }

  // Reset all metrics
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }

  // Log performance summary
  logSummary(): void {
    const metrics = this.getAllMetrics();

    logger.info('PERFORMANCE', 'Performance Summary', {
      timings: Object.keys(metrics.timings).length,
      counters: Object.keys(metrics.counters).length
    });

    // Log top 5 slowest operations
    const sortedTimings = Object.entries(metrics.timings)
      .filter(([, stats]) => stats !== undefined)
      .sort(([, a], [, b]) => (b as { avg: number }).avg - (a as { avg: number }).avg)
      .slice(0, 5);

    if (sortedTimings.length > 0) {
      logger.info('PERFORMANCE', 'Slowest Operations:');
      sortedTimings.forEach(([operation, stats]) => {
        logger.info(
          'PERFORMANCE',
          `  ${operation}: ${(stats as { avg: number }).avg.toFixed(2)}ms avg (${
            (stats as { count: number }).count
          } calls)`
        );
      });
    }

    // Log counters
    if (Object.keys(metrics.counters).length > 0) {
      logger.info('PERFORMANCE', 'Counters:', metrics.counters);
    }
  }
}

// Singleton instances
export const simulationCache = new SimulationCache();
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export function withPerformanceTracking<T>(operation: string, fn: () => T): T {
  return PerformanceTimer.time(operation, () => {
    performanceMonitor.incrementCounter(`${operation}_calls`);
    const result = fn();
    return result;
  });
}

export async function withPerformanceTrackingAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return PerformanceTimer.timeAsync(operation, async () => {
    performanceMonitor.incrementCounter(`${operation}_calls`);
    const result = await fn();
    return result;
  });
}

// Memory usage monitoring
export function getMemoryUsage(): { used: number; total: number; percentage: number } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024), // MB
      total: Math.round(usage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    };
  }

  return { used: 0, total: 0, percentage: 0 };
}

export function logMemoryUsage(operation?: string): void {
  const usage = getMemoryUsage();
  const message = operation ? `Memory usage after ${operation}` : 'Current memory usage';
  performanceLogger.memory(message, usage.used);
}

// Export all utilities
export default { simulationCache, performanceMonitor, PerformanceTimer, withPerformanceTracking };
