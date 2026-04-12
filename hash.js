import argon2 from "argon2";

const password = "123456"; // غيرها لو بدك

const hash = await argon2.hash(password);

console.log("HASH:");
console.log(hash);