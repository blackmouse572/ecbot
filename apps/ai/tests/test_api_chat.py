# tests/test_api_chat.py
import pytest
import logging

# Drives the real /api/chat endpoints (agent + DB); needs a live environment.
pytestmark = pytest.mark.integration

@pytest.fixture()
def api_chat_data():
    return {
        "chatbot_id": "3c0d1b5e-dfdd-4458-883b-4956a7eb7aa2",
        "message": "Use tool and say hi to me"
    }

def test_api_chat_message(client, api_chat_data, caplog):
    '''Test the /api/chat/message endpoint'''
    # Set caplog to capture INFO level and above from FastAPI/uvicorn
    caplog.set_level(logging.INFO)

    # Execute the request
    response = client.post("/api/chat/message", json=api_chat_data)

    # Explicitly print logs if you want them separated in the test output
    print("\n--- FastAPI Server Logs ---")
    for record in caplog.records:
        print(f"[{record.levelname}] {record.message}")
    print("---------------------------\n")

    # Assertions
    assert response.status_code == 200
    # assert "response_key" in response.json()

def test_api_chat_stream(client, api_chat_data, caplog):
    '''Test the /api/chat/stream endpoint'''
    caplog.set_level(logging.INFO)
    
    # Execute the streaming request
    response = client.post("/api/chat/stream", json=api_chat_data)
    
    assert response.status_code == 200
    # Additional streaming assertions...