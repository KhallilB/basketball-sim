import { Explain } from '@basketball-sim/types';
export type Event =
  | { type: 'shot'; player: string; p: number; make: boolean; explain: Explain }
  | { type: 'pass'; player: string; p: number; ok: boolean; explain: Explain }
  | { type: 'rebound'; winner: string; offense: boolean; wSelf: number }
  | { type: 'foul'; on: string; shooting: boolean };

export class Telemetry {
  events: Event[] = [];
  push(e: Event) {
    this.events.push(e);
  }
  summary() {
    const shots = this.events.filter(e => e.type === 'shot');
    const makes = shots.filter(s => s.make).length;
    return { shots: shots.length, makes, pAvg: avg(shots.map(s => s.p)) };
  }
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
