// Idle limit for the reply stream from apps/ai. axios arms its `timeout` as a
// socket inactivity timer that stays on while the stream runs, so the module's
// 60s default aborted replies on a cold start or a slow tool roundtrip. apps/ai
// sends a keepalive every 15s, so this only fires on a wedged connection.
export const AI_STREAM_IDLE_TIMEOUT_MS = 2 * 60 * 1000;
