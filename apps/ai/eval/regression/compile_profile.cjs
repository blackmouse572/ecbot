// Compiles agent profiles the way apps/api does (chatbot.service.ts
// resolvePromptFields): createProfile defaults, the case's answers on top,
// agentProfileSchema.parse, then compilePrompt and compileFollowupRules.
// stdin: {"dist": "<built agent-blueprint>/dist/index.js", "profiles": [{type, lang, overrides, extraInstructions}]}
// stdout: [{"generalKnowledge": "...", "followupRules": "..."}]
const fs = require('fs');

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const bp = require(input.dist);
const out = input.profiles.map((p) => {
  const profile = bp.agentProfileSchema.parse({ ...bp.createProfile(p.type, p.lang), ...p.overrides });
  return {
    generalKnowledge: bp.compilePrompt(profile, { extraInstructions: p.extraInstructions ?? undefined }),
    followupRules: bp.compileFollowupRules ? bp.compileFollowupRules(profile) : '',
  };
});
process.stdout.write(JSON.stringify(out));
