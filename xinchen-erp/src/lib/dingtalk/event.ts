/**
 * 钉钉 Stream 模式事件回调
 * 使用 crypto-js 确保在 Turbopack 中也能正常编译
 */

import CryptoJS from "crypto-js";

function getAppKey(): string {
  return process.env.DINGTALK_APP_KEY || "";
}

function getAppSecret(): string {
  return process.env.DINGTALK_APP_SECRET || "";
}

// 事件类型定义
export type DingtalkEventType =
  | "user_add_org"
  | "user_leave_org"
  | "user_modify_org"
  | "org_dept_create"
  | "org_dept_modify"
  | "org_dept_remove"
  | "check_url"
  | "bpms_task_change"
  | "bpms_instance_change";

export interface DingtalkEvent {
  eventType: DingtalkEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * 计算钉钉请求签名
 */
export function computeDingtalkSignature(timestamp: string): string {
  const secret = getAppSecret();
  const stringToSign = `${timestamp}\n${secret}`;
  const hash = CryptoJS.HmacSHA256(stringToSign, secret);
  return CryptoJS.enc.Base64.stringify(hash);
}

/**
 * 校验钉钉回调 URL 的合法性
 */
export function verifyCallbackUrl(
  msgSignature: string,
  timestamp: string,
  nonce: string
): { success: boolean; encrypted: string } {
  const token = getAppKey();
  const sortList = [token, timestamp, nonce].sort();
  const sortStr = sortList.join("");

  const signature = CryptoJS.SHA1(sortStr).toString();

  if (signature !== msgSignature) {
    return { success: false, encrypted: "" };
  }

  const secret = getAppSecret();
  const key = CryptoJS.enc.Utf8.parse(secret.slice(0, 32).padEnd(32, "\0"));
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt("success", key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    success: true,
    encrypted: iv.toString() + encrypted.ciphertext.toString(),
  };
}

/**
 * 解密钉钉回调的消息体
 */
export function decryptDingtalkMessage(encrypted: string): string {
  const secret = getAppSecret();
  const key = CryptoJS.enc.Utf8.parse(secret.slice(0, 32).padEnd(32, "\0"));

  const ivHex = encrypted.slice(0, 32);
  const ciphertext = encrypted.slice(32);

  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(ciphertext),
    }),
    key,
    {
      iv: CryptoJS.enc.Hex.parse(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * 获取钉钉 Stream 模式的 Websocket 连接 URL
 */
export async function getStreamEndpoint(): Promise<{
  endpoint: string;
  ticket: string;
}> {
  const appKey = getAppKey();
  const appSecret = getAppSecret();

  const response = await fetch(
    "https://api.dingtalk.com/v1.0/gateway/connections/open",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: appKey,
        clientSecret: appSecret,
        subscriptions: [
          { type: "EVENT", topic: "*" },
          { type: "CALLBACK", topic: "*" },
        ],
        ua: "xinchen-erp/1.0",
        localIp: "127.0.0.1",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`获取 Stream endpoint 失败: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return {
    endpoint: data.endpoint,
    ticket: data.ticket,
  };
}

/**
 * 获取钉钉事件回调订阅的 topic 列表
 */
export function getSubscriptionTopics(): string[] {
  return [
    "user_add_org",
    "user_leave_org",
    "user_modify_org",
    "org_dept_create",
    "org_dept_modify",
    "org_dept_remove",
    "bpms_task_change",
    "bpms_instance_change",
    "check_url",
  ];
}

/** 事件处理器类型 */
export type EventHandler = (event: DingtalkEvent) => Promise<void>;
