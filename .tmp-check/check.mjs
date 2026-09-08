import fs from "node:fs";
import mongoose from "mongoose";
const env = fs.readFileSync(".env","utf8");
const uri = (env.match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,"");
await mongoose.connect(uri);
const docs = await mongoose.connection.db.collection("otps").find({ phone: "01799887766" }).sort({createdAt:-1}).limit(3).toArray();
console.log(JSON.stringify(docs, null, 2));
await mongoose.disconnect();
