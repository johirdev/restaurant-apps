import fs from "node:fs"; import jwt from "jsonwebtoken";
const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
console.log(jwt.sign({id:"000000000000000000000001",email:"local@test",name:"Owner",role:process.argv[2]||"superadmin"},env.JWT_SECRET,{expiresIn:"30m"}));
