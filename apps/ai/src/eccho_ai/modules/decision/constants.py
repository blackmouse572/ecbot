"""Prompts and limits for the decision endpoints (system-one, extract, write)."""

# /decision/extract copies stated details out of a state; decisions models
# cannot write text, so this is the only chat-model prompt here.
EXTRACT_SYSTEM_PROMPT = """\
You copy details out of a piece of state. For each field, copy what the state
says in its own words and language, or give an empty string when the state does
not say. Judge only from the state. Do not explain.
"""

# Matches the profile's longest text field (PROFILE_LIMITS.longText).
TEXT_ANSWER_MAX = 1000

WRITE_SYSTEM_PROMPT = """\
You write one short message that a shop sends to its customers, following the
instructions exactly. Reply with the message only: no quotes around it, no
notes, no title, no list of options.
"""

# A draft is sampled, so asking again gives another wording.
WRITE_TEMPERATURE = 0.9
WRITE_MAX_TOKENS = 600
WRITE_TEXT_MAX = 1000
