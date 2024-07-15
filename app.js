import express from "express";
import { DATABASE } from "./utils/features.js";
import { errorMessage } from "./middleware/error.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";
import userRouter from "./routes/user.js";
import chatRouter from "./routes/chat.js";
import adminRouter from "./routes/admin.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT } from "./constants/events.js";
import { getSockets } from "./lib/helpers.js";
import { Message } from "./model/message.js";

import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import { corsOptions } from "./constants/config.js";


const app = express();

const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

const userSocketIDs = new Map();

io.use((socket, next) => {
  cookieParser()(socket.request,socket.request.res,next
    
  );
});

io.on("connection", (socket) => {
  
  const user ={_id:'54',username:'ff'};
  console.log(user)
  userSocketIDs.set(user._id, socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: { _id: user._id, name: user.name },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = { chat: chatId, content: message, sender: user._id };

    const membersSockets = getSockets(members);
    io.to(membersSockets).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(membersSockets).emit(NEW_MESSAGE_ALERT, { chatId });

    console.log("New message", messageForRealTime);
    await Message.create(messageForDB);
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id);
    console.log("disconnect");
  });
});

dotenv.config({
  path: "./.env",
});

DATABASE;
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRouter);

app.get("/", (req, res) => {
  res.send("server working");
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(errorMessage);

server.listen(3001, () => {
  console.log("app listen on 3001");
});
