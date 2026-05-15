import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function currentBranchName() {
  const fromEnv =
    process.env.GITHUB_REF_NAME ||
    process.env.BRANCH_NAME ||
    process.env.RAILWAY_GIT_BRANCH ||
    "";
  if (fromEnv.trim()) return fromEnv.trim();

  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: path.resolve(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

const rootDir = path.resolve(__dirname, "..");
const branchName = currentBranchName();
const envFileName =
  branchName === "main" || branchName.startsWith("hotfix-")
    ? ".env.production"
    : ".env.development";
const envFilePath = path.resolve(rootDir, envFileName);
const fallbackEnvPath = path.resolve(rootDir, ".env");

dotenv.config({ path: envFilePath });
if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  dotenv.config({ path: fallbackEnvPath, override: false });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
