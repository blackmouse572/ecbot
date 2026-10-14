export interface IChatbotTimezones {
    /** Business clock: the agent's timezone, else the deployment default. */
    agent: string;
    /** Customer clock: the conversation's timezone, else the agent's. */
    customer: string;
}
