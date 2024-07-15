import jwt from "jsonwebtoken";
import { TryCatch } from "../middleware/error.js";
import { Chat } from "../model/chat.js";
import { Message } from "../model/message.js";
import { User } from "../model/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { cookieOptions } from "../utils/features.js";

const allUsers = TryCatch(async (req, res, next) => {
  const users = await User.find({});

  const transformedUsers = await Promise.all(
    users.map(async ({ name, _id, username, avatar }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return { name, username, avatar: avatar.url, _id, groups, friends };
    })
  );

  return res.status(200).json({ status: "success", users: transformedUsers });
});

const allChats = TryCatch(async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformedChats = await Promise.all([
      chats.map(async ({ members, _id, groupChat, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });
        return {
          _id,

          name,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            groupChat,
            avatar: avatar.url,
          })),
          creator: {
            name: creator?.name || "none",
            avatar: creator?.avatar.url || "",
          },
          totalMessages: members.length,
          totalMessages,
        };
      }),
    ]);

    return res.status(200).json({ status: "success", chats: transformedChats });
  } catch (err) {
    console.log(err);
  }
});

const allMessages = TryCatch(async (req, res, next) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar ")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ _id, attachments, content, createdAt, sender, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: { _id: sender._id, name: sender.name, avatar: sender.avatar.url },
    })
  );
  res.status(200).json({ status: "sucess", messages: transformedMessages });
});

const dashBoard = TryCatch(async (req, res, next) => {
  const [groupChat, userCount, countMessages, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);
  const stats = { groupChat, userCount, countMessages, totalChatsCount };

  res.status(200).json({ status: "true", stats });
});

const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;

  const adminKey = process.env.ADMIN_KEY || "";

  const isMatched = secretKey === adminKey;
  
  if (!isMatched) return next(new ErrorHandler("Invalid admin key", 401));


  try {
    const token = jwt.sign(secretKey, process.env.JWT_SECRET);
    
    return res
        .status(200)
        .cookie('chatt-app', token, cookieOptions)
        .json({ success: true,message:'welcom admin' });
} catch (error) {
    console.error('Error sending token:', error);

}

  
})


const getAdmin =TryCatch(async(req,res,next) => {

  res.status(200).json({
    admin:true,
  });
});

const logout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chatt-app", "", { ...cookieOptions, maxAge: 0 })
    .json({ sucess: true, message: "logout successfully" });
});



export { allUsers, allChats, logout, allMessages, dashBoard, adminLogin,getAdmin };
