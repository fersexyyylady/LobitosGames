// server/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    avatar: { type: String, default: null },
    role: {
      type: String,
      enum: ["admin", "editor", "usuario"],
      default: "usuario",
    },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, default: null },
    mfaExpiry: { type: Date, default: null },
    secretQuestion: { type: String, default: null },
    secretAnswer: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    tema: { type: String, enum: ["dark", "light"], default: "dark" },
    idioma: { type: String, default: "es" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.secretAnswer;
  delete obj.mfaSecret;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
