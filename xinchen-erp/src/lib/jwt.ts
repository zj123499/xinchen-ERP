import { SignJWT, jwtVerify } from "jose";

// 生产环境必须设置 JWT_SECRET，不允许硬编码回退
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须设置 JWT_SECRET 环境变量");
  }
  console.warn("[安全] 未设置 JWT_SECRET，开发环境使用临时密钥");
}
const SECRET = new TextEncoder().encode(
  jwtSecret || "xinchen-erp-jwt-secret-dev-" + Date.now()
);

export interface TokenPayload {
  userId: number;
  tenantId: number;
  username: string;
  roles: string[];
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
