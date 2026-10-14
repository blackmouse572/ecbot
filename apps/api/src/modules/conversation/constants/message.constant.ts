/**
 * Left in the conversation when staff resolve it or switch the bot back on.
 * The bot reads it in its history, and AGENT.md <escalation> names its
 * label: what was handed over before it is handled, so the bot keeps
 * helping instead of handing the same matter over again.
 */
export const STAFF_HANDLED_NOTE =
    '[Handled by staff] Staff took care of what was handed over and switched you back on.';
