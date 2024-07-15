import { compare } from "bcrypt";
import { User } from "../model/user.js";
import { cookieOptions, emitEvent, sendToken } from "../utils/features.js";
import { TryCatch } from "../middleware/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../model/chat.js";
import { REFETCH_CHATS, SEND_REQUEST } from "../constants/events.js";
import { Request } from "../model/request.js";
import { getOtherMember } from "../lib/helpers.js";
import { uploadFilesToCloudinary } from "../utils/features.js";

const login = TryCatch(async (req, res, next) => {
  const { password, username } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("invalid credentials", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch) return next(new ErrorHandler("invalid credentials", 404));

  sendToken(res, user, 200, `welcome ${user.name}`);
});

const newUser = async (req, res, next) => {
  const { name, password, username, bio } = req.body;

  const file = req.file;

  if (!file) return next(new ErrorHandler("please uplaod a pic"));
  const result = await uploadFilesToCloudinary([file]);
  
  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };
  if (!avatar.public_id || !avatar.url) {
    throw new Error("Cloudinary upload failed. Please try again.");
  }

  const user = await User.create({ name, password, bio, username, avatar });

  sendToken(res, user, 201, "User Created");
  console.log(avatar, "avatar");
};

const getMyProfile = TryCatch(async (req, res, next) => {
  
  const user = await User.findById(req.user);




  res.status(200).json({ sucess: true,user });
});

const logout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chatt-app", "", { ...cookieOptions, maxAge: 0 })
    .json({ sucess: true, message: "logout successfully" });
});

const searchUser = TryCatch(async (req, res) => {
  const { name } = req.query;

  const myChats = await Chat.find({ groupChat: false, members: req.user });

  const allUserFromMyChats = myChats.flatMap((user) => user.members);

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUserFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends.flatMap((i) => ({
    ...i,
    avat: i.avatar.url,
  }));

  return res.status(200).json({ sucess: true, users });
});

const sendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("already sent", 400));

  await Request.create({ sender: req.user, receiver: userId });

  emitEvent(req, SEND_REQUEST, [userId]);
  res.status(200).json({ success: true, message: "send request sucessfully" });
});

const acceptRequest = TryCatch(async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "name");

    if (!request) return next(new ErrorHandler("Request not found", 404));

    // if (request.receiver._id !== req.user)
    //   return next(
    //     new ErrorHandler("you are not authorized to accept the request", 401)
    //   );

    if (!accept) {
      await request.deleteOne();
      return res
        .status(200)
        .json({ sucess: true, message: "Rejected HAHAHAHA" });
    }

    const members = [request.sender._id, request.receiver._id];

    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender.name}-${request.receiver.name}`,
      }),
      request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);
    res.status(200).json({
      sucess: true,
      message: "accepted",
      senderId: request.sender._Id,
    });
  } catch (err) {
    console.log(err);
  }
});

const notifications = TryCatch(async (req, res, next) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  res.status(200).json({
    success: true,
    allRequests,
  });
});
const getMyFriends = TryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });
  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({ success: true, friends });
  }
});

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendRequest,
  acceptRequest,
  notifications,
  getMyFriends,
};
