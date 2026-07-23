import jwt, { SignOptions } from "jsonwebtoken";

const createToken = (
  payload: object,
  secret: string,
  expiresIn: string,
): string => {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};

export const jwtHelpers = { createToken, verifyToken };
