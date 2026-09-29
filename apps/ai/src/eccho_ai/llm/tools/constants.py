"""Tool-result messages that steer the agent after a failed or unavailable tool call."""

# No conversation/customer (e.g. the dashboard test chat): the feature cannot run here.
FOLLOWUP_UNAVAILABLE = (
    "Reminders and follow-up messages are not available in this chat. "
    "Do not promise one: tell the customer you cannot set a reminder here."
)
HANDOFF_UNAVAILABLE = (
    "Tags and handing off to staff are not available in this chat. "
    "Do not tell the customer a staff member will take over."
)

# apps/api failed on a live channel: the feature exists, this call did not go through.
FOLLOWUP_FAILED = (
    "The follow-up could not be scheduled. "
    "Do not promise a reminder: tell the customer you could not set it right now."
)
HANDOFF_FAILED = (
    "The tag could not be applied. "
    "Do not tell the customer a staff member will take over."
)

# Not "proceed without it": the agent then improvised the skill's procedure and
# promised to get back to the customer later. Formatted with `slug`.
SKILL_LOAD_FAILED = (
    "Skill '{slug}' could not be loaded. Do not guess its procedure, "
    "rules or offers, and do not promise to check and get back later. "
    "Answer only what you know for sure; for the rest, tell the customer "
    "you cannot handle it right now and offer a staff member."
)
