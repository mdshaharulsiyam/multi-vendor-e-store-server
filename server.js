const express = require("express");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const app = express();

const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}
// connect db
connectDatabase();

// create server
const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on https://multi-vendor-fronted.vercel.app:${process.env.PORT}`);
});

// middlewares
app.use(express.json());
app.use(cookieParser());
// Enable CORS for all routes

app.use(
  cors({
    origin: ["http://localhost:3001", 'http://localhost:3000', 'https://multi-vendor-fronted.vercel.app'],
    credentials: true,
  })
);

app.use("/", express.static("uploads"));

app.get("/test", (req, res) => {
  res.send("Hello World!");
});

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// why bodyparser?
// bodyparser is used to parse the data from the body of the request to the server (POST, PUT, DELETE, etc.)

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// routes
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
app.use("/api/v2/withdraw", withdraw);

// end points
app.use("/api/v2/user", user);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    // Check if a file is provided
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Call the uploadToDrive function with the uploaded file
    const result = await uploadToDrive(file, '1OdYalsTxXngYC2FCiO7c-RP4o4NgAnEm');

    // Send back the result, which includes the viewable URL and file ID
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

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }
    const uploadPromises = files.map((file) => uploadToDrive(file, '1OdYalsTxXngYC2FCiO7c-RP4o4NgAnEm'));
    const results = await Promise.all(uploadPromises);

    // Map the results to extract necessary information for response
    const uploadResults = results.map((result) => ({
      fileId: result.id,
      fileName: result.name,
      viewableUrl: result.viewableUrl,
    }));

    // Send back the results for all files
    res.status(200).json({
      message: "Files uploaded successfully",
      files: uploadResults,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// it'for errhendel
app.use(ErrorHandler);

// Handling Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling UNCAUGHT EXCEPTION! 💥`);
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandle promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});
