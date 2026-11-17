import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const testDatabase = fileURLToPath(new URL("../prisma/test.db", import.meta.url));

function removeTestDatabase() {
  rmSync(testDatabase, { force: true });
  rmSync(`${testDatabase}-journal`, { force: true });
}

export default function setup() {
  removeTestDatabase();
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
  return removeTestDatabase;
}
