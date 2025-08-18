export type Id = string;

export type Ratings = {
  three:number; mid:number; finishing:number; ft:number;
  pass:number; handle:number; post:number; roll:number; screen:number;
  onBallDef:number; lateral:number; rimProt:number; steal:number;
  speed:number; strength:number; vertical:number; rebound:number;
  iq:number; discipline:number; consistency:number; clutch:number;
  stamina:number; heightIn:number; wingspanIn:number;
};

export type Tendencies = {
  withBall:[number,number,number,number,number,number,number]; // drive,pullup,catch, pnrAtk,pnrPass,post,reset
  offBall:[number,number,number,number,number];                 // spot,reloc,cut,screen,handoff
  shotZone:[number,number,number];                              // rim,mid,three
  threeStyle:[number,number];                                   // catch,offDribble
  passRisk:number; help:number; gambleSteal:number; crashOreb:number;
};

export type Player = {
  id:Id; name:string; ratings:Ratings; tendencies:Tendencies;
  badges?: Record<string,{tier:1|2|3}>;
};

export type Team = { id:Id; name:string; players:Player[] };

export type Clock = { quarter:1|2|3|4; sec:number };
export type PossessionState = {
  gameId:Id; poss:number; offense:Id; defense:Id; ball:Id; clock:Clock;
  shotClock:number; fatigue:Record<Id,number>; score:{off:number;def:number};
  seed:number; // frame-level seed base
};

export type ExplainTerm = { label:string; value:number };
export type Explain = { terms:ExplainTerm[]; score:number; p:number; notes?:string[] };

export type OutcomeShot = { kind:'shot'; make:boolean; fouled:boolean; three:boolean; explain:Explain };
export type OutcomePass = { kind:'pass'; complete:boolean; turnover:boolean; explain:Explain };
export type OutcomeDrive = { kind:'drive'; blowby:boolean; foul:boolean; explain:Explain };
export type OutcomeReb  = { kind:'rebound'; offenseWon:boolean; winner:Id; explain:Explain };
export type OutcomeFoul = { kind:'foul'; on:Id; shooting:boolean; };

export const Action = {
  Drive:'drive', Pullup:'pullup', CatchShoot:'catchShoot', PnrAttack:'pnrAttack', PnrPass:'pnrPass', Post:'post', Reset:'reset'
};
export type Action = typeof Action[keyof typeof Action];

