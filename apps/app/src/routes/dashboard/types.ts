export type CountQuery = {
  count: number;
  isLoading: boolean;
  isError: boolean;
};

export type GettingStartedStepKey = "chatbot" | "account" | "conversation";

export type GettingStartedStep = {
  key: GettingStartedStepKey;
  /** Absolute link to where the owner does this step. */
  to: string;
  done: boolean;
};
