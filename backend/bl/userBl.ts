import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userDl } from "../dl/userDl";
import { ApiError } from "../types/api.types";

const fail = (message: string, statusCode: number): ApiError =>
  Object.assign(new Error(message), { statusCode });

export const userBl = {
  async register(name: string, email: string, password: string) {
    if (await userDl.findByEmail(email))
      throw fail("Email is already registered", 409);
    const hash = await bcrypt.hash(password, 12);
    const id = await userDl.create(name, email, hash);
    return this.issueToken(id, email, name);
  },

  async login(email: string, password: string) {
    const user = await userDl.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw fail("Invalid email or password", 401);
    return this.issueToken(user.id, user.email, user.name);
  },

  issueToken(userId: number, email: string, name: string) {
    const secret = process.env.JWT_SECRET ?? "";
    if (secret.length < 32)
      throw fail("JWT_SECRET must contain at least 32 characters", 500);
    const token = jwt.sign({ userId, email, name }, secret, {
      expiresIn: (process.env.JWT_EXPIRES_IN ??
        "24h") as jwt.SignOptions["expiresIn"],
    });
    return { token, user: { id: userId, email, name } };
  },

  async profile(userId: number) {
    const user = await userDl.findById(userId);
    if (!user) throw fail("User not found", 404);
    return user;
  },

  async updateProfile(userId: number, name: string) {
    await userDl.updateProfile(userId, name);
    return this.profile(userId);
  },
};
