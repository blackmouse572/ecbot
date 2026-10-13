import type { GETTING_STARTED_STEPS } from "./constants";

export type GettingStartedStepKey =
  (typeof GETTING_STARTED_STEPS)[number]["key"];

export type GettingStartedStep = {
  key: GettingStartedStepKey;
  /** Absolute link to where the owner does this step. */
  to: string;
  done: boolean;
};
