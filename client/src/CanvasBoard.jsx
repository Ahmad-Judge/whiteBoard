import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import "./CanvasBoard.css";

const socket = io(process.env.REACT_APP_BACKEND_URL);

const CanvasBoard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState([]);
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(5);
  const [socketId, setSocketId] = useState("");
  const [leaderboard, setLeaderboard] = useState(null);

  const canDraw = socketId === currentDrawer;

  useEffect(() => {
    socket.on("connect", () => setSocketId(socket.id));
    socket.on("users", setUsers);
    socket.on("turn", ({ socketId, round }) => {
      setCurrentDrawer(socketId);
      setRound(round);
    });
    socket.on("round", setRound);
    socket.on("timer", setTimer);
    socket.on("leaderboard", (data) => {
      setLeaderboard(data);
      setTimeout(() => setLeaderboard(null), 10000);
    });

    return () => {
      socket.off("users");
      socket.off("turn");
      socket.off("round");
      socket.off("timer");
      socket.off("leaderboard");
    };
  }, []);

  const drawLine = ({ x0, y0, x1, y1, color }) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  const handleJoin = () => {
    if (!name.trim()) return;
    setUsername(name);
    socket.emit("join", name);
  };

  useEffect(() => {
    if (!username) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      const scale = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    socket.on("draw", drawLine);
    socket.on("clear", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    socket.on("history", (history) => history.forEach(drawLine));

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      socket.off("draw");
      socket.off("clear");
      socket.off("history");
    };
  }, [username]);

  const getOffsetCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    if (!canDraw) return;
    setIsDrawing(true);
    const { offsetX, offsetY } = getOffsetCoords(e.nativeEvent);
    canvasRef.current.lastX = offsetX;
    canvasRef.current.lastY = offsetY;
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !canDraw) return;
    const canvas = canvasRef.current;
    const { offsetX, offsetY } = getOffsetCoords(e.nativeEvent);
    const x0 = canvas.lastX;
    const y0 = canvas.lastY;
    const x1 = offsetX;
    const y1 = offsetY;
    const lineData = { x0, y0, x1, y1, color: "black" };
    drawLine(lineData);
    socket.emit("draw", lineData);
    canvas.lastX = x1;
    canvas.lastY = y1;
  };

  const handleMouseUp = () => setIsDrawing(false);

  // ✅ Touch Handlers for Mobile
  const handleTouchStart = (e) => {
    if (!canDraw) return;
    e.preventDefault();
    setIsDrawing(true);
    const { offsetX, offsetY } = getOffsetCoords(e);
    canvasRef.current.lastX = offsetX;
    canvasRef.current.lastY = offsetY;
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || !canDraw) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { offsetX, offsetY } = getOffsetCoords(e);
    const x0 = canvas.lastX;
    const y0 = canvas.lastY;
    const x1 = offsetX;
    const y1 = offsetY;
    const lineData = { x0, y0, x1, y1, color: "black" };
    drawLine(lineData);
    socket.emit("draw", lineData);
    canvas.lastX = x1;
    canvas.lastY = y1;
  };

  const handleTouchEnd = () => setIsDrawing(false);

  const handleLeave = () => {
    socket.emit("leave");
    setUsername("");
    setUsers([]);
    setCurrentDrawer(null);
    setLeaderboard(null);
  };

  const handlereset = () => {
    socket.emit("resetall");
    setUsername("");
    setUsers([]);
    setCurrentDrawer(null);
    setLeaderboard(null);
  };

  const handleClear = () => {
    if (canDraw) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      socket.emit("clear");
    }
  };

  const handleRating = (targetName, value) => {
    if (!value || !targetName || targetName === username) return;
    socket.emit("rate", { targetName, value: Number(value) });
  };

  if (!username) {
    return (
      <div className="join-screen">
        <h2>Enter Your Name</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Usman"
        />
        <button onClick={handleJoin}>Join Whiteboard</button>
      </div>
    );
  }

  return (
    <div className="whiteboard-layout">
      <div className="sidebar">
        <h3>👥 Users (Round {round})</h3>
        <ul>
          {users.map((user, idx) => (
            <li
              key={idx}
              style={{
                fontWeight: currentDrawer === user.socketId ? "bold" : "normal",
                color: currentDrawer === user.socketId ? "#009688" : "inherit",
              }}
            >
              {user.name} — ⭐{" "}
              {typeof user.rating === "number" ? user.rating.toFixed(1) : "N/A"}
              {user.name !== username && (
                <>
                  <br />
                  <select
                    onChange={(e) => handleRating(user.name, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Rate
                    </option>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} ⭐
                      </option>
                    ))}
                  </select>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="timer">⏳ Time Left: {timer}s</div>
      </div>

      <div className="main-content">
        <h2 className="mb-2" style={{ color: "white", margin: "1rem" }}>
          {canDraw ? "🎯 Your Turn to Draw!" : "Waiting for your turn..."}
        </h2>
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            className="canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
        {canDraw && (
          <button className="reset-btn" onClick={handleClear}>
            🔄 Reset
          </button>
        )}
        <button className="leave-btn" onClick={handleLeave}>
          🚪 Leave
        </button>
        <button className="leave-btn" onClick={handlereset}>
          🗑️ Delete All Players
        </button>
      </div>

      {leaderboard && (
        <div className="leaderboard-overlay">
          <div className="leaderboard-box">
            <h2>🏆 Leaderboard</h2>
            <ul className="leaderboard-list">
              {leaderboard.map((user, idx) => (
                <li className="leaderboard-item" key={idx}>
                  <span className="leaderboard-rank">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                  </span>
                  <span>{user.name}</span>
                  <span className="leaderboard-rating">{user.rating.toFixed(1)} ⭐</span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "1rem", color: "#ccc" }}>
              New game will start in a few seconds...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasBoard;
