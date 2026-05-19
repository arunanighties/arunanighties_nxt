const { defineConfig } = require("drizzle-kit");
const path = require("path");

const databaseUrl = process.env.DATABASE_URL;


module.exports = defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl || "",
  },
});
