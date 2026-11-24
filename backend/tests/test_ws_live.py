import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.fast_in_memory_engine import fast_in_memory_engine

def test_websocket_connection_and_heartbeat():
    """Verifies client can connect and receive heartbeat pong for latency measurement."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/ws/live") as websocket:
        # Initial greeting / connection frame
        init_data = websocket.receive_json()
        assert init_data["type"] == "CONNECTED"
        assert "server_time" in init_data

        # Client sends ping to measure latency
        websocket.send_json({"type": "PING", "client_time": 1700000000000})
        pong_data = websocket.receive_json()
        assert pong_data["type"] == "PONG"
        assert pong_data["client_time"] == 1700000000000
        assert "server_time" in pong_data

def test_websocket_receives_engine_broadcasts():
    """Verifies that in-memory engine broadcasts are pushed directly to the websocket client."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/ws/live") as websocket:
        init_data = websocket.receive_json()
        assert init_data["type"] == "CONNECTED"

        # Trigger an in-memory broadcast
        fast_in_memory_engine._broadcast_event("TICK_UPDATE", {"symbol": "NIFTY50", "price": 24550.0})

        event_data = websocket.receive_json()
        assert event_data["type"] == "TICK_UPDATE"
        assert event_data["data"]["symbol"] == "NIFTY50"
        assert event_data["data"]["price"] == 24550.0
