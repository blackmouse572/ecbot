"""Customer-domain endpoints exposed by apps/ai.

Currently houses the analytical tag classifier (#170) called by apps/api at the
end of a conversation. Kept separate from `modules.chat` because it is a
back-channel endpoint, not part of the agent's request/stream surface.
"""
