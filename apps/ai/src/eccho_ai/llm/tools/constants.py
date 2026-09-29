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

# Skill bodies on S3 / MinIO (load_skill).
S3_TIMEOUT_SECONDS = 10.0
# Mirrors SKILL_INSTRUCTIONS_MAX_LENGTH on the api side — bounds what a single
# `load_skill` call can stream into the model context.
S3_MAX_BYTES = 64_000
# Explicit region avoids minio-py's slow GetBucketLocation probe (works for R2 + MinIO).
S3_REGION = "us-east-1"
SKILL_ACTIVE_STATUS = "ACTIVE"

# Operator (MCP/HTTP) actions with any of these words in their name change data.
# Discovered actions carry no read-only/destructive annotations, so the name is
# the only signal (#182: the agent called create_order before the customer said yes).
# Any word, not just the first: "order_create", "shopify_create_order".
MUTATING_ACTION_VERBS = frozenset({
    "add", "apply", "book", "cancel", "charge", "checkout", "confirm", "create",
    "delete", "edit", "insert", "modify", "pay", "place", "process", "refund",
    "register", "remove", "reserve", "save", "schedule", "send", "set", "submit",
    "transfer", "update", "upsert", "write",
})
MUTATING_TOOL_NOTE = (
    "This action changes data. Only call it after you have read the details back "
    "to the customer and they clearly said yes in a later message."
)
