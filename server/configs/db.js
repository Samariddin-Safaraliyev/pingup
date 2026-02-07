import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () => console.log("db connected"));
        await mongoose.connect(`${process.env.MONGO_DB}/pingup`);
    } catch (error) {
        console.log(error, 'Problem on database');
    }
}

export default connectDB;