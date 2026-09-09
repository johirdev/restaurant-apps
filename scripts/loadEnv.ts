import fs from "node:fs";

/**
 * .env হাতে পড়ি — এই প্রজেক্টে dotenv নেই, আর শুধু টেস্টের জন্য
 * একটা ডিপেন্ডেন্সি যোগ করার দরকার নেই।
 */
export function loadEnv(file = ".env") {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}
