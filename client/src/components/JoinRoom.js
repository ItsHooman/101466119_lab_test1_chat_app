import React, { useState } from "react";
import ChatRoom from "./ChatRoom";

function JoinRoom() {
  const [room, setRoom] = useState(localStorage.getItem("room") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  const handleJoin = () => {
    if (!username.trim() || !room.trim()) {
      alert("Please enter a username and room name!");
      return;
    }
    localStorage.setItem("username", username);
    localStorage.setItem("room", room);
    setRoom(room);
  };

  return (
    <div className="container">
      {!room ? (
        <div className="join-room">
          <h2>Join a Room</h2>
          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter Room Name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      ) : (
        <ChatRoom room={room} username={username} onLeave={() => setRoom("")} />
      )}
    </div>
  );
}

export default JoinRoom;
