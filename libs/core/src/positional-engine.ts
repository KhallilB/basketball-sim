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
  Id,
  Explain,
  Formation,
  Position
} from '@basketball-sim/types';
import {
  driveBlowbyP,
  passCompleteP,
  shootingFoulP,
  shotMakeP,
  determineShotTrajectory,
  determineBoxOuts,
  createReboundParticipants,
  resolveReboundCompetition
} from '@basketball-sim/gameplay';
import {
  initializeGameStats,
  recordPlay,
  updatePossessions,
  recordAssist,
  recordFreeThrows,
  simulateFreeThrows,
  calculateAssistProbability
} from '@basketball-sim/systems';
import { PARAMS } from '@basketball-sim/params';
import {
  calculateOpenLanes,
  calculateShotQuality,
  getShotZone,
  distance,
  calculateReboundLocation,
  calculateReboundWeight
} from '@basketball-sim/math';
import { DefensiveCoordinator } from './defense.js';
import { FormationManager } from './formation.js';
import { MovementEngine } from './movement-engine.js';

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
  private movementEngine = new MovementEngine();
  private lastPassPlayerId?: Id; // Track who made the last pass
  private dribblesAfterPass = 0; // Track dribbles since last pass
  private ballMovesThisPossession = 0; // Track total ball movements (dribbles + passes)

  run(
    off: Team,
    def: Team,
    state: PossessionState,
    scheme: DefensiveScheme = 'man',
    gameStats?: GameStats
  ): { state: PositionalPossessionState; gameStats: GameStats } {
    const rng = new XRng(state.seed ^ (state.poss * 7919));
    const player = off.players.find(p => p.id === state.ball);

    if (!player) {
      throw new Error(`Player with ID ${state.ball} not found in offensive team`);
    }

    // Initialize or use provided game stats
    const stats = gameStats || initializeGameStats(state.gameId, off, def);

    // Initialize foul tracking if not present
    if (!state.fouls) {
      state.fouls = {
        playerFouls: {},
        teamFouls: { home: 0, away: 0 },
        quarterFouls: { home: 0, away: 0 }
      };
    }

    // Determine home team based on team ID, not current offense
    // The first team passed to initializeGameStats is always home team
    const isHomeTeam = off.id === stats.homeTeam.teamId;

    // Initialize formations with game context
    const gameTimeElapsed = (2880 - state.clock.sec) / 60; // Convert to minutes
    const scoreDiff = state.score.off - state.score.def;

    const offFormation = this.formationManager.createOffensiveFormation(
      off,
      isHomeTeam,
      gameTimeElapsed,
      scoreDiff,
      state.shotClock
    );
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

    // Reset tracking for new possession
    this.lastPassPlayerId = undefined;
    this.dribblesAfterPass = 0;
    this.ballMovesThisPossession = 0;

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
      recordPlay(
        ctx.gameStats,
        ctx.state.poss,
        ctx.with.id,
        action,
        result as PlayOutcome,
        playerPos,
        ctx.isHomeTeam,
        ctx.state.clock.sec
      );

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

    // Base EPV values adjusted by position and situation - increased shooting values for NBA pace
    const baseEPV = {
      drive: 0.8 + openLanes * 0.4, // More aggressive driving
      pullup: 0.6 + shotQuality * 0.6, // Much more shooting
      catchShoot: shotZone === 'three' ? 0.7 + shotQuality * 0.7 : 0.65 + shotQuality * 0.6,
      pnrAttack: 0.4 + openLanes * 0.3, // More aggressive attacks
      pnrPass: 0.1 + ctx.state.spacing.ballMovement * 0.05, // Less passing
      post: shotZone === 'rim' ? 0.7 : 0.15, // More post scoring
      reset: 0.02 // Much less resetting
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

  private resolve(
    action: Action,
    ctx: PositionalCtx
  ):
    | { kind: 'drive'; blowby: boolean; foul: boolean; dribbles: number; turnover: boolean; explain: Explain }
    | { kind: 'shot'; make: boolean; fouled: boolean; three: boolean; assistPlayerId?: Id; explain: Explain }
    | { kind: 'pass'; complete: boolean; turnover: boolean; explain: Explain } {
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
      const driveAngle = defenderPos ? Math.atan2(defenderPos.y - playerPos.y, defenderPos.x - playerPos.x) : 0;
      const defenderDistance = defenderPos && playerPos ? distance(playerPos, defenderPos) : 6;

      // Use movement engine to determine dribbles used
      const movementContext = {
        player: ctx.with,
        defenderDistance,
        openLanes,
        spacing: ctx.state.spacing.ballMovement,
        fatigue: ctx.state.fatigue[ctx.with.id] || 0
      };

      const movementOutcome = this.movementEngine.executeMovement('drive', movementContext, () => ctx.rng.next());
      this.dribblesAfterPass += movementOutcome.dribbles;
      this.ballMovesThisPossession++;

      const blow = driveBlowbyP(rOff, rDef, openLanes, Math.abs(driveAngle));
      const foul = shootingFoulP(rOff, rDef, blow.p > 0.6 ? 0.7 : 0.3, 0.2);

      return {
        kind: 'drive',
        blowby: ctx.rng.next() < blow.p && movementOutcome.success,
        foul: ctx.rng.next() < foul.p,
        dribbles: movementOutcome.dribbles,
        turnover: movementOutcome.turnover,
        explain: blow
      } as const;
    }

    if (action === 'pullup' || action === 'catchShoot') {
      // Calculate dribbles for this shot attempt
      const defenderDistance = defenderPos && playerPos ? distance(playerPos, defenderPos) : 6;
      const pressure = Math.max(0, 1 - defenderDistance / 8);

      if (action === 'pullup') {
        // Pullup shots involve dribbles to create space
        const dribbles = this.movementEngine.calculateDribblesForAction(action, ctx.with.ratings.handle, pressure);
        this.dribblesAfterPass += dribbles;
        this.ballMovesThisPossession++;
      }
      // catchShoot doesn't add dribbles (catch and shoot)

      // Use individual shot quality calculation instead of spacing average
      const Q = playerPos ? calculateShotQuality(playerPos, defenderPos, true) : 0.6;
      const contest = defenderPos && playerPos ? Math.max(0.5, 1.2 - distance(playerPos, defenderPos) / 3) : 0.7; // NBA-level defense
      const fatigue = (ctx.state.fatigue[ctx.with.id] || 0) / 100;
      const zone = playerPos ? getShotZone(playerPos, true) : 'mid';

      const shotContext = {
        Q,
        contest,
        fatigue,
        clutch: 0.0,
        relMod: action === 'catchShoot' ? 0.2 : 0.1,
        zone: zone as 'rim' | 'close' | 'mid' | 'three'
      };

      const prediction = shotMakeP(rOff, shotContext);
      const foul = shootingFoulP(rOff, rDef, 0.4, contest);
      const make = ctx.rng.next() < prediction.p;

      console.log(
        `Shot: ${zone}, Q=${Q.toFixed(2)}, contest=${contest.toFixed(2)}, P=${prediction.p.toFixed(3)}, made=${make}`
      );

      // Enhanced RTTB-based assist tracking
      if (make && this.lastPassPlayerId) {
        const passer = ctx.off.players.find(p => p.id === this.lastPassPlayerId);
        if (passer) {
          const assistProb = calculateAssistProbability(
            passer,
            ctx.with,
            this.dribblesAfterPass,
            Q, // Shot quality
            ctx.state.spacing.ballMovement // Game flow
          );

          if (ctx.rng.next() < assistProb) {
            console.log(
              `ASSIST: ${passer.name} (${passer.ratings.pass} pass, ${passer.ratings.iq} IQ) assisted ${
                ctx.with.name
              }'s shot (${this.dribblesAfterPass} dribbles, ${(assistProb * 100).toFixed(1)}% prob)`
            );
            recordAssist(ctx.gameStats, this.lastPassPlayerId, ctx.isHomeTeam);
          }
        }
      }

      return {
        kind: 'shot',
        make,
        fouled: ctx.rng.next() < foul.p,
        three: zone === 'three',
        assistPlayerId:
          make && this.lastPassPlayerId && this.dribblesAfterPass <= 2 ? this.lastPassPlayerId : undefined,
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
        // Track who made the pass for potential assist
        this.lastPassPlayerId = ctx.with.id;
        this.dribblesAfterPass = 0; // Reset dribble count after successful pass

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

    // Default to ball movement - track pass for assist purposes
    console.log(`Action ${action} resolved as ball movement`);

    // Track who made the pass for potential assist
    this.lastPassPlayerId = ctx.with.id;
    this.dribblesAfterPass = 0; // Reset dribble count after ball movement

    // Move ball to different player
    const availablePlayers = ctx.off.players.filter(p => p.id !== ctx.with.id);
    if (availablePlayers.length > 0) {
      const targetPlayer = availablePlayers[Math.floor(ctx.rng.next() * availablePlayers.length)];
      ctx.state.ball = targetPlayer.id;
      ctx.with = targetPlayer; // Update current player
    }

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

  private calculateSpacing(offFormation: Formation, defFormation: Formation) {
    const offPositions = Object.values(offFormation.players) as Position[];
    const defPositions = Object.values(defFormation.players) as Position[];

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

  private advanceClockAndState(
    ctx: PositionalCtx,
    action: Action,
    result:
      | { kind: 'drive'; blowby: boolean; foul: boolean; dribbles: number; turnover: boolean; explain: Explain }
      | { kind: 'shot'; make: boolean; fouled: boolean; three: boolean; assistPlayerId?: Id; explain: Explain }
      | { kind: 'pass'; complete: boolean; turnover: boolean; explain: Explain }
  ): boolean {
    // Clock advancement (same as original engine)
    const drain = action === 'reset' ? 2 : action === 'pnrPass' ? 4 : 6;
    ctx.state.shotClock = Math.max(0, ctx.state.shotClock - drain);
    ctx.state.clock.sec = Math.max(0, ctx.state.clock.sec - drain);

    // Handle results (similar to original but with positioning updates)
    if (result.kind === 'drive') {
      if (result.foul) {
        // Individual player free throw shooting (2 attempts for drive foul)
        const clutchContext = ctx.state.clock.sec < 120 ? 0.3 : 0.0; // Late game clutch
        const makes = simulateFreeThrows(ctx.with, 2, clutchContext, () => ctx.rng.next());
        recordFreeThrows(ctx.gameStats, ctx.with.id, 2, makes, ctx.isHomeTeam);
        ctx.state.score.off += makes;
        console.log(`DRIVE FOUL! ${makes}/2 FT (${ctx.with.name}: ${ctx.with.ratings.ft} FT rating)`);
        this.swapPoss(ctx);
        return false;
      }
      if (result.blowby) {
        if (ctx.rng.next() < 0.7) {
          ctx.state.score.off += 2;
          console.log(`DRIVE SCORE! 2 points`);

          // Award assist if drive results in score and conditions are met
          if (this.lastPassPlayerId && this.dribblesAfterPass <= 2) {
            console.log(
              `ASSIST: ${this.lastPassPlayerId} assisted ${ctx.with.id}'s drive score (${this.dribblesAfterPass} dribbles after pass)`
            );
            recordAssist(ctx.gameStats, this.lastPassPlayerId, ctx.isHomeTeam);
          }

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
        // Individual player free throw shooting (2 or 3 attempts based on shot type)
        const attempts = result.three ? 3 : 2;
        const clutchContext = ctx.state.clock.sec < 120 ? 0.3 : 0.0; // Late game clutch
        const makes = simulateFreeThrows(ctx.with, attempts, clutchContext, () => ctx.rng.next());
        recordFreeThrows(ctx.gameStats, ctx.with.id, attempts, makes, ctx.isHomeTeam);
        ctx.state.score.off += makes;
        console.log(`SHOT FOUL! ${makes}/${attempts} FT (${ctx.with.name}: ${ctx.with.ratings.ft} FT rating)`);
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

  private resolveRebound(
    ctx: PositionalCtx,
    shotLocation?: Position,
    shotZone?: 'rim' | 'close' | 'mid' | 'three'
  ): Id {
    let winnerId: Id = ctx.off.players[0].id; // Default fallback
    let offenseWon = false;

    if (!shotLocation || !shotZone) {
      // Improved fallback rebound system - include all players
      const allPlayers: Array<{ player: Player; team: 'off' | 'def' }> = [];

      // Add all offensive players
      ctx.off.players.forEach(p => allPlayers.push({ player: p, team: 'off' }));
      // Add all defensive players
      ctx.def.players.forEach(p => allPlayers.push({ player: p, team: 'def' }));

      // Calculate RTTB-based weights for all players
      const weights = allPlayers.map(({ player }) => {
        // Get player position for distance calculation
        const playerPos = ctx.state.formation.players[player.id];
        const reboundLoc = shotLocation || ctx.state.formation.ballPosition;
        const boxedOut = false; // Simplified for fallback

        return calculateReboundWeight(player, playerPos, reboundLoc, false, boxedOut);
      });

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const r = ctx.rng.next() * totalWeight;

      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (r < cumulative) {
          winnerId = allPlayers[i].player.id;
          offenseWon = allPlayers[i].team === 'off';
          break;
        }
      }

      // Fallback if no winner found
      if (!winnerId) {
        winnerId = allPlayers[0].player.id;
        offenseWon = allPlayers[0].team === 'off';
      }
    } else {
      // Advanced multi-player rebounding system
      const offFormation = { players: ctx.state.formation.players };

      // Create separate defensive formation positions
      const defPlayers: Record<Id, Position> = {};
      ctx.def.players.forEach(player => {
        const defPos = ctx.state.formation.players[player.id];
        if (defPos) {
          defPlayers[player.id] = defPos;
        }
      });
      const defFormation = { players: defPlayers };

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
      winnerId = result.winner;
      offenseWon = ctx.off.players.some(p => p.id === winnerId);

      console.log(`REBOUND: ${result.winner} (${result.contested ? 'contested' : 'clean'}, trajectory: ${trajectory})`);
    }

    // Record the rebound outcome in stats
    const reboundOutcome = {
      kind: 'rebound',
      winner: winnerId,
      offenseWon: offenseWon
    };

    const playerPos = ctx.state.formation.players[winnerId];
    recordPlay(
      ctx.gameStats,
      ctx.state.poss,
      winnerId,
      'rebound' as Action,
      reboundOutcome as PlayOutcome,
      playerPos,
      ctx.isHomeTeam,
      ctx.state.clock.sec
    );

    return winnerId;
  }

  // TODO: Integrate RTTB-based foul system
  // private evaluateFoul(ctx: PositionalCtx, situation: 'drive' | 'shot' | 'reach-in' | 'loose-ball', isThreePoint = false) {
  //   // Implementation ready for future integration
  // }

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
