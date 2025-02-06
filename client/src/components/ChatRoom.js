import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5010"); // Ensure this matches your backend port

function ChatRoom({ room, username, onLeave }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [userTyping, setUserTyping] = useState("");
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateMode, setPrivateMode] = useState(false);

  // Join room when component mounts
  useEffect(() => {
    socket.emit("joinRoom", { room, username });

    socket.on("message", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socket.on("privateMessage", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socket.on("userTyping", (user) => {
      setUserTyping(user);
    });

    socket.on("stopTyping", () => {
      setUserTyping("");
    });

    return () => {
      socket.emit("leaveRoom", { room, username });
      socket.off("message");
      socket.off("privateMessage");
      socket.off("userTyping");
      socket.off("stopTyping");
    };
  }, [room, username]);

  // Send a message (either private or group)
  const sendMessage = () => {
    if (message.trim()) {
      const msgData = { room, username, message };

      if (privateMode && privateRecipient) {
        socket.emit("privateMessage", { toUser: privateRecipient, fromUser: username, message });
        msgData.toUser = privateRecipient;
      } else {
        socket.emit("chatMessage", msgData);
      }

      setMessages((prevMessages) => [...prevMessages, msgData]);
      setMessage("");
      socket.emit("stopTyping", room);
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!typing) {
      socket.emit("userTyping", { room, username });
      setTyping(true);
    }
    setTimeout(() => {
      setTyping(false);
      socket.emit("stopTyping", room);
    }, 2000);
  };

  // Toggle private message mode
  const togglePrivateMode = () => {
    setPrivateMode(!privateMode);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/login";
  };
  <button className="logout-btn" onClick={handleLogout}>Logout</button>

  return (
    <div className="chat-container">
      <h2>Chat Room: {room}</h2>
      <button className="leave-btn" onClick={onLeave}>Leave Room</button>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>

      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.username === username ? "user" : ""}`}>
            <strong>{msg.username}{msg.toUser ? ` ➜ ${msg.toUser}` : ""}:</strong> {msg.message}
          </div>
        ))}
      </div>

      {userTyping && <p className="typing-indicator">{userTyping} is typing...</p>}

      <div className="chat-input">
        {privateMode && (
          <input
            type="text"
            placeholder="Enter recipient username"
            value={privateRecipient}
            onChange={(e) => setPrivateRecipient(e.target.value)}
          />
        )}

        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
        <button onClick={togglePrivateMode}>
          {privateMode ? "Switch to Group" : "Switch to Private"}
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;
