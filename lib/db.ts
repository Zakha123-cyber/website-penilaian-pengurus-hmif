import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/lib/schema";

const globalForDb = globalThis as unknown as {
    conn: mysql.Pool | undefined;
};

const connectionString = process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL_RUNTIME or DATABASE_URL is not set");
}

const pool =
    globalForDb.conn ??
    mysql.createPool({
        uri: connectionString,
        connectionLimit: 10,
        waitForConnections: true,
        multipleStatements: false,
    });

if (process.env.NODE_ENV !== "production") {
    globalForDb.conn = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
