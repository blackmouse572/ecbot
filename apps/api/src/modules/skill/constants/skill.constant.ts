// Instructions body is streamed verbatim into the model context on every
// `load_skill` call — cap it so one workspace can't blow the context window
// or spike token cost.
export const SKILL_INSTRUCTIONS_MAX_LENGTH = 64_000;

// Characters OpenAI rejects in a function name; apps/ai replaces them with `_`
// (sanitize_tool_name), so a Tool step names its tool the same way.
export const TOOL_NAME_INVALID = /[^a-zA-Z0-9_-]/g;
