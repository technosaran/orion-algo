"""
Orion Algo - Full-Duplex Zero-Latency WebSocket Streaming Bus
Streams live ticks, order execution reports, trailing stop ratchets,
and institutional RMS alerts to connected frontend clients.
"""

import time
import asyncio
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.fast_in_memory_engine import fast_in_memory_engine

logger = logging.getLogger("ws_live")
router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections and handles non-blocking broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        try:
            self.loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
        logger.info(f"[WS] Client connected. Active streams: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WS] Client disconnected. Active streams: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON message to all active WebSocket clients."""
        if not self.active_connections:
            return

        disconnected: List[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[WS] Send failed, marking for removal: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

    def broadcast_sync(self, message: Dict[str, Any]):
        """Synchronous hook for FastInMemoryEngine callback to dispatch broadcast."""
        try:
            if self.loop and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(message), self.loop)
            else:
                curr_loop = asyncio.get_running_loop()
                curr_loop.create_task(self.broadcast(message))
        except Exception as e:
            logger.debug(f"[WS] broadcast_sync error: {e}")


ws_manager = ConnectionManager()

# Hook the connection manager to the in-memory engine
fast_in_memory_engine.subscribe(ws_manager.broadcast_sync)


@router.websocket("/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """
    Primary full-duplex live stream for Orion Algo:
    - Sends CONNECTED confirmation.
    - Handles low-latency PING/PONG heartbeats for client RTT latency measurement.
    - Receives live engine broadcasts (ticks, fills, RMS alerts).
    """
    await ws_manager.connect(websocket)

    # Initial Handshake Frame
    try:
        await websocket.send_json({
            "type": "CONNECTED",
            "server_time": time.time() * 1000.0,
            "status": "ready",
            "engine": "FastInMemoryEngine-v1",
        })

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            # 1. RTT Latency Measurement (Ping -> Pong)
            if msg_type == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "client_time": data.get("client_time", 0),
                    "server_time": time.time() * 1000.0,
                })

            # 2. Manual Tick Simulation Injection (Optional)
            elif msg_type == "INJECT_TICK":
                sym = data.get("symbol", "NIFTY50")
                price = float(data.get("price", 24500.0))
                await fast_in_memory_engine.update_price_tick_hot_path(sym, price)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WS] Streaming loop exception: {e}")
        ws_manager.disconnect(websocket)
