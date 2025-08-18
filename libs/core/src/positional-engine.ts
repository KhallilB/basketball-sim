import { XRng } from '@basketball-sim/random';
import { chooseAction } from '@basketball-sim/policy';
import {
  Player,
  Team,
  PossessionState,
  PositionalPossessionState,
  Action,
  DefensiveScheme,
  GameSituation,
  GameStats,
  PlayOutcome,
  Id
} from '@basketball-sim/types';
import {
  driveBlowbyP,
  passCompleteP,
  reboundWeight,
  shootingFoulP,
  shotMakeP,
  determineShotTrajectory,
  determineBoxOuts,
  createReboundParticipants,
  resolveReboundCompetition,
  initializeGameStats,
  recordPlay,
  updatePossessions
} from '@basketball-sim/models';
import { PARAMS } from '@basketball-sim/params';
import {
  calculateOpenLanes,
  calculateShotQuality,
  getShotZone,
  distance,
  calculateReboundLocation
} from '@basketball-sim/math';
import { DefensiveCoordinator } from './defense.js';
import { FormationManager } from './formation.js';

type PositionalCtx = {
  off: Team;
  def: Team;
  with: Player;
  state: PositionalPossessionState;
  rng: XRng;
  coordinator: DefensiveCoordinator;
  formationManager: FormationManager;
  gameStats: GameStats;
  isHomeTeam: boolean;
};

/**
 * Enhanced possession engine with spatial awareness and positioning
 */
export class PositionalPossessionEngine {
  private coordinator = new DefensiveCoordinator();
  private formationManager = new FormationManager();

  run(off: Team, def: Team, state: PossessionState, scheme: DefensiveScheme = 'man', gameStats?: GameStats): { state: PositionalPossessionState; gameStats: GameStats } {
    const rng = new XRng(state.seed ^ (state.poss * 7919));
    const player = off.players.find(p => p.id === state.ball);

    if (!player) {
      throw new Error(`Player with ID ${state.ball} not found in offensive team`);
    }

    // Initialize formations if not present
    const offFormation = this.formationManager.createOffensiveFormation(off, true);
    const defFormation = this.formationManager.createDefensiveFormation(def, scheme, offFormation, false);

    // Create defensive assignments
    const defensiveAssignments = this.coordinator.assignDefenders(off, def, scheme, offFormation);

    // Calculate initial spacing metrics
    const spacing = this.calculateSpacing(offFormation, defFormation);

    const positionalState: PositionalPossessionState = {
      ...state,
      formation: offFormation,
      defensiveAssignments,
      spacing
    };

    // Initialize or use provided game stats
    const stats = gameStats || initializeGameStats(state.gameId, off, def);
    
    // FIXED: Determine home team based on team ID, not current offense
    // The first team passed to initializeGameStats is always home team
    const isHomeTeam = off.id === stats.homeTeam.teamId;

    const ctx: PositionalCtx = {
      off,
      def,
      with: player,
      state: positionalState,
      rng,
      coordinator: this.coordinator,
      formationManager: this.formationManager,
      gameStats: stats,
      isHomeTeam
    };

    // Main possession loop with positioning
    let live = true;
    while (live && ctx.state.shotClock > 0 && ctx.state.clock.sec > 0) {
      const action = this.choose(ctx);
      const result = this.resolve(action, ctx);
      
      // Record the play in stats
      const playerPos = ctx.state.formation.players[ctx.with.id];
      recordPlay(ctx.gameStats, ctx.state.poss, ctx.with.id, action, result as PlayOutcome, playerPos, ctx.isHomeTeam, ctx.state.clock.sec);
      
      this.advanceFatigue(ctx, action);
      this.updatePositions(ctx, action);
      live = this.advanceClockAndState(ctx, action, result);
    }

    // Shot clock violation handling - force a shot
    if (ctx.state.shotClock <= 0 && ctx.state.clock.sec > 0) {
      console.log('Shot clock violation - forcing desperation shot');
      const desperationResult = this.resolve('pullup', ctx);
      this.advanceClockAndState(ctx, 'pullup', desperationResult);
    }

    // Update possession count at the end
    updatePossessions(ctx.gameStats, ctx.isHomeTeam);
    
    return { state: ctx.state, gameStats: ctx.gameStats };
  }

  private choose(ctx: PositionalCtx): Action {
    // Create game situation for EPV calculation
    const situation: GameSituation = {
      shotClock: ctx.state.shotClock,
      gameTime: ctx.state.clock.sec,
      scoreDiff: ctx.state.score.off - ctx.state.score.def,
      quarter: ctx.state.clock.quarter,
      fouls: {
        team: 0, // TODO: Track team fouls
        player: {},
        inBonus: false
      },
      momentum: 0 // TODO: Track momentum
    };

    // Calculate dynamic EPV based on position and situation
    const epv = this.calculateEPV(ctx, situation);

    // Get bias from player tendencies
    const bias = this.getTendencyBias(ctx.with);

    const fatigue = ctx.state.fatigue[ctx.with.id] || 0;
    const action = chooseAction(ctx.with, epv, bias, fatigue).action;

    console.log(`Action chosen: ${action} (EPV: ${epv[action].toFixed(2)})`);
    return action;
  }

  private calculateEPV(ctx: PositionalCtx, situation: GameSituation): Record<Action, number> {
    const playerPos = ctx.state.formation.players[ctx.with.id];

    if (!playerPos) {
      // Fallback to basic EPV if position not found
      return {
        drive: 0.5,
        pullup: 0.2,
        catchShoot: 0.3,
        pnrAttack: 0.35,
        pnrPass: 0.15,
        post: 0.1,
        reset: 0.05
      };
    }

    // Get defender position
    const defenderId = ctx.coordinator.getMatchup(ctx.with.id, ctx.state.defensiveAssignments);
    const defenderPos = defenderId ? ctx.state.formation.players[defenderId] : null;

    // Calculate situational factors
    const shotQuality = calculateShotQuality(playerPos, defenderPos, true);
    const openLanes = ctx.state.spacing.openLanes;
    const shotZone = getShotZone(playerPos, true);

    // Base EPV values adjusted by position and situation
    const baseEPV = {
      drive: 0.5 + openLanes * 0.3, // Better with open lanes
      pullup: 0.3 + shotQuality * 0.4, // Better with good shot quality
      catchShoot: shotZone === 'three' ? 0.4 + shotQuality * 0.5 : 0.35 + shotQuality * 0.4,
      pnrAttack: 0.25 + openLanes * 0.2, // Reduced to encourage more shooting
      pnrPass: 0.15 + ctx.state.spacing.ballMovement * 0.1,
      post: shotZone === 'rim' ? 0.45 : 0.08, // Much better close to basket
      reset: 0.05
    };

    // Adjust for game situation
    if (situation.shotClock < 8) {
      // Shot clock pressure - prefer quicker actions
      baseEPV.catchShoot *= 1.5;
      baseEPV.pullup *= 1.4;
      baseEPV.drive *= 1.3;
      baseEPV.pnrAttack *= 0.7; // Reduce ball movement actions
      baseEPV.pnrPass *= 0.5;
      baseEPV.reset *= 0.2;
    }

    if (situation.shotClock < 4) {
      // Desperation time - must shoot
      baseEPV.catchShoot *= 2.0;
      baseEPV.pullup *= 2.0;
      baseEPV.drive *= 1.8;
      baseEPV.pnrAttack *= 0.3;
      baseEPV.pnrPass *= 0.1;
      baseEPV.reset *= 0.1;
      baseEPV.post *= 0.5;
    }

    if (Math.abs(situation.scoreDiff) > 10) {
      // Blowout situation - different strategy
      if (situation.scoreDiff > 10) {
        // Leading - play safer
        baseEPV.reset *= 1.2;
        baseEPV.drive *= 0.9;
      } else {
        // Trailing - more aggressive
        baseEPV.drive *= 1.1;
        baseEPV.catchShoot *= 1.1;
      }
    }

    return baseEPV;
  }

  private getTendencyBias(player: Player): Record<Action, number> {
    const tendencies = player.tendencies.withBall;

    return {
      drive: (tendencies[0] - 0.2) * 2, // Normalize around 0
      pullup: (tendencies[1] - 0.2) * 2,
      catchShoot: (tendencies[2] - 0.2) * 2,
      pnrAttack: (tendencies[3] - 0.2) * 2,
      pnrPass: (tendencies[4] - 0.2) * 2,
      post: (tendencies[5] - 0.2) * 2,
      reset: (tendencies[6] - 0.2) * 2
    };
  }

  private resolve(action: Action, ctx: PositionalCtx): { kind: string; [key: string]: any } {
    const rOff = ctx.with.ratings;
    const defenderId = ctx.coordinator.getMatchup(ctx.with.id, ctx.state.defensiveAssignments);
    const rDef = defenderId ? ctx.def.players.find(p => p.id === defenderId)?.ratings : ctx.def.players[0].ratings; // Fallback to first defender

    if (!rDef) {
      throw new Error('No defender found');
    }

    const playerPos = ctx.state.formation.players[ctx.with.id];
    const defenderPos = defenderId ? ctx.state.formation.players[defenderId] : null;

    if (action === 'drive') {
      const openLanes = ctx.state.spacing.openLanes;
      const driveAngle = defenderPos ? Math.atan2(defenderPos.y - playerPos!.y, defenderPos.x - playerPos!.x) : 0;

      const blow = driveBlowbyP(rOff, rDef, openLanes, Math.abs(driveAngle));
      const foul = shootingFoulP(rOff, rDef, blow.p > 0.6 ? 0.7 : 0.3, 0.2);

      return {
        kind: 'drive',
        blowby: ctx.rng.next() < blow.p,
        foul: ctx.rng.next() < foul.p,
        explain: blow
      } as const;
    }

    if (action === 'pullup' || action === 'catchShoot') {
      // Use individual shot quality calculation instead of spacing average
      const Q = playerPos ? calculateShotQuality(playerPos, defenderPos, true) : 0.6;
      const contest = defenderPos && playerPos ? Math.max(0, 1 - distance(playerPos, defenderPos) / 6) : 0.2; // Lower default contest
      const fatigue = (ctx.state.fatigue[ctx.with.id] || 0) / 100;
      const zone = playerPos ? getShotZone(playerPos, true) : 'mid';

      const shotContext = {
        Q,
        contest,
        fatigue,
        clutch: 0.0,
        relMod: action === 'catchShoot' ? 0.2 : 0.1,
        zone: zone as 'rim' | 'mid' | 'three'
      };

      const prediction = shotMakeP(rOff, shotContext);
      const foul = shootingFoulP(rOff, rDef, 0.4, contest);
      const make = ctx.rng.next() < prediction.p;

      console.log(
        `Shot: ${zone}, Q=${Q.toFixed(2)}, contest=${contest.toFixed(2)}, P=${prediction.p.toFixed(3)}, made=${make}`
      );

      return {
        kind: 'shot',
        make,
        fouled: ctx.rng.next() < foul.p,
        three: zone === 'three',
        explain: prediction
      } as const;
    }

    if (action === 'pnrPass') {
      // Better pass completion with good spacing
      const baseRisk = 0.4;
      const adjustedRisk = baseRisk * (1 - ctx.state.spacing.ballMovement * 0.3);
      const pressure = defenderPos && playerPos ? Math.max(0, 1 - distance(playerPos, defenderPos) / 8) : 0.5;

      const pass = passCompleteP(rOff, adjustedRisk, pressure);
      const complete = ctx.rng.next() < pass.p;

      if (complete) {
        // Move ball to different player
        const availablePlayers = ctx.off.players.filter(p => p.id !== ctx.with.id);
        if (availablePlayers.length > 0) {
          const targetPlayer = availablePlayers[Math.floor(ctx.rng.next() * availablePlayers.length)];
          ctx.state.ball = targetPlayer.id;
        }
      }

      return {
        kind: 'pass',
        complete,
        turnover: !complete,
        explain: pass
      } as const;
    }

    // Handle remaining actions (reset/post/pnrAttack) - sometimes lead to shots
    const zone = playerPos ? getShotZone(playerPos, true) : 'mid';
    if (action === 'post' && zone === 'rim') {
      // Post moves near rim often result in shots
      if (ctx.rng.next() < 0.6) {
        console.log(`Post move resulted in shot attempt`);
        return this.resolve('pullup', ctx); // Convert to pullup shot
      }
    }

    if (action === 'pnrAttack') {
      // Pick and roll attacks sometimes create shot opportunities
      if (ctx.rng.next() < 0.4) {
        console.log(`PnR attack created shot opportunity`);
        return this.resolve(ctx.rng.next() < 0.6 ? 'pullup' : 'drive', ctx);
      }
    }

    // Default to ball movement
    console.log(`Action ${action} resolved as ball movement`);
    return {
      kind: 'pass',
      complete: true,
      turnover: false,
      explain: { terms: [], score: 0, p: 1 }
    } as const;
  }

  private updatePositions(ctx: PositionalCtx, action: Action) {
    // Simple position updates based on action
    // In a full implementation, this would be much more sophisticated

    if (action === 'drive') {
      // Move ball handler closer to basket
      const ballHandlerPos = ctx.state.formation.players[ctx.with.id];
      if (ballHandlerPos) {
        ballHandlerPos.x = Math.max(0, ballHandlerPos.x - 3);
        ctx.state.formation.ballPosition = ballHandlerPos;
      }
    }

    if (action === 'pnrPass' || action === 'reset') {
      // Ball movement updates spacing
      ctx.state.spacing.ballMovement = Math.min(1, ctx.state.spacing.ballMovement + 0.2);
    }

    // Update defensive positions to react
    this.updateDefensivePositions(ctx);
  }

  private updateDefensivePositions(ctx: PositionalCtx) {
    // Simple defensive reaction - move towards ball
    const ballPos = ctx.state.formation.ballPosition;

    for (const defender of ctx.def.players) {
      const defPos = ctx.state.formation.players[defender.id];
      if (defPos && distance(defPos, ballPos) > 8) {
        // Move slightly towards ball if too far away
        const dx = ballPos.x - defPos.x;
        const dy = ballPos.y - defPos.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude > 0) {
          defPos.x += (dx / magnitude) * 1;
          defPos.y += (dy / magnitude) * 1;
        }
      }
    }
  }

  private calculateSpacing(offFormation: any, defFormation: any) {
    const offPositions = Object.values(offFormation.players) as any[];
    const defPositions = Object.values(defFormation.players) as any[];

    return {
      openLanes: calculateOpenLanes(offFormation.ballPosition, offPositions, defPositions, true),
      ballMovement: 0, // Starts at 0, increases with ball movement
      shotQuality: calculateShotQuality(offFormation.ballPosition, defPositions[0] || null, true)
    };
  }

  private advanceFatigue(ctx: PositionalCtx, action: Action) {
    const per =
      PARAMS.fatigue.perAction + (action === 'pullup' || action === 'catchShoot' ? PARAMS.fatigue.perShot : 0);
    ctx.state.fatigue[ctx.with.id] = (ctx.state.fatigue[ctx.with.id] || 0) + per;
  }

  private advanceClockAndState(ctx: PositionalCtx, action: Action, result: any): boolean {
    // Clock advancement (same as original engine)
    const drain = action === 'reset' ? 2 : action === 'pnrPass' ? 4 : 6;
    ctx.state.shotClock = Math.max(0, ctx.state.shotClock - drain);
    ctx.state.clock.sec = Math.max(0, ctx.state.clock.sec - drain);

    // Handle results (similar to original but with positioning updates)
    if (result.kind === 'drive') {
      if (result.foul) {
        const makes = ctx.rng.next() < 0.7 ? 2 : ctx.rng.next() < 0.5 ? 1 : 0;
        ctx.state.score.off += makes;
        console.log(`DRIVE FOUL! ${makes} FT points`);
        this.swapPoss(ctx);
        return false;
      }
      if (result.blowby) {
        if (ctx.rng.next() < 0.7) {
          ctx.state.score.off += 2;
          console.log(`DRIVE SCORE! 2 points`);
          this.swapPoss(ctx);
          return false;
        }
        // Missed layup -> rebound
        const winner = this.resolveRebound(ctx);
        if (ctx.off.players.some(p => p.id === winner)) {
          ctx.state.shotClock = Math.max(ctx.state.shotClock, 14);
          return true;
        } else {
          this.swapPoss(ctx);
          return false;
        }
      }
      return true;
    }

    if (result.kind === 'shot') {
      if (result.fouled) {
        const makes = ctx.rng.next() < 0.7 ? 1 : 0;
        ctx.state.score.off += makes;
        this.swapPoss(ctx);
        return false;
      }
      if (result.make) {
        const points = result.three ? 3 : 2;
        ctx.state.score.off += points;
        console.log(`SCORE! ${points} points`);
        this.swapPoss(ctx);
        return false;
      }
      // Miss -> advanced rebound
      const playerPos = ctx.state.formation.players[ctx.with.id];
      const shotLocation = playerPos || ctx.state.formation.ballPosition;
      const zone = playerPos ? getShotZone(playerPos, true) : 'mid';
      const winner = this.resolveRebound(ctx, shotLocation, zone);
      if (ctx.off.players.some(p => p.id === winner)) {
        ctx.state.shotClock = Math.max(ctx.state.shotClock, 14);
        return true;
      } else {
        this.swapPoss(ctx);
        return false;
      }
    }

    if (result.kind === 'pass' && result.turnover) {
      this.swapPoss(ctx);
      return false;
    }

    return true;
  }

  private resolveRebound(ctx: PositionalCtx, shotLocation?: any, shotZone?: any): Id {
    if (!shotLocation || !shotZone) {
      // Fallback to simple rebound if missing data
      const o = ctx.off.players[0];
      const d = ctx.def.players[0];
      const ow = reboundWeight(o.ratings, 0.4, 1.0);
      const dw = reboundWeight(d.ratings, 0.6, 0.8);
      const sum = ow.w + dw.w;
      const r = ctx.rng.next() * sum;
      return r < ow.w ? o.id : d.id;
    }

    // Advanced multi-player rebounding system
    const offFormation = { players: ctx.state.formation.players };
    const defFormation = { players: ctx.state.formation.players };

    // Determine shot trajectory based on zone and quality
    const shotQuality = ctx.state.spacing.shotQuality;
    const trajectory = determineShotTrajectory(shotLocation, shotQuality, true);

    // Calculate rebound location
    const reboundLocation = calculateReboundLocation(shotLocation, trajectory, true);

    // Determine boxing out assignments
    const boxOuts = determineBoxOuts(ctx.off.players, ctx.def.players, offFormation, defFormation);

    // Create rebound participants
    const participants = createReboundParticipants(
      ctx.off.players,
      ctx.def.players,
      offFormation,
      defFormation,
      reboundLocation,
      boxOuts
    );

    // Resolve the competition
    const reboundContext = {
      shotLocation,
      reboundLocation,
      trajectory,
      players: participants,
      isOffensiveRebound: false // Will be determined by winner
    };

    const result = resolveReboundCompetition(reboundContext);

    console.log(`REBOUND: ${result.winner} (${result.contested ? 'contested' : 'clean'}, trajectory: ${trajectory})`);

    return result.winner;
  }

  private swapPoss(ctx: PositionalCtx) {
    // Swap teams and update formations
    const tmp = ctx.off;
    ctx.off = ctx.def;
    ctx.def = tmp;

    ctx.state.offense = ctx.off.id;
    ctx.state.defense = ctx.def.id;
    ctx.state.ball = ctx.off.players[0].id;
    ctx.state.score = { off: ctx.state.score.def, def: ctx.state.score.off };
    ctx.state.shotClock = 24;

    // Create new formations for swapped teams
    const newOffFormation = this.formationManager.createOffensiveFormation(ctx.off, ctx.state.offense === ctx.off.id);
    const newDefFormation = this.formationManager.createDefensiveFormation(
      ctx.def,
      ctx.state.defensiveAssignments.scheme,
      newOffFormation,
      ctx.state.defense === ctx.def.id
    );

    ctx.state.formation = newOffFormation;
    ctx.state.defensiveAssignments = this.coordinator.assignDefenders(
      ctx.off,
      ctx.def,
      ctx.state.defensiveAssignments.scheme,
      newOffFormation
    );
    ctx.state.spacing = this.calculateSpacing(newOffFormation, newDefFormation);
  }
}
