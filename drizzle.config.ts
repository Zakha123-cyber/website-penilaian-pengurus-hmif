import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();
dotenv.config({ override: true });

export default defineConfig({
    schema: "./lib/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL!,
    },
});
