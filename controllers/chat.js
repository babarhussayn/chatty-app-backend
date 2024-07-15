import {
  ALERT,
  REFETCH_CHATS,
  SEND_ATTACHMENT,
  SEND_CHAT,
} from "../constants/events.js";
import { TryCatch } from "../middleware/error.js";
import { Chat } from "../model/chat.js";
import { ErrorHandler } from "../utils/utility.js";
import { deleteFilesFromCloudinary, emitEvent } from "../utils/features.js";
import { getOtherMember } from "../lib/helpers.js";
import { User } from "../model/user.js";
import { Message } from "../model/message.js";

const newChatGroup = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  if (members.length < 2) {
    return next(new ErrorHandler("Group chat must have 3 members", 400));
  }
  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    members: allMembers,
    s: req.user,
  });

  emitEvent(req, ALERT, allMembers, `welcome to ${name} group chat`);
  emitEvent(req, REFETCH_CHATS, members);

  return res
    .status(200)
    .json({ success: true, message: "group chat successfully created" });
});

const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );
  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);
    return {
      _id,
      name: groupChat ? name : otherMember.name,
      members,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
    };
  });
  return res.status(200).json({ sucess: true, chats: transformedChats });
});

const getMyGroup = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    s: req.user,
  }).populate("members", "name avatar");
  const groups = chats.map(({ _id, name, members, groupChat }) => ({
    _id,
    name,
    groupChat,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({ success: true, groups });
});

const addMember = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("groupChat not found", 404));

  const allNewMemberPromise = members.map((i) => User.findById(i, "name"));
  const allNewMember = await Promise.all(allNewMemberPromise);

  chat.members.push(...allNewMember.map((i) => i._id));

  if (chat.members.length > 100)
    return next(new ErrorHandler("group member limits reached", 400));
  await chat.save();

  const allUserName = allNewMember.map((i) => i.name).join(",");

  emitEvent(req, ALERT, chat.members, `${allUserName} has been added`);
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    sucess: true,
    message: "members added ",
  });
});

const removeMember = TryCatch(async (req, res, next) => {
  try {
    const { userId, chatId } = req.body;

    const [chat, userThatWillBeRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);

    if (!chat) return next(new ErrorHandler("chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("groupChat not found", 404));

    if (chat.members.length <= 3)
      return next(new ErrorHandler("group must have 3 member", 400));
    chat.members = chat.members.filter((member) => member !== userId);

    await chat.save();
    emitEvent(
      req,
      ALERT,
      chat.members,
      `${userThatWillBeRemoved.name} has been removed sucessfully`,
      "ght"
    );
    emitEvent(req, REFETCH_CHATS, chat.members);
    res
      .status(200)
      .json({ sucess: true, message: "member removed sucessfully" });
  } catch (err) {
    console.log(err);
  }
});

const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  const remainingMembers = chat.members.filter((member) => member !== req.user);

  if (chat.creator === req.user) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);

    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  await chat.save();
  emitEvent(req, ALERT, chat.members, `User ${user} has left`);
  emitEvent(req, REFETCH_CHATS, chat.members);
  res.status(200).json({ sucess: true, message: "User has left" });
});

const sendAttachments = TryCatch(async (req, res, next) => {
  try {
    const { chatId } = req.body;
    const [chat, me] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user, "name"),
    ]);
    if (!chat) return next(new ErrorHandler("chat not found", 404));

    const files = req.files || [];

    if (files.length < 1)
      return next(new ErrorHandler("provide attachment", 400));
     if(files.length > 5) return next(new ErrorHandler("files can't be more than 5",400))

    const attachments = ["hji"];
    const messageForDB = {
      content: "",
      attachments,
      sender: me._id,
      chat: chatId,
    };
    const messageForRealTime = {
      ...messageForDB,
      sender: { _id: me._id, name: me.name },
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, SEND_ATTACHMENT, chat.members, {
      message: messageForRealTime,
      chatId,
    });
    emitEvent(req, SEND_CHAT, chat.members, { chatId });

    res.status(200).json({ success: true, message });
  } catch (err) {
    console.log(err);
    console.log(req.user, "req.user");
    console.log(me, "me");
  }
});

const getChatDetails = TryCatch(async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();
      if (!chat) return next(new ErrorHandler("not chat found ", 404));
      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));

      return res.status(200).json({
        sucess: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);
      if (!chat) return next(new ErrorHandler("chat not found", 404));
    }
  } catch (err) {
    console.log(err);
  }
});

const changeGroupName = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("this not group chat", 400));

  // if (chat.creator !==  req.user  )
  //   return next(new ErrorHandler("you are not allowed rename", 403));

  chat.name = name;
  await chat.save();
  emitEvent(req, REFETCH_CHATS, chat.members);

  res
    .status(200)
    .json({ sucess: true, message: "group name change successfully" });
});

const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found ", 404));
  const members = chat.members;

  if (chat.group && chat.creator !== req.user)
    return next(new ErrorHandler("you are not allowed", 403));

  if (!chat.groupChat && chat.members.includes(req.user))
    return next(new ErrorHandler("you are not allowed", 403));

  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });
  const public_ids = [];

  messageWithAttachments.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id))
  );

  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);
  emitEvent(req, REFETCH_CHATS, members);

  res
    .status(200)
    .json({ success: true, message: "message deleted sucessfully" });
});

const getMessages = TryCatch(async (req, res, next) => {
  try{
  const chatId = req.params.id;
  const { page = 1} = req.query;
  const limit = 20;
  const skip =(page - 1) * limit;



  const [messages,totalMessagesCount] = await Promise.all([ Message.find({ chat: chatId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "name avatar")
    .lean(),
      Message.countDocuments({ chat: chatId})     
  ]);
  const totalPages = Math.ceil(totalMessagesCount/limit);

    return res.status(200).json({ success: true, message: messages.reverse(),totalPages})
}catch(err){
  console.log(err)
}
});

export {
  newChatGroup,
  getMyChats,
  getMyGroup,
  addMember,
  removeMember,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  changeGroupName,
  deleteChat,
  getMessages
};
