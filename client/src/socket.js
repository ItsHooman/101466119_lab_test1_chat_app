import { io } from "socket.io-client";

const socket = io("http://localhost:5010"); // Use your backend port

export default socket;
