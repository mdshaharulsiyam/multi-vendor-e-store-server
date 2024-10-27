const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");

require("dotenv").config({ path: process.env.NODE_ENV !== "PRODUCTION" ? "config/.env" : undefined });

const app = express();
const server = http.createServer(app); // Create HTTP server to handle HTTP and WebSocket
const io = socketIO(server); // Initialize Socket.IO on the same server

// Connect to the database
connectDatabase();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:3001", "http://localhost:3002","http://localhost:3000", "https://multi-vendor-fronted.vercel.app"],
  credentials: true,
}));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Static files
app.use("/", express.static("uploads"));

// Routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const message = require("./controller/message");
const conversation = require("./controller/conversation");
const withdraw = require("./controller/withdraw");
const { upload, uploadToDrive } = require("./multer");

app.use("/api/v2/user", user);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/order", order);
app.use("/api/v2/message", message);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/withdraw", withdraw);

// API routes for file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file provided" });
    const result = await uploadToDrive(file, '1OdYalsTxXngYC2FCiO7c-RP4o4NgAnEm');
    res.status(200).json({
      message: "File uploaded successfully",
      fileId: result.id,
      fileName: result.name,
      viewableUrl: result.viewableUrl,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: "No files provided" });
    const uploadPromises = files.map((file) => uploadToDrive(file, '1OdYalsTxXngYC2FCiO7c-RP4o4NgAnEm'));
    const results = await Promise.all(uploadPromises);
    const uploadResults = results.map((result) => ({
      fileId: result.id,
      fileName: result.name,
      viewableUrl: result.viewableUrl,
    }));
    res.status(200).json({
      message: "Files uploaded successfully",
      files: uploadResults,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO logic
let users = [];
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) && users.push({ userId, socketId });
};
const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};
const getUser = (receiverId) => users.find((user) => user.userId === receiverId);
const createMessage = ({ senderId, receiverId, text, images }) => ({
  senderId,
  receiverId,
  text,
  images,
  seen: false,
});

io.on("connection", (socket) => {
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  const messages = {};
  socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
    const message = createMessage({ senderId, receiverId, text, images });
    const user = getUser(receiverId);
    messages[receiverId] = messages[receiverId] ? [...messages[receiverId], message] : [message];
    io.to(user?.socketId).emit("getMessage", message);
  });

  socket.on("messageSeen", ({ senderId, receiverId, messageId }) => {
    const user = getUser(senderId);
    const message = messages[senderId]?.find((msg) => msg.receiverId === receiverId && msg.id === messageId);
    if (message) {
      message.seen = true;
      io.to(user?.socketId).emit("messageSeen", { senderId, receiverId, messageId });
    }
  });

  socket.on("updateLastMessage", ({ lastMessage, lastMessagesId }) => {
    io.emit("getLastMessage", { lastMessage, lastMessagesId });
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

// Error Handling
app.use(ErrorHandler);

// Uncaught Exceptions and Promise Rejections
process.on("uncaughtException", (err) => {
  console.error(`Error: ${err.message}`);
  console.error("Shutting down due to uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Start the combined server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
