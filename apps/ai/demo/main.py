from typing import Any
import streamlit as st
import requests
import uuid

# Configuration
API_URL = "http://localhost:8000/api"
CHAT_ENDPOINT = f"{API_URL}/chat/message"
STREAM_ENDPOINT = f"{API_URL}/chat/stream"
UPLOAD_IMAGE_ENDPOINT = f"{API_URL}/chat/upload/image"
UPLOAD_FILE_ENDPOINT = f"{API_URL}/chat/upload/file"
RAG_UPLOAD_ENDPOINT = f"{API_URL}/rag/ingest/upload"
RAG_URL_ENDPOINT = f"{API_URL}/rag/ingest/url"
RAG_DOCUMENTS_ENDPOINT = f"{API_URL}/rag/documents"
RAG_CHATBOTS_ENDPOINT = f"{API_URL}/rag/chatbots"


def extract_app_data(response: requests.Response):
    payload = response.json()
    if isinstance(payload, dict):
        return payload.get("data")
    return payload


def refresh_rag_documents():
    response = requests.get(RAG_DOCUMENTS_ENDPOINT, params={"limit": 10}, timeout=20)
    response.raise_for_status()
    st.session_state.rag_documents = extract_app_data(response) or []


def refresh_chatbots():
    response = requests.get(RAG_CHATBOTS_ENDPOINT, params={"limit": 50}, timeout=20)
    response.raise_for_status()
    st.session_state.chatbots = extract_app_data(response) or []

st.set_page_config(page_title="Ecbot AI Demo", page_icon="💬", layout="centered")
st.title("💬 Ecbot AI Assistant Demo")

# Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
if "rag_documents" not in st.session_state:
    st.session_state.rag_documents = []
if "chatbots" not in st.session_state:
    st.session_state.chatbots = []

# Sidebar Configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    if st.button("Load Chatbots"):
        try:
            refresh_chatbots()
        except requests.RequestException as exc:
            st.error(f"Không tải được danh sách chatbot: {exc}")

    chatbot_options = st.session_state.chatbots
    selected_chatbot_id = "3c0d1b5e-dfdd-4458-883b-4956a7eb7aa2"
    if chatbot_options:
        selected_chatbot = st.selectbox(
            "Chatbot",
            chatbot_options,
            format_func=lambda chatbot: (
                f"{chatbot.get('name', 'Unnamed')} - {chatbot.get('id', '')}"
            ),
        )
        selected_chatbot_id = selected_chatbot.get("id", selected_chatbot_id)

    chatbot_id = st.text_input("Chatbot ID", value=selected_chatbot_id)
    user_id = st.text_input("User ID", value="demo_user")
    provider_id = st.text_input("Provider ID", value="default_provider")
    st.divider()

    st.subheader("RAG Knowledge Base")
    knowledge_base_id = st.text_input("Knowledge Base ID", value="")
    rag_url = st.text_input("Website URL", value="")
    rag_file = st.file_uploader("Upload PDF, DOCX hoặc TXT", type=["pdf", "docx", "txt"])
    rag_chunk_size = st.number_input("Chunk size", min_value=100, max_value=8000, value=1000, step=100)
    rag_chunk_overlap = st.number_input("Chunk overlap", min_value=0, max_value=4000, value=150, step=50)

    invalid_chunking = rag_chunk_overlap >= rag_chunk_size
    if invalid_chunking:
        st.warning("Chunk overlap phải nhỏ hơn chunk size.")

    ingest_col, refresh_col = st.columns(2)
    if ingest_col.button("Ingest", disabled=rag_file is None or invalid_chunking):
        try:
            files = {
                "file": (
                    rag_file.name,
                    rag_file.getvalue(),
                    rag_file.type or "application/octet-stream",
                )
            }
            data = {
                "chunk_size": str(int(rag_chunk_size)),
                "chunk_overlap": str(int(rag_chunk_overlap)),
                "chatbot_id": chatbot_id,
            }
            if knowledge_base_id.strip():
                data["knowledge_base_id"] = knowledge_base_id.strip()

            response = requests.post(RAG_UPLOAD_ENDPOINT, files=files, data=data, timeout=180)
            response.raise_for_status()
            result = extract_app_data(response) or {}
            st.success(
                f"Đã ingest `{result.get('filename', rag_file.name)}` "
                f"({result.get('chunk_count', 0)} chunks)."
            )
            refresh_rag_documents()
        except requests.RequestException as exc:
            st.error(f"Ingest thất bại: {exc}")

    if st.button("Ingest URL", disabled=not rag_url.strip() or invalid_chunking):
        try:
            data = {
                "url": rag_url.strip(),
                "chunk_size": int(rag_chunk_size),
                "chunk_overlap": int(rag_chunk_overlap),
                "chatbot_id": chatbot_id,
                "only_main_content": True,
                "max_age": 172800000,
                "parsers": ["pdf"],
            }
            if knowledge_base_id.strip():
                data["knowledge_base_id"] = knowledge_base_id.strip()

            response = requests.post(RAG_URL_ENDPOINT, json=data, timeout=240)
            response.raise_for_status()
            result = extract_app_data(response) or {}
            st.success(
                f"Đã ingest URL `{rag_url.strip()}` "
                f"({result.get('chunk_count', 0)} chunks)."
            )
            refresh_rag_documents()
        except requests.RequestException as exc:
            st.error(f"Ingest URL thất bại: {exc}")

    if refresh_col.button("Refresh"):
        try:
            refresh_rag_documents()
        except requests.RequestException as exc:
            st.error(f"Không tải được danh sách tài liệu: {exc}")

    if st.session_state.rag_documents:
        for doc in st.session_state.rag_documents:
            status = doc.get("status", "UNKNOWN")
            chunks = doc.get("chunk_count", 0)
            st.caption(f"{doc.get('filename', 'document')} - {status} - {chunks} chunks")
    else:
        st.caption("Chưa có tài liệu trong phiên demo.")

# Display Chat History
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        if message.get("thought"):
            with st.expander("💭 Thinking...", expanded=False):
                st.markdown(message["thought"])
        st.markdown(message["content"])
        
        # Display attachments if any
        if message.get("attachments"):
            for att in message["attachments"]:
                st.caption(f"📎 Attachment: `{att['attachment_id']}` ([Preview]({att['preview_url']}))")
        
        # Display forms/actions if any
        if message.get("action"):
            action = message["action"]
            if hasattr(action, "preview_form") and action.preview_form:
                with st.expander("Fill Form"):
                    for field in action.preview_form:
                        st.text_input(label=field.field_name, value=field.value or "N/A", key=f"{message['id']}_{field.field_name}")
                    if st.button("Submit Form", key=f"btn_form_{message['id']}"):
                        st.success("Form submitted!")
            
            if hasattr(action, "options") and action.options:
                cols = st.columns(len(action.options))
                for idx, opt in enumerate(action.options):
                    if cols[idx].button(opt, key=f"{message['id']}_opt_{idx}"):
                        st.info(f"Selected: {opt}")

# Chat Input
if prompt_data := st.chat_input("What is up?", accept_file=False):
    prompt_text = ""
    attachments_list = []
    
    # Handle both new (object/dict) and old (string) Streamlit prompt structures
    if isinstance(prompt_data, dict):
        prompt_text = prompt_data.get("text", "")
        uploaded_files = prompt_data.get("files", [])
    elif hasattr(prompt_data, "text"):
        prompt_text = getattr(prompt_data, "text", "")
        uploaded_files = getattr(prompt_data, "files", [])
    else:
        prompt_text = str(prompt_data)
        uploaded_files = []

    # Process files
    for uploaded_file in uploaded_files:
        is_image = uploaded_file.name.lower().endswith(('.png', '.jpg', '.jpeg'))
        endpoint = UPLOAD_IMAGE_ENDPOINT if is_image else UPLOAD_FILE_ENDPOINT
        res = requests.post(endpoint)
        if res.status_code == 200:
            data = res.json().get("data", {})
            attachments_list.append({"attachment_id": data.get("attachment_id"), "preview_url": data.get("preview_url")})

    # Add User Message
    user_msg: dict[str, Any] = {"id": str(uuid.uuid4()), "role": "user", "content": prompt_text}
    if attachments_list:
        user_msg["attachments"] = attachments_list
        
    st.session_state.messages.append(user_msg)
    
    with st.chat_message("user"):
        if prompt_text:
            st.markdown(prompt_text)
        for att in attachments_list:
            st.caption(f"📎 Attached `{att['attachment_id']}`")

    # Generate AI Response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        
        req_payload = {
            "chatbot_id": chatbot_id,
            "user_id": user_id,
            "provider_id": provider_id,
            "message": prompt_text,
            "chat_session_id": st.session_state.session_id
        }
        
        if attachments_list:
            req_payload["attachments"] = attachments_list

        full_response = ""
        thought_process = ""
        action_data = None
        attachments_data = None
        
        try:
            import json
            # Stream endpoint
            with requests.post(STREAM_ENDPOINT, json=req_payload, stream=True) as response:
                if response.status_code == 200:
                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')
                            if line_str.startswith('data: '):
                                data_str = line_str[6:]
                                try:
                                    event_payload = json.loads(data_str)
                                    event_type = event_payload.get("event")
                                    event_data = event_payload.get("data")
                                    
                                    if event_type == "think-text" and event_data:
                                        thought_process += event_data
                                        with message_placeholder.container():
                                            if thought_process:
                                                with st.expander("💭 Thinking...", expanded=True):
                                                    st.markdown(thought_process + "▌")
                                            st.markdown(full_response)
                                    elif event_type == "text" and event_data:
                                        full_response += event_data
                                        with message_placeholder.container():
                                            if thought_process:
                                                with st.expander("💭 Thinking...", expanded=False):
                                                    st.markdown(thought_process)
                                            st.markdown(full_response + "▌")
                                    elif event_type == "action" and event_data:
                                        action_data = event_data
                                        # Convert action back to object so hasattr works in the chat loop
                                        class Dict2Obj:
                                            def __init__(self, d):
                                                for k, v in d.items():
                                                    if isinstance(v, (list, tuple)):
                                                        setattr(self, k, [Dict2Obj(x) if isinstance(x, dict) else x for x in v])
                                                    else:
                                                        setattr(self, k, Dict2Obj(v) if isinstance(v, dict) else v)
                                        action_data = Dict2Obj(action_data)
                                    elif event_type == "attachments" and event_data:
                                        attachments_data = event_data
                                    elif event_type == "error" and event_data:
                                        error_detail = event_data.get("error") if isinstance(event_data, dict) else str(event_data)
                                        full_response += f"\n\nError: `{error_detail}`"
                                        message_placeholder.markdown(full_response)
                                    elif event_type == "done":
                                        pass
                                except json.JSONDecodeError:
                                    pass
                    
                    with message_placeholder.container():
                        if thought_process:
                            with st.expander("💭 Thinking...", expanded=False):
                                st.markdown(thought_process)
                        st.markdown(full_response)
                    
                    # Capture action and attachments
                    ai_msg = {
                        "id": str(uuid.uuid4()),
                        "role": "assistant",
                        "thought": thought_process,
                        "content": full_response,
                        "action": action_data,
                        "attachments": attachments_data
                    }
                    st.session_state.messages.append(ai_msg)
                    
                    # Force rerun to display newly added action buttons/forms in current bubble
                    st.rerun()
                else:
                    error_msg = f"Error: `{response.text}`"
                    message_placeholder.markdown(error_msg)
                    st.session_state.messages.append({"role": "assistant", "content": error_msg})
                    
        except Exception as e:
            error_msg = f"Connection failed: {str(e)}"
            message_placeholder.markdown(error_msg)
            st.session_state.messages.append({"role": "assistant", "content": error_msg})
