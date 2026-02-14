import imagekit from "../configs/imageKit.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import fs from "fs";
import Post from "../models/Post.js";
import { inngest } from "../inngest/inngest.js";
import { clerkClient } from "@clerk/express";

const normalizeUsername = (value) => {
  const normalized = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || null;
};

export const getUserData = async (req, res) => {
  try {
    const { userId, sessionClaims } = await req.auth();
    if (!userId) {
      return res.json({ success: false, message: "not authenticated" });
    }

    let user = await User.findById(userId);
    const shouldHydrateFromClerk =
      !user ||
      !user.email ||
      user.email.endsWith("@example.local") ||
      user.full_name === "New User" ||
      /^user_[a-z0-9]+$/i.test(user.username || "");

    if (shouldHydrateFromClerk) {
      let clerkUser = null;
      try {
        clerkUser = await clerkClient.users.getUser(userId);
      } catch (error) {
        console.log("Clerk user fetch failed:", error?.message || error);
      }

      const primaryEmail =
        clerkUser?.emailAddresses?.find(
          (emailObj) => emailObj.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ||
        clerkUser?.emailAddresses?.[0]?.emailAddress ||
        sessionClaims?.email ||
        sessionClaims?.email_address;

      const firstName = clerkUser?.firstName || sessionClaims?.first_name || "";
      const lastName = clerkUser?.lastName || sessionClaims?.last_name || "";
      const fullName =
        [firstName, lastName].join(" ").trim() ||
        clerkUser?.fullName ||
        sessionClaims?.full_name ||
        "New User";

      const emailPrefix = primaryEmail ? primaryEmail.split("@")[0] : null;
      const rawUsername =
        clerkUser?.username ||
        sessionClaims?.username ||
        emailPrefix ||
        `user_${userId.slice(-6)}`;
      const baseUsername =
        normalizeUsername(rawUsername) || `user_${userId.slice(-6)}`;

      let username = baseUsername;
      let count = 1;
      while (await User.findOne({ username, _id: { $ne: userId } })) {
        username = `${baseUsername}${count}`;
        count += 1;
      }

      if (!user) {
        user = await User.create({
          _id: userId,
          email: primaryEmail || `${username}@example.local`,
          full_name: fullName,
          username,
          profile_picture: clerkUser?.imageUrl || "",
        });
      } else {
        const shouldUpdateUsername =
          !user.username || /^user_[a-z0-9]+$/i.test(user.username);

        user.email = primaryEmail || user.email;
        user.full_name = fullName || user.full_name;
        if (shouldUpdateUsername) {
          user.username = username;
        }
        if (
          (!user.profile_picture || user.profile_picture.trim() === "") &&
          clerkUser?.imageUrl
        ) {
          user.profile_picture = clerkUser.imageUrl;
        }
        await user.save();
      }
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "User not found" });
  }
};

export const updateUserData = async (req, res) => {
  try {
    const { userId } = await req.auth();
    let { username, bio, location, full_name } = req.body;
    const tempUser = await User.findById(userId);
    !username && (username = tempUser.username);

    if (tempUser.username !== username) {
      const user = await User.findOne({ username });
      if (user) {
        username = tempUser.username;
      }
    }

    const updatedData = {
      username,
      bio,
      location,
      full_name,
    };

    const profile = req.files?.profile?.[0];
    const cover = req.files?.cover?.[0];

    if (profile) {
      const buffer = fs.readFileSync(profile.path);
      const response = await imagekit.upload({
        file: buffer,
        fileName: profile.originalname,
      });

      const url = imagekit.url({
        path: response.filePath,
        transformation: [{ quality: "auto" }, { format: "webp" }, { width: "512" }],
      });
      updatedData.profile_picture = url;
    }

    if (cover) {
      const buffer = fs.readFileSync(cover.path);
      const response = await imagekit.upload({
        file: buffer,
        fileName: cover.originalname,
      });

      const url = imagekit.url({
        path: response.filePath,
        transformation: [{ quality: "auto" }, { format: "webp" }, { width: "1280" }],
      });
      updatedData.cover_photo = url;
    }

    const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });
    res.json({ success: true, user, message: "Profile updated!" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "User not found" });
  }
};

export const discoverUsers = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });
    const filteredUsers = allUsers.filter((user) => user._id.toString() !== userId);

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("Search error:", error);
    res.json({ success: false, message: "Search failed" });
  }
};

export const followUser = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);
    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "You are already following this user",
      });
    }

    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();

    res.json({ success: true, message: "Now you are following this user" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "User not found" });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);
    user.following = user.following.filter((followedId) => followedId !== id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter((followerId) => followerId !== userId);
    await toUser.save();

    res.json({ success: true, message: "You are no longer following this user" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "User not found" });
  }
};

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.body;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const connectionRequests = await Connection.find({
      from_user_id: userId,
      createdAt: { $gt: last24Hours },
    });
    if (connectionRequests.length >= 20) {
      return res.json({
        success: false,
        message: "You have sent more in 24 hours",
      });
    }

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (!connection) {
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      });

      await inngest.send({
        name: "app/connection-request",
        data: { connectionId: newConnection._id },
      });

      return res.json({ success: true, message: "Connection succesfully" });
    } else if (connection && connection.status === "accepted") {
      return res.json({
        success: false,
        message: "You are already connected with this user",
      });
    }

    return res.json({ success: false, message: "Pending" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserConnections = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const user = await User.findById(userId).populate("connections followers following");

    if (!user) {
      return res.json({
        success: false,
        message: "Foydalanuvchi topilmadi. Tizimga qayta kiring.",
      });
    }

    const connections = user.connections || [];
    const followers = user.followers || [];
    const following = user.following || [];

    const pendingDocs = await Connection.find({
      to_user_id: userId,
      status: "pending",
    }).populate("from_user_id");

    const pendingConnections = pendingDocs
      .map((conn) => conn.from_user_id)
      .filter((u) => u !== null);

    res.json({
      success: true,
      connections,
      followers,
      following,
      pendingConnections,
    });
  } catch (error) {
    console.log("Xatolik yuz berdi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.body;

    const connection = await Connection.findOne({ from_user_id: id, to_user_id: userId });
    if (!connection) {
      return res.json({ success: false, message: "Connection not found" });
    }

    const user = await User.findById(userId);
    user.connections.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.connections.push(userId);
    await toUser.save();

    connection.status = "accepted";
    await connection.save();

    res.json({ success: true, message: "connected" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserProfiles = async (req, res) => {
  try {
    const { profileId } = req.body;
    const profile = await User.findById(profileId);
    if (!profile) {
      return res.json({ success: false, message: "Profile not found" });
    }
    const posts = await Post.find({ user: profileId }).populate("user");

    res.json({ success: true, profile, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
