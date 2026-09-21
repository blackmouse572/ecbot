// Instructions body is streamed verbatim into the model context on every
// `load_skill` call — cap it so one workspace can't blow the context window
// or spike token cost.
export const SKILL_INSTRUCTIONS_MAX_LENGTH = 64_000;
