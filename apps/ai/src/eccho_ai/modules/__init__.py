"""Feature modules (chat, customer, rag).

Routers are imported explicitly by `eccho_ai.main`; this package __init__ is
intentionally side-effect-free to avoid import-order cycles (a router import here
pulls services -> llm.agents during unrelated submodule imports).
"""
