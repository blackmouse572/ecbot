from collections import defaultdict, deque
from threading import RLock

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.chat.models.chat_models import ChatRequest


class ChatMemoryStore:
    def __init__(self):
        self._messages: dict[str, deque[BaseMessage]] = defaultdict(deque)
        self._session_keys: dict[str, set[str]] = defaultdict(set)
        self._lock = RLock()

    def build_key(self, chat_request: ChatRequest) -> str:
        return ":".join(
            [
                chat_request.chatbot_id,
                chat_request.provider_id,
                chat_request.user_id,
                chat_request.chat_session_id or "",
            ]
        )

    def get_messages(self, chat_request: ChatRequest) -> list[BaseMessage]:
        if not AppVars.CHAT_MEMORY_ENABLED or not chat_request.chat_session_id:
            return []

        key = self.build_key(chat_request)
        with self._lock:
            return list(self._messages.get(key, ()))

    def append_interaction(
        self,
        chat_request: ChatRequest,
        *,
        user_message: str | None,
        assistant_message: str | None,
    ) -> None:
        if not AppVars.CHAT_MEMORY_ENABLED or not chat_request.chat_session_id:
            return
        if not user_message and not assistant_message:
            return

        key = self.build_key(chat_request)
        with self._lock:
            if user_message:
                self._messages[key].append(HumanMessage(content=user_message))
            if assistant_message:
                self._messages[key].append(AIMessage(content=assistant_message))
            self._session_keys[chat_request.chat_session_id].add(key)
            self._trim(key)

    def delete_session(self, session_id: str) -> int:
        with self._lock:
            keys = set(self._session_keys.pop(session_id, set()))
            if not keys:
                suffix = f":{session_id}"
                keys = {key for key in self._messages if key.endswith(suffix)}

            for key in keys:
                self._messages.pop(key, None)
            return len(keys)

    def _trim(self, key: str) -> None:
        messages = self._messages[key]
        while len(messages) > AppVars.CHAT_MEMORY_MAX_MESSAGES:
            messages.popleft()

        total_chars = sum(len(str(message.content)) for message in messages)
        while messages and total_chars > AppVars.CHAT_MEMORY_MAX_CHARS:
            removed = messages.popleft()
            total_chars -= len(str(removed.content))


chat_memory_store = ChatMemoryStore()
