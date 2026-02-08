import imagekit from "../configs/imageKit";
import User from "../models/User";
import fs from 'fs';

export const getUserData = async (req, res) => {
    try {
        const {userId} = req.auth();
        const user = await User.findById(userId);
        if(!user){
            return res.json({success: false, message: "User not found"});
        }
        return res.json({success: true, user});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "User not found"});
    }
}

export const updateUserData = async (req, res) => {
    try {
        const {userId} = req.auth();
        const {username, bio, location, full_name} = req.body;
        const tempUser = await User.findById(userId);
        !username && (username = tempUser.username);

        if(tempUser.username !== username){
            const user = User.findOne({username});
            if(user){
                username = tempUser.username
            }
        }

        const updatedData = {
            username,
            bio,
            location,
            full_name
        }

        const profile = req.files.profile && req.files.profile[0];
        const cover = req.files.cover && req.files.cover[0];

        if(profile){
            const buffer = fs.readFileSync(profile.path);
            const response = await imagekit.upload({
                file: buffer,
                fileName: profile.originalname,
            })

            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '512'}
                ]
            })
            updatedData.profile_picture = url;
        }

        if(cover){
            const buffer = fs.readFileSync(cover.path);
            const response = await imagekit.upload({
                file: buffer,
                fileName: profile.originalname,
            })

            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '1280'}
                ]
            })
            updatedData.cover_photo = url;
        }

        const user = await User.findByIdAndUpdate(userId, updatedData, {new: true});

        res.json({success: true, user, message: "Profile updated!"});

    } catch (error) {
        console.log(error);
        res.json({success: false, message: "User not found"});
    }
}

export const discoverUsers = async (req, res) => {
    try {
        const {userId} = req.auth();
        const {input} = req.body;

        const allUser = await User.find(
            {
                $or: [
                    {username: new RegExp(input, 'i')},
                    {email: new RegExp(input, 'i')},
                    {full_name: new RegExp(input, 'i')},
                    {location: new RegExp(input, 'i')},
                ]
            }
        )
        const filteredUsers = allUsers.filter(user => user._id !== userId);

        res.json({success: true, users: filteredUsers});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "User not found"});
    }
}

export const followUser = async (req, res) => {
    try {
        const {userId} = req.auth();
        const {id} = req.body;

        const user = await User.findById(userId);

        if(user.following.incluedes(id)){
            return res.json({success: false, message: 'You are already following this user'});
        }

        user.following.push(id);
        await user.save();
        
        const toUser = await User.findById(id);
        toUser.followers.push(userId);
        await toUser.save();

        res.json({success: true, message: 'Now you are following this user'});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "User not found"});
    }
}