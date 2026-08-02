/**
 * 服务端请求上下文 — 从 x-* header 提取租户/用户/角色信息
 * 
 * 消除 140+ 个 API route 中的重复 getContext 定义
 */
import { NextRequest } from "next/server";

export interface ServerContext {
  tenantId: number;
  userId: number;
  roles: string[];
}

export function getServerContext(request: NextRequest): ServerContext {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    roles: (request.headers.get("x-user-roles") || "").split(",").filter(Boolean),
  };
}

/** 判断当前用户是否是管理员 */
export function isAdmin(request: NextRequest): boolean {
  const roles = (request.headers.get("x-user-roles") || "").split(",");
  return roles.includes("admin");
}

/** 判断用户拥有指定角色 */
export function hasRole(request: NextRequest, roleCode: string): boolean {
  const roles = (request.headers.get("x-user-roles") || "").split(",");
  return roles.includes(roleCode);
}
