const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  socketId: String,
  ratings: [Number] // store individual ratings (e.g. [4, 5, 3])
});

module.exports = mongoose.model("User", UserSchema, "chat_users");
