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

// Court positioning system
export type Position = { 
  x: number;  // 0-94 feet (court length)
  y: number;  // 0-50 feet (court width)
};

export type Zone = {
  name: string;
  bounds: {
    minX: number;
    maxX: number; 
    minY: number;
    maxY: number;
  };
};

export type Formation = {
  players: Record<Id, Position>;
  ballPosition: Position;
  timestamp: number;  // For tracking movement
};

export type DefensiveScheme = 
  | 'man'         // Man-to-man defense
  | 'zone2-3'     // 2-3 zone defense
  | 'zone3-2'     // 3-2 zone defense  
  | 'zone1-3-1'   // 1-3-1 zone defense
  | 'fullCourt'   // Full court press
  | 'switch';     // Switching defense

export type Assignment = {
  defender: Id;
  target: Id | Zone;  // Player ID or zone to defend
  type: 'man' | 'zone' | 'help';
  priority: number;   // 1-10, higher = more important
};

export type DefensiveAssignments = {
  scheme: DefensiveScheme;
  assignments: Assignment[];
  helpRotations: Record<Id, Id>;  // Who rotates to help whom
};

// Enhanced possession state with positioning
export type PositionalPossessionState = PossessionState & {
  formation: Formation;
  defensiveAssignments: DefensiveAssignments;
  spacing: {
    openLanes: number;      // 0-1, how open driving lanes are
    ballMovement: number;   // 0-1, how much ball has moved
    shotQuality: number;    // 0-1, current shot opportunity quality
  };
};

// Game situation context for EPV calculation
export type GameSituation = {
  shotClock: number;
  gameTime: number;    // Seconds remaining in game
  scoreDiff: number;   // Positive = leading, negative = trailing
  quarter: number;
  fouls: {
    team: number;      // Team fouls this quarter
    player: Record<Id, number>;  // Individual player fouls
    inBonus: boolean;  // Team in bonus/penalty situation
  };
  momentum: number;    // -1 to 1, team momentum
};

