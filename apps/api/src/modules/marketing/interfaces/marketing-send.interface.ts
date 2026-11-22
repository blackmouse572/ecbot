/** The send rules a workspace runs with: its settings or the defaults. */
export interface IMarketingSendRules {
    maxPer30Days: number;
    restAfter: number;
    restDays: number;
    sendFrom: string;
    sendTo: string;
}
