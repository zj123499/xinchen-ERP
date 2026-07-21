/**
 * 文件存储抽象层
 *
 * 支持两种后端：
 *   - local:    本地文件系统（/tmp/erp_uploads，开发/临时用）
 *   - nextcloud: NextCloud WebDAV（生产环境，待部署后切换）
 *
 * 通过环境变量 STORAGE_BACKEND 切换：
 *   STORAGE_BACKEND=local     → 本地存储（默认）
 *   STORAGE_BACKEND=nextcloud → NextCloud 存储
 *
 * 所有上传 API 通过此模块保存文件，切换后端无需改业务代码。
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

/** 上传参数 */
export interface UploadParams {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  businessType: string;  // 如 student_material / partner_contract
  businessId: string;     // 如学生ID / 合作方ID
  category?: string;      // 子分类，如 文书 / 申请材料
}

/** 上传结果 */
export interface UploadResult {
  storagePath: string;  // 完整存储路径
  success: boolean;
  error?: string;
}

/** 存储引擎接口 */
export interface StorageBackend {
  save(params: UploadParams): Promise<UploadResult>;
  remove(storagePath: string): Promise<boolean>;
  getType(): string;
}

// ============================================
// 本地文件存储
// ============================================
class LocalStorage implements StorageBackend {
  private basePath: string;

  constructor() {
    this.basePath = process.env.UPLOAD_PATH || "/tmp/erp_uploads";
  }

  async save(params: UploadParams): Promise<UploadResult> {
    const timestamp = Date.now();
    const safeName = params.originalName.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_");
    const catDir = params.category || "other";
    const dirPath = path.join(this.basePath, params.businessType, params.businessId, catDir);
    const fileName = `${timestamp}_${safeName}`;
    const fullPath = path.join(dirPath, fileName);

    await mkdir(dirPath, { recursive: true });
    await writeFile(fullPath, params.buffer);

    return { storagePath: fullPath, success: true };
  }

  async remove(storagePath: string): Promise<boolean> {
    try { await unlink(storagePath); return true; }
    catch { return false; }
  }

  getType(): string { return "local"; }
}

// ============================================
// NextCloud WebDAV 存储（待部署后启用）
// ============================================
class NextcloudStorage implements StorageBackend {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseUrl = process.env.NEXTCLOUD_URL || "";
    this.username = process.env.NEXTCLOUD_USER || "";
    this.password = process.env.NEXTCLOUD_PASS || "";
  }

  async save(params: UploadParams): Promise<UploadResult> {
    if (!this.baseUrl || !this.username || !this.password) {
      return { storagePath: "", success: false, error: "NextCloud 未配置" };
    }

    const timestamp = Date.now();
    const safeName = params.originalName.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_");
    const catDir = params.category || "other";
    const remotePath = `erp/${params.businessType}/${params.businessId}/${catDir}`;
    const remoteFile = `${remotePath}/${timestamp}_${safeName}`;

    try {
      // 逐级创建目录
      const pathParts = remotePath.split("/");
      let currentPath = "";
      for (const part of pathParts) {
        if (!part) continue;
        currentPath += "/" + part;
        await this.mkcol(currentPath).catch(() => {}); // 忽略已存在
      }

      // PUT 上传文件
      const uploadUrl = `${this.baseUrl}/remote.php/dav/files/${this.username}/${remoteFile}`;
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${this.username}:${this.password}`).toString("base64"),
          "Content-Type": params.mimeType,
        },
        body: params.buffer,
      });

      if (res.status >= 200 && res.status < 300) {
        return { storagePath: `nextcloud:${remoteFile}`, success: true };
      }
      return { storagePath: "", success: false, error: `NextCloud 返回 ${res.status}` };
    } catch (e: any) {
      return { storagePath: "", success: false, error: e.message };
    }
  }

  /** 创建 WebDAV 目录 */
  private async mkcol(remotePath: string): Promise<void> {
    const url = `${this.baseUrl}/remote.php/dav/files/${this.username}${remotePath}`;
    const res = await fetch(url, {
      method: "MKCOL",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${this.username}:${this.password}`).toString("base64"),
      },
    });
    if (res.status !== 201 && res.status !== 405) { // 405 = already exists
      throw new Error(`MKCOL failed: ${res.status}`);
    }
  }

  async remove(storagePath: string): Promise<boolean> {
    if (!storagePath.startsWith("nextcloud:")) return false;
    const remotePath = storagePath.replace("nextcloud:", "");
    const url = `${this.baseUrl}/remote.php/dav/files/${this.username}/${remotePath}`;
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${this.username}:${this.password}`).toString("base64"),
        },
      });
      return res.status >= 200 && res.status < 300;
    } catch { return false; }
  }

  getType(): string { return "nextcloud"; }
}

// ============================================
// 工厂方法
// ============================================
let _backend: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (_backend) return _backend;
  const backend = (process.env.STORAGE_BACKEND || "local").toLowerCase();
  _backend = backend === "nextcloud" ? new NextcloudStorage() : new LocalStorage();
  return _backend;
}

/** 检查 NextCloud 是否已配置并可用 */
export async function checkNextcloudStatus(): Promise<{ configured: boolean; reachable: boolean; message: string }> {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  if (!url || !user) return { configured: false, reachable: false, message: "未配置" };

  try {
    const res = await fetch(`${url}/status.php`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      return { configured: true, reachable: true, message: `NextCloud ${data.versionstring || ""} 已连接` };
    }
    return { configured: true, reachable: false, message: `无法连接: HTTP ${res.status}` };
  } catch {
    return { configured: true, reachable: false, message: "连接超时或拒绝" };
  }
}
