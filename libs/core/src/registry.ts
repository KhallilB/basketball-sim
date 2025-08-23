/**
 * Extensible registration system for badges and traits
 * Allows dynamic registration and lookup without hardcoded dependencies
 */

import { logger } from './logger.js';
import { validateRatings, validateTendencies, ValidationError } from './validation.js';
import type { Badge, Trait, Effect, Predicate, Mod, ProgressRule } from '@basketball-sim/types';

// Registry interfaces
export interface BadgeRegistry {
  register(badge: Badge): void;
  unregister(badgeId: string): boolean;
  get(badgeId: string): Badge | undefined;
  getAll(): Badge[];
  getByTier(tier: 1 | 2 | 3): Badge[];
  findMatching(predicate: Predicate): Badge[];
  validateBadge(badge: Badge): ValidationError[];
}

export interface TraitRegistry {
  register(trait: Trait): void;
  unregister(traitId: string): boolean;
  get(traitId: string): Trait | undefined;
  getAll(): Trait[];
  getByKind(kind: 'archetype' | 'background' | 'quirk'): Trait[];
  getByTags(tags: string[]): Trait[];
  validateTrait(trait: Trait): ValidationError[];
}

// Badge registry implementation
class BadgeRegistryImpl implements BadgeRegistry {
  private badges = new Map<string, Badge>();
  private tierIndex = new Map<number, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();

  register(badge: Badge): void {
    const errors = this.validateBadge(badge);
    if (errors.length > 0) {
      logger.error('REGISTRY', `Failed to register badge ${badge.id}`, { errors });
      throw new ValidationError(`Badge validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Remove existing badge if present
    if (this.badges.has(badge.id)) {
      this.unregister(badge.id);
    }

    // Register badge
    this.badges.set(badge.id, badge);
    
    // Update tier index
    if (!this.tierIndex.has(badge.tier)) {
      this.tierIndex.set(badge.tier, new Set());
    }
    this.tierIndex.get(badge.tier)!.add(badge.id);

    logger.debug('REGISTRY', `Registered badge: ${badge.name} (${badge.id})`, { tier: badge.tier });
  }

  unregister(badgeId: string): boolean {
    const badge = this.badges.get(badgeId);
    if (!badge) return false;

    // Remove from main registry
    this.badges.delete(badgeId);
    
    // Remove from tier index
    this.tierIndex.get(badge.tier)?.delete(badgeId);
    
    logger.debug('REGISTRY', `Unregistered badge: ${badgeId}`);
    return true;
  }

  get(badgeId: string): Badge | undefined {
    return this.badges.get(badgeId);
  }

  getAll(): Badge[] {
    return Array.from(this.badges.values());
  }

  getByTier(tier: 1 | 2 | 3): Badge[] {
    const badgeIds = this.tierIndex.get(tier) || new Set();
    return Array.from(badgeIds).map(id => this.badges.get(id)!).filter(Boolean);
  }

  findMatching(predicate: Predicate): Badge[] {
    return this.getAll().filter(badge => this.matchesPredicate(badge.when, predicate));
  }

  private matchesPredicate(badgePredicate: Predicate, searchPredicate: Predicate): boolean {
    // Check if badge predicate matches search predicate
    for (const [key, value] of Object.entries(searchPredicate)) {
      if (badgePredicate[key] !== undefined && badgePredicate[key] !== value) {
        return false;
      }
    }
    return true;
  }

  validateBadge(badge: Badge): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!badge.id || typeof badge.id !== 'string') {
      errors.push(new ValidationError('Badge ID is required and must be a string', 'id', badge.id));
    }

    if (!badge.name || typeof badge.name !== 'string') {
      errors.push(new ValidationError('Badge name is required and must be a string', 'name', badge.name));
    }

    if (!badge.description || typeof badge.description !== 'string') {
      errors.push(new ValidationError('Badge description is required and must be a string', 'description', badge.description));
    }

    if (![1, 2, 3].includes(badge.tier)) {
      errors.push(new ValidationError('Badge tier must be 1, 2, or 3', 'tier', badge.tier));
    }

    // Validate predicate
    if (!badge.when || typeof badge.when !== 'object') {
      errors.push(new ValidationError('Badge when predicate is required', 'when', badge.when));
    }

    // Validate mods
    if (!Array.isArray(badge.mods)) {
      errors.push(new ValidationError('Badge mods must be an array', 'mods', badge.mods));
    } else {
      badge.mods.forEach((mod, index) => {
        if (!mod.model || typeof mod.model !== 'string') {
          errors.push(new ValidationError(`Mod ${index} must have a valid model`, `mods[${index}].model`, mod.model));
        }
      });
    }

    // Validate progress rules if present
    if (badge.progress) {
      if (!Array.isArray(badge.progress)) {
        errors.push(new ValidationError('Badge progress must be an array', 'progress', badge.progress));
      } else {
        badge.progress.forEach((rule, index) => {
          if (!rule.stat || typeof rule.stat !== 'string') {
            errors.push(new ValidationError(`Progress rule ${index} must have a valid stat`, `progress[${index}].stat`, rule.stat));
          }
          if (typeof rule.count !== 'number' || rule.count <= 0) {
            errors.push(new ValidationError(`Progress rule ${index} must have a positive count`, `progress[${index}].count`, rule.count));
          }
          if (![1, 2, 3].includes(rule.tier)) {
            errors.push(new ValidationError(`Progress rule ${index} tier must be 1, 2, or 3`, `progress[${index}].tier`, rule.tier));
          }
        });
      }
    }

    return errors;
  }
}

// Trait registry implementation
class TraitRegistryImpl implements TraitRegistry {
  private traits = new Map<string, Trait>();
  private kindIndex = new Map<string, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();

  register(trait: Trait): void {
    const errors = this.validateTrait(trait);
    if (errors.length > 0) {
      logger.error('REGISTRY', `Failed to register trait ${trait.id}`, { errors });
      throw new ValidationError(`Trait validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Remove existing trait if present
    if (this.traits.has(trait.id)) {
      this.unregister(trait.id);
    }

    // Register trait
    this.traits.set(trait.id, trait);
    
    // Update kind index
    if (!this.kindIndex.has(trait.kind)) {
      this.kindIndex.set(trait.kind, new Set());
    }
    this.kindIndex.get(trait.kind)!.add(trait.id);

    // Update tag index
    if (trait.tags) {
      trait.tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(trait.id);
      });
    }

    logger.debug('REGISTRY', `Registered trait: ${trait.name} (${trait.id})`, { kind: trait.kind, tags: trait.tags });
  }

  unregister(traitId: string): boolean {
    const trait = this.traits.get(traitId);
    if (!trait) return false;

    // Remove from main registry
    this.traits.delete(traitId);
    
    // Remove from kind index
    this.kindIndex.get(trait.kind)?.delete(traitId);
    
    // Remove from tag index
    if (trait.tags) {
      trait.tags.forEach(tag => {
        this.tagIndex.get(tag)?.delete(traitId);
      });
    }
    
    logger.debug('REGISTRY', `Unregistered trait: ${traitId}`);
    return true;
  }

  get(traitId: string): Trait | undefined {
    return this.traits.get(traitId);
  }

  getAll(): Trait[] {
    return Array.from(this.traits.values());
  }

  getByKind(kind: 'archetype' | 'background' | 'quirk'): Trait[] {
    const traitIds = this.kindIndex.get(kind) || new Set();
    return Array.from(traitIds).map(id => this.traits.get(id)!).filter(Boolean);
  }

  getByTags(tags: string[]): Trait[] {
    if (tags.length === 0) return [];
    
    // Find traits that have ALL specified tags
    let matchingIds: Set<string> | undefined;
    
    for (const tag of tags) {
      const traitsWithTag = this.tagIndex.get(tag) || new Set();
      if (!matchingIds) {
        matchingIds = new Set(traitsWithTag);
      } else {
        matchingIds = new Set([...matchingIds].filter(id => traitsWithTag.has(id)));
      }
    }
    
    return Array.from(matchingIds || []).map(id => this.traits.get(id)!).filter(Boolean);
  }

  validateTrait(trait: Trait): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!trait.id || typeof trait.id !== 'string') {
      errors.push(new ValidationError('Trait ID is required and must be a string', 'id', trait.id));
    }

    if (!trait.name || typeof trait.name !== 'string') {
      errors.push(new ValidationError('Trait name is required and must be a string', 'name', trait.name));
    }

    if (!trait.description || typeof trait.description !== 'string') {
      errors.push(new ValidationError('Trait description is required and must be a string', 'description', trait.description));
    }

    if (!['archetype', 'background', 'quirk'].includes(trait.kind)) {
      errors.push(new ValidationError('Trait kind must be archetype, background, or quirk', 'kind', trait.kind));
    }

    // Validate effects
    if (!Array.isArray(trait.effects)) {
      errors.push(new ValidationError('Trait effects must be an array', 'effects', trait.effects));
    } else {
      trait.effects.forEach((effect, index) => {
        const effectErrors = this.validateEffect(effect, index);
        errors.push(...effectErrors);
      });
    }

    // Validate tags if present
    if (trait.tags && !Array.isArray(trait.tags)) {
      errors.push(new ValidationError('Trait tags must be an array', 'tags', trait.tags));
    }

    return errors;
  }

  private validateEffect(effect: Effect, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `effects[${index}]`;

    if (!effect.type || typeof effect.type !== 'string') {
      errors.push(new ValidationError(`Effect ${index} must have a valid type`, `${prefix}.type`, effect.type));
      return errors; // Can't validate further without type
    }

    switch (effect.type) {
      case 'ratings':
        if (!effect.path || typeof effect.path !== 'string') {
          errors.push(new ValidationError(`Rating effect ${index} must have a valid path`, `${prefix}.path`, effect.path));
        }
        if (effect.add !== undefined && typeof effect.add !== 'number') {
          errors.push(new ValidationError(`Rating effect ${index} add must be a number`, `${prefix}.add`, effect.add));
        }
        if (effect.mul !== undefined && typeof effect.mul !== 'number') {
          errors.push(new ValidationError(`Rating effect ${index} mul must be a number`, `${prefix}.mul`, effect.mul));
        }
        break;

      case 'tendency':
        if (!effect.group || typeof effect.group !== 'string') {
          errors.push(new ValidationError(`Tendency effect ${index} must have a valid group`, `${prefix}.group`, effect.group));
        }
        if (effect.add !== undefined && typeof effect.add !== 'number') {
          errors.push(new ValidationError(`Tendency effect ${index} add must be a number`, `${prefix}.add`, effect.add));
        }
        break;

      case 'policy':
        if (!effect.key || typeof effect.key !== 'string') {
          errors.push(new ValidationError(`Policy effect ${index} must have a valid key`, `${prefix}.key`, effect.key));
        }
        if (typeof effect.add !== 'number') {
          errors.push(new ValidationError(`Policy effect ${index} add must be a number`, `${prefix}.add`, effect.add));
        }
        break;

      case 'growth':
        if (!effect.target || typeof effect.target !== 'string') {
          errors.push(new ValidationError(`Growth effect ${index} must have a valid target`, `${prefix}.target`, effect.target));
        }
        if (typeof effect.slope !== 'number') {
          errors.push(new ValidationError(`Growth effect ${index} slope must be a number`, `${prefix}.slope`, effect.slope));
        }
        break;

      case 'relationship':
        if (!effect.key || !['coachTrust', 'morale', 'rep'].includes(effect.key)) {
          errors.push(new ValidationError(`Relationship effect ${index} must have a valid key`, `${prefix}.key`, effect.key));
        }
        if (typeof effect.add !== 'number') {
          errors.push(new ValidationError(`Relationship effect ${index} add must be a number`, `${prefix}.add`, effect.add));
        }
        break;

      default:
        errors.push(new ValidationError(`Unknown effect type: ${effect.type}`, `${prefix}.type`, effect.type));
    }

    return errors;
  }
}

// Singleton instances
export const badgeRegistry: BadgeRegistry = new BadgeRegistryImpl();
export const traitRegistry: TraitRegistry = new TraitRegistryImpl();

// Utility functions for bulk operations
export function registerBadges(badges: Badge[]): { success: number; failed: number; errors: ValidationError[] } {
  let success = 0;
  let failed = 0;
  const errors: ValidationError[] = [];

  for (const badge of badges) {
    try {
      badgeRegistry.register(badge);
      success++;
    } catch (error) {
      failed++;
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        errors.push(new ValidationError(`Unexpected error registering badge ${badge.id}: ${error}`));
      }
    }
  }

  logger.info('REGISTRY', `Bulk badge registration complete`, { success, failed, total: badges.length });
  return { success, failed, errors };
}

export function registerTraits(traits: Trait[]): { success: number; failed: number; errors: ValidationError[] } {
  let success = 0;
  let failed = 0;
  const errors: ValidationError[] = [];

  for (const trait of traits) {
    try {
      traitRegistry.register(trait);
      success++;
    } catch (error) {
      failed++;
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        errors.push(new ValidationError(`Unexpected error registering trait ${trait.id}: ${error}`));
      }
    }
  }

  logger.info('REGISTRY', `Bulk trait registration complete`, { success, failed, total: traits.length });
  return { success, failed, errors };
}

// Plugin system for dynamic loading
export interface RegistryPlugin {
  name: string;
  version: string;
  badges?: Badge[];
  traits?: Trait[];
  initialize?(): void;
  cleanup?(): void;
}

class PluginManager {
  private plugins = new Map<string, RegistryPlugin>();

  register(plugin: RegistryPlugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn('REGISTRY', `Plugin ${plugin.name} is already registered, replacing`);
      this.unregister(plugin.name);
    }

    // Register badges and traits
    if (plugin.badges) {
      const result = registerBadges(plugin.badges);
      if (result.failed > 0) {
        logger.error('REGISTRY', `Plugin ${plugin.name} badge registration failed`, result.errors);
      }
    }

    if (plugin.traits) {
      const result = registerTraits(plugin.traits);
      if (result.failed > 0) {
        logger.error('REGISTRY', `Plugin ${plugin.name} trait registration failed`, result.errors);
      }
    }

    // Initialize plugin
    if (plugin.initialize) {
      try {
        plugin.initialize();
      } catch (error) {
        logger.error('REGISTRY', `Plugin ${plugin.name} initialization failed`, { error });
        return;
      }
    }

    this.plugins.set(plugin.name, plugin);
    logger.info('REGISTRY', `Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;

    // Cleanup plugin
    if (plugin.cleanup) {
      try {
        plugin.cleanup();
      } catch (error) {
        logger.error('REGISTRY', `Plugin ${pluginName} cleanup failed`, { error });
      }
    }

    // Remove badges and traits
    if (plugin.badges) {
      plugin.badges.forEach(badge => badgeRegistry.unregister(badge.id));
    }

    if (plugin.traits) {
      plugin.traits.forEach(trait => traitRegistry.unregister(trait.id));
    }

    this.plugins.delete(pluginName);
    logger.info('REGISTRY', `Plugin unregistered: ${pluginName}`);
    return true;
  }

  getPlugin(name: string): RegistryPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): RegistryPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginManager = new PluginManager();

// Export everything
export { BadgeRegistryImpl, TraitRegistryImpl, PluginManager };
export default { badgeRegistry, traitRegistry, pluginManager };
