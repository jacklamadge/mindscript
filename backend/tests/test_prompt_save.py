import os
from unittest.mock import patch

from fastapi.testclient import TestClient

os.environ["LLM_PROVIDER"] = "gemini"
os.environ["GEMINI_API_KEY"] = "test-key"
os.environ["DATABASE_URL"] = "sqlite:///./test_vibepromt.db"

from app.main import app
from app.services.llm_client import LLMClient

client = TestClient(app)
_OK_LLM_TEXT = "Role:\nYou are a senior engineer.\n" + ("x" * 120)


@patch.object(LLMClient, "generate_full_prompt", return_value=(_OK_LLM_TEXT, None))
def test_prompt_save_endpoint(_mock_llm):
    body = {
        "userId": 123456789,
        "sessionId": "550e8400-e29b-41d4-a716-446655440000",
        "type": "prompt",
        "timestamp": "2026-05-03T12:01:00.000Z",
        "data": {
            "category": "dev",
            "answers": {
                "1": "Telegram-бот для заказов еды",
                "2": "Python / FastAPI",
                "3": "MVP за две недели",
                "4": "production-ready",
                "5": "План и чеклист",
                "6": "Tailwind",
                "7": "Высокая производительность",
                "8": "",
            },
        },
    }
    response = client.post("/api/prompt/save", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == 123456789
    assert data["sessionId"] == body["sessionId"]
    assert "final_prompt" in data
    assert data["source"] == "llm"


@patch.object(LLMClient, "generate_full_prompt", return_value=(_OK_LLM_TEXT, None))
def test_prompt_save_with_skipped_answers(_mock_llm):
    body = {
        "userId": 1,
        "sessionId": "550e8400-e29b-41d4-a716-446655440001",
        "type": "prompt",
        "data": {
            "category": "dev",
            "answers": {
                "1": "бот",
                "2": "",
                "3": "",
                "4": "",
                "5": "",
                "6": "",
                "7": "",
                "8": "",
            },
        },
    }
    response = client.post("/api/prompt/save", json=body)
    assert response.status_code == 200, response.text
    assert response.json()["source"] == "llm"


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
