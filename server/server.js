import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { serve } from "inngest/express";
import {inngest, functions} from "./inngest/inngest.js";
import { clerkMiddleware } from '@clerk/express'
import userRouter from "./routes/userRoutes.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 4000;
        app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`));
    } catch (error) {
        console.log(error, 'Problem on server');
    }
}

app.get("/", (req, res) => {
    res.send("server is running");
})
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use('/api/user', userRouter);

startServer();