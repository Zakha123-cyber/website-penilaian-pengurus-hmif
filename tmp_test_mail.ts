import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testMail() {
    console.log("Testing mail configuration...");
    console.log("Host:", process.env.SMTP_HOST);
    console.log("Port:", process.env.SMTP_PORT);
    console.log("User:", process.env.SMTP_USER);
    console.log("Secure:", process.env.SMTP_SECURE);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        // Log common issues
        debug: true,
        logger: true,
    });

    try {
        await transporter.verify();
        console.log("✅ Connection has been established successfully.");
    } catch (error) {
        console.error("❌ Failed to connect to SMTP server:");
        console.error(error);
    }
}

testMail();
