import { mean, std } from "mathjs";

export interface OHLCVRow {
  close: number;
  date: string;
}

export interface ScenarioBranch {
  target: number;
  probability: number;
  thesis: string;
}

export interface ScenarioOutput {
  bear: ScenarioBranch;
  base: ScenarioBranch;
  bull: ScenarioBranch;
  horizon: 30 | 60 | 90;
  ivUnavailable?: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

export class ScenarioEngine {
  constructor(
    private readonly prices: OHLCVRow[],
    private readonly iv: number | null,
    private readonly horizon: 30 | 60 | 90 = 30,
  ) {}

  generate(): ScenarioOutput {
    const ivUnavailable = this.iv == null || Number.isNaN(this.iv);
    const ivAnnual = ivUnavailable ? 0 : this.iv;

    const returns = this.dailyLogReturns();
    const mu = mean(returns) as number;
    const sigma = std(returns, "uncorrected") as number;

    const dailyIV = ivAnnual / Math.sqrt(252);
    const blendedSigma = ivUnavailable
      ? sigma
      : 0.5 * sigma + 0.5 * dailyIV;

    const S0 = this.prices.at(-1)!.close;
    const T = this.horizon;

    const drift = (mu - 0.5 * blendedSigma ** 2) * T;
    const diff = blendedSigma * Math.sqrt(T);

    const base = S0 * Math.exp(drift);
    const bull = S0 * Math.exp(drift + 1.5 * diff);
    const bear = S0 * Math.exp(drift - 1.5 * diff);

    return {
      bear: {
        target: round(bear),
        probability: 0.16,
        thesis: this.bearThesis(bear, S0),
      },
      base: {
        target: round(base),
        probability: 0.68,
        thesis: this.baseThesis(base, S0),
      },
      bull: {
        target: round(bull),
        probability: 0.16,
        thesis: this.bullThesis(bull, S0),
      },
      horizon: this.horizon,
      ivUnavailable: ivUnavailable || undefined,
    };
  }

  private dailyLogReturns(): number[] {
    return this.prices.slice(1).map((r, i) => Math.log(r.close / this.prices[i]!.close));
  }

  private bearThesis(target: number, s0: number): string {
    const pct = (((target - s0) / s0) * 100).toFixed(1);
    return `${pct}% downside over ${this.horizon}d — elevated vol regime, momentum reversal risk.`;
  }

  private baseThesis(target: number, s0: number): string {
    const pct = (((target - s0) / s0) * 100).toFixed(1);
    return `${pct}% from current price — continuation of trend at historical drift rate.`;
  }

  private bullThesis(target: number, s0: number): string {
    const pct = (((target - s0) / s0) * 100).toFixed(1);
    return `${pct}% upside — catalyst acceleration + vol compression scenario.`;
  }
}
