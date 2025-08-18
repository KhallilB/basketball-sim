import { XRng } from '@basketball-sim/random';
import { chooseAction } from '@basketball-sim/policy';
import { Player, Team, PossessionState, Action, Explain, ExplainTerm } from '@basketball-sim/types';
import { driveBlowbyP, passCompleteP, reboundWeight, shootingFoulP, shotMakeP } from '@basketball-sim/models';
import { PARAMS } from '@basketball-sim/params';

type Ctx = { off: Team; def: Team; with: Player; state: PossessionState; rng: XRng };

export class PossessionEngine {
  run(off: Team, def: Team, state: PossessionState): PossessionState {
    const rng = new XRng(state.seed ^ (state.poss * 7919));
    const player = off.players.find(p => p.id === state.ball);
    if (!player) {
      throw new Error(`Player with ID ${state.ball} not found in offensive team`);
    }
    const ctx: Ctx = { off, def, with: player, state, rng };
    // minimal loop: choose action -> resolve -> advance clock -> score / turnover / rebound or reset
    let live = true;
    while (live && ctx.state.shotClock > 0 && ctx.state.clock.sec > 0) {
      const action = this.choose(ctx);
      const r = this.resolve(action, ctx);
      this.advanceFatigue(ctx, action);
      live = this.advanceClockAndState(ctx, action, r);
    }
    return ctx.state;
  }

  private choose(ctx: Ctx): Action {
    // Stub EPV & bias (replace with real EPV + Dirichlet/Beta in your Tendencies lib)
    const epv = {
      drive: 0.5,
      pullup: 0.2,
      catchShoot: 0.3,
      pnrAttack: 0.35,
      pnrPass: 0.15,
      post: 0.1,
      reset: 0.05
    } as Record<Action, number>;
    const bias = {
      drive: 0.1,
      pullup: -0.1,
      catchShoot: 0.2,
      pnrAttack: 0.0,
      pnrPass: -0.05,
      post: -0.2,
      reset: -0.3
    } as Record<Action, number>;
    const f = ctx.state.fatigue[ctx.with.id] || 0;
    const action = chooseAction(ctx.with, epv, bias, f).action;
    console.log(`Action chosen: ${action}`);
    return action;
  }

  private resolve(a: Action, ctx: Ctx) {
    const rOff = ctx.with.ratings;
    const rDef = ctx.def.players[0].ratings; // TODO pick nearest defender
    if (a === 'drive') {
      const blow = driveBlowbyP(rOff, rDef, 0.4, 0.1);
      // contact & foul:
      const foul = shootingFoulP(rOff, rDef, blow.p > 0.6 ? 0.7 : 0.3, 0.2);
      return { kind: 'drive', blowby: Math.random() < blow.p, foul: Math.random() < foul.p, explain: blow } as const;
    }
    if (a === 'pullup' || a === 'catchShoot') {
      const Q = a === 'catchShoot' ? 1.0 : 0.5;
      const contest = a === 'catchShoot' ? 0.5 : 0.7;
      const fatigue = (ctx.state.fatigue[ctx.with.id] || 0) / 100;
      const rel = a === 'catchShoot' ? 0.2 : 0.1;
      const zone = a === 'pullup' ? 'mid' : 'three';
      const ex = shotMakeP(rOff, { Q, contest, fatigue, clutch: 0.0, relMod: rel, zone });
      // simple foul chance on shot
      const foul = shootingFoulP(rOff, rDef, 0.4, contest);
      const make = Math.random() < ex.p;
      console.log(`Shot attempt: ${zone}, make probability: ${ex.p.toFixed(3)}, made: ${make}`);
      return { kind: 'shot', make, fouled: Math.random() < foul.p, three: zone === 'three', explain: ex } as const;
    }
    if (a === 'pnrPass') {
      const pass = passCompleteP(rOff, 1.0, 0.4);
      const complete = Math.random() < pass.p;
      // Pass to different player if complete
      if (complete) {
        ctx.state.ball = ctx.off.players[Math.floor(Math.random() * ctx.off.players.length)].id;
      }
      return { kind: 'pass', complete, turnover: !complete, explain: pass } as const;
    }
    // reset/post/pnrAttack fall back: minor clock drain
    console.log(`Action ${a} resulted in pass/reset`);
    return {
      kind: 'pass',
      complete: true,
      turnover: false,
      explain: { terms: [] as ExplainTerm[], score: 0, p: 1 }
    } as const;
  }

  private advanceFatigue(ctx: Ctx, a: Action) {
    const per = PARAMS.fatigue.perAction + (a === 'pullup' || a === 'catchShoot' ? PARAMS.fatigue.perShot : 0);
    ctx.state.fatigue[ctx.with.id] = (ctx.state.fatigue[ctx.with.id] || 0) + per;
  }

  private advanceClockAndState(
    ctx: Ctx,
    a: Action,
    result:
      | { kind: 'drive'; blowby: boolean; foul: boolean; explain: Explain }
      | { kind: 'shot'; make: boolean; fouled: boolean; three: boolean; explain: Explain }
      | { kind: 'pass'; complete: boolean; turnover: boolean; explain: Explain }
      | { kind: 'rebound'; offenseWon: boolean; winner: string; explain: Explain }
  ): boolean {
    // naive time drain; expand with animation frames later
    const drain = a === 'reset' ? 2 : a === 'pnrPass' ? 4 : 6;
    ctx.state.shotClock = Math.max(0, ctx.state.shotClock - drain);
    ctx.state.clock.sec = Math.max(0, ctx.state.clock.sec - drain);

    if (result.kind === 'drive') {
      if (result.foul) {
        // Shooting foul on drive → free throws
        const makes = Math.random() < 0.7 ? 2 : Math.random() < 0.5 ? 1 : 0;
        ctx.state.score.off += makes;
        console.log(`DRIVE FOUL! ${makes} FT points. New score: ${ctx.state.score.off}-${ctx.state.score.def}`);
        this.swapPoss(ctx);
        return false;
      }
      if (result.blowby) {
        // Successful drive → easy shot at rim
        const makeP = 0.7; // High percentage shot
        if (Math.random() < makeP) {
          ctx.state.score.off += 2;
          console.log(`DRIVE SCORE! 2 points. New score: ${ctx.state.score.off}-${ctx.state.score.def}`);
          this.swapPoss(ctx);
          return false;
        }
        // Missed layup → rebound
        const { winner } = this.rebound(ctx);
        if (ctx.off.players.some(p => p.id === winner)) {
          ctx.state.shotClock = Math.max(ctx.state.shotClock, 14);
          return true;
        } else {
          this.swapPoss(ctx);
          return false;
        }
      }
      // Failed drive → pass to teammate or reset
      ctx.state.ball = ctx.off.players[Math.floor(Math.random() * ctx.off.players.length)].id;
      return true;
    }
    
    if (result.kind === 'shot') {
      if (result.fouled) {
        // 2 FTs; TODO: FT model
        const makes = Math.random() < 0.7 ? 1 : 0; // stub
        ctx.state.score.off += makes;
        this.swapPoss(ctx);
        return false;
      }
      if (result.make) {
        const points = result.three ? 3 : 2;
        ctx.state.score.off += points;
        console.log(`SCORE! ${points} points. New score: ${ctx.state.score.off}-${ctx.state.score.def}`);
        this.swapPoss(ctx);
        return false;
      }
      // miss → rebound
      const { winner } = this.rebound(ctx);
      if (ctx.off.players.some(p => p.id === winner)) {
        // OREB → reset short clock
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

  private rebound(ctx: Ctx) {
    // pick two contests (simplified)
    const o = ctx.off.players[0];
    const d = ctx.def.players[0];
    const ow = reboundWeight(o.ratings, 0.4, 1.0);
    const dw = reboundWeight(d.ratings, 0.6, 0.8);
    const sum = ow.w + dw.w;
    const r = Math.random() * sum;
    const offenseWon = r < ow.w;
    const winner = offenseWon ? o.id : d.id;
    return { kind: 'rebound', offenseWon, winner, explain: ow.explain } as const;
  }

  private swapPoss(ctx: Ctx) {
    const tmp = ctx.off;
    ctx.off = ctx.def;
    ctx.def = tmp;
    ctx.state.offense = ctx.off.id; // update possession state
    ctx.state.defense = ctx.def.id;
    ctx.state.ball = ctx.off.players[0].id; // give ball to new offense
    ctx.state.score = { off: ctx.state.score.def, def: ctx.state.score.off }; // view swap
    ctx.state.shotClock = 24; // reset
  }
}
