/**
 * 敏感字段加密/解密工具
 * 用于加密存储 Server.password、Site.cloudAccountPassword 等凭据
 * 
 * 加密算法：AES-256-GCM（认证加密）
 * 密钥来源：ENCRYPTION_KEY 环境变量（64位hex，必须设置）
 * 
 * 生产环境：请生成随机密钥 openssl rand -hex 32
 * 开发环境：使用固定密钥（仅限本地开发）
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("生产环境必须设置 ENCRYPTION_KEY 环境变量");
    }
    // 开发环境固定密钥
    return Buffer.from("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6", "hex");
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY 必须是 64 位十六进制字符串");
  return buf;
}

// 惰性加载，避免 webpack 构建时模块初始化导致环境变量解析失败
let _key: Buffer | null = null;
function getKeyLazy(): Buffer {
  if (!_key) _key = getKey();
  return _key;
}

/** 加密明文，返回 hex 编码的密文（格式：iv:authTag:ciphertext，均为hex） */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", getKeyLazy(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** 解密密文，返回明文 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext; // 旧数据（明文）直接返回
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");
  const decipher = createDecipheriv("aes-256-gcm", getKeyLazy(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

/** 检查值是否已加密（格式: hex:hex:hex） */
export function isEncrypted(value: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}
