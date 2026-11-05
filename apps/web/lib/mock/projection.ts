import type { ProjectionInputs } from '@/lib/contracts';

export const start = 16188.02;
export const monthly = 500;
export const ipca = 4.0;
export const goal = 50000;
export const months = 60;
export const scenarios = { conservador: 8.4, base: 11.4, otimista: 14.4 }; // % a.a.

export const defaultInputs: ProjectionInputs = {
  start,
  monthly,
  baseRate: scenarios.base,
  ipca,
  goal,
  months,
  reinvestDividends: true,
  spread: 3,
  dividendYield: 7.9,
};
