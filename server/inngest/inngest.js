import { Inngest } from "inngest";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });
// syncUserCreation
const syncUserCreation = inngest.createFunction(
    {id: "sync-user-from-clerk"},
    {event: "clerk/user.created"},
    async ({event}) => {
        const user = event.data;
        const {id, first_name, last_name, email_addresses, image_url} = user
        let username = email_addresses[0].email_address.split("@")[0]

        const userExist = await User.findOne({username});

        if(userExist){
            username = username + Math.floor(Math.random() * 10000)
        }

        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            full_name: first_name + " " + last_name,
            profile_picture: image_url,
            username
        }
        await User.create(userData);
    }
)
// syncUserUpdation
const syncUserUpdation = inngest.createFunction(
    {id: "update-user-from-clerk"},
    {event: "clerk/user.updated"},
    async ({event}) => {
        const user = event.data;
        const {id, first_name, last_name, email_addresses, image_url} = user

        const updatedUserData = {
            email: email_addresses[0].email_address,
            full_name: first_name + " " + last_name,
            profile_picture: image_url
        }
        await User.findByIdAndUpdate(id, updatedUserData);
    }
)
// syncUserDeletion
const syncUserDeletion = inngest.createFunction(
    {id: "delete-user-from-clerk"},
    {event: "clerk/user.deleted"},
    async ({event}) => {
        const user = event.data;
        const {id} = user
        await User.findByIdAndDelete(id)
       
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
];