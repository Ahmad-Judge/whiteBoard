🎨 Real-Time Collaborative Drawing App
A real-time multiplayer drawing application where users can draw together on a shared canvas, rate each other's artwork, and compete in timed rounds. Built with the MERN Stack and Socket.IO, it brings live collaboration and fun interaction to digital art.

🚀 Key Features
🖌️ Real-time Drawing — Collaborate on a shared canvas using WebSockets (Socket.IO).
⏱️ Round Timers — Each drawing session is time-bound to keep gameplay exciting.
⭐ Rating System — After each round, users can rate the drawings of others.
👥 Multiplayer Support — Multiple users can join rooms and draw simultaneously.
🏆 Leaderboard — Tracks player performance and ratings over multiple rounds.
🧩 Tech Stack
Frontend:

React.js (for UI)
Canvas API (for drawing)
Socket.IO Client
Backend:

Node.js + Express.js (for REST APIs & WebSocket handling)
Socket.IO Server (for real-time communication)
Database:

MongoDB (for storing user data, scores, and drawings)
⚙️ Setup & Installation
1. Clone the Repository
git clone https://github.com/yourusername/real-time-drawing-app.git
cd real-time-drawing-app
2. Install Dependencies
npm install
cd client && npm install
3. Run the Application
In the project root directory, run:

npm run dev
This will start both the backend server and the React frontend concurrently.

🕹️ How It Works
Users join a drawing room.
A timer starts for the round.
Players draw in real time on a shared canvas.
When time runs out, everyone rates each other’s drawings.
Points are calculated, and the next round begins!
🎯 Objectives
Provide an engaging platform for creative collaboration.
Demonstrate real-time bidirectional communication with Socket.IO.
Implement a competitive element through ratings and leaderboards.
💡 Future Enhancements
✏️ AI-assisted drawing suggestions.
📱 Mobile-responsive interface.
🔒 User authentication and private rooms.
🧑‍🎨 Custom brush styles and colors.
🖼️ Save and export finished drawings.
🏷️ Tags
#SocketIO #MERN #RealtimeApp #DrawingApp #WebSockets #FullStack
