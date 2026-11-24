"""Prompts and limits for the decision endpoints (system-one and write)."""

SYSTEM_PROMPT = """\
You answer typed questions about a piece of state, like a calibrated classifier.
For a "choice" question, pick exactly one option id from its options and give
your confidence from 0 to 1 that it is the right option.
For a "noul" question, give the probability from 0 to 1 that the answer is yes.
For a "text" question, copy the answer from the state in its own words and
language, or give an empty string when the state does not say.
Judge only from the state. Do not explain.
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
