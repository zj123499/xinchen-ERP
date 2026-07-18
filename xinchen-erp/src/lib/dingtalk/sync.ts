/**
 * 钉钉组织架构同步工具
 * - 同步部门列表（钉钉部门作为独立顶级部门，不嵌套在本地根部门下）
 * - 同步部门下的用户
 * - 同步到本地 departments / employees 表
 */

import { prisma } from "@/lib/prisma";
import { getAccessToken } from "./auth";

const DINGTALK_API_BASE = "https://oapi.dingtalk.com";

const DEFAULT_TENANT_ID = 1; // 默认租户 ID

interface DingtalkDepartment {
  dept_id: number;
  name: string;
  parent_id: number;
  create_dept_group: boolean;
  auto_add_user: boolean;
}

interface DingtalkUserInfo {
  userid: string;
  name: string;
  mobile?: string;
  email?: string;
  dept_id_list?: number[];
  title?: string;
  avatar?: string;
}

/**
 * 获取子部门列表
 */
export async function fetchSubDepartments(parentId: number = 1): Promise<DingtalkDepartment[]> {
  const token = await getAccessToken();

  const res = await fetch(
    `${DINGTALK_API_BASE}/topapi/v2/department/listsub?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dept_id: parentId }),
    }
  );

  const data = await res.json();
  if (data.errcode !== 0) {
    throw new Error(`获取子部门失败: [${data.errcode}] ${data.errmsg}`);
  }

  return data.result || [];
}

/**
 * 递归获取所有部门
 */
export async function fetchAllDepartments(): Promise<DingtalkDepartment[]> {
  const allDepts: DingtalkDepartment[] = [];

  async function fetchRecursive(parentId: number) {
    const subs = await fetchSubDepartments(parentId);
    for (const dept of subs) {
      allDepts.push(dept);
      await fetchRecursive(dept.dept_id);
    }
  }

  await fetchRecursive(1);
  return allDepts;
}

/**
 * 获取部门下的用户列表（支持分页）
 */
export async function fetchDepartmentUsers(deptId: number): Promise<DingtalkUserInfo[]> {
  const token = await getAccessToken();
  const allUsers: DingtalkUserInfo[] = [];
  let cursor = 0;
  const size = 100;

  // 分页获取
  while (true) {
    const res = await fetch(
      `${DINGTALK_API_BASE}/topapi/v2/user/list?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dept_id: deptId, cursor, size }),
      }
    );

    const data = await res.json();
    if (data.errcode !== 0) {
      throw new Error(`获取部门用户失败: [${data.errcode}] ${data.errmsg}`);
    }

    const userList = data.result?.list || data.result?.user_list || [];
    if (userList.length === 0) break;

    allUsers.push(...userList);

    // 不足一页说明已到末尾
    if (userList.length < size) break;

    cursor += size;
  }

  return allUsers;
}

/**
 * 同步钉钉组织架构到本地数据库
 * 返回同步统计信息
 */
export async function syncDingtalkOrganization(): Promise<{
  departments: { created: number; updated: number };
  employees: { created: number; updated: number };
  users: { created: number; updated: number };
}> {
  const stats = {
    departments: { created: 0, updated: 0 },
    employees: { created: 0, updated: 0 },
    users: { created: 0, updated: 0 },
  };

  // ========================================
  // 1. 同步部门
  // ========================================
  console.log("[DingTalk] 开始同步部门...");
  const dingtalkDepts = await fetchAllDepartments();
  console.log(`[DingTalk] 获取到 ${dingtalkDepts.length} 个部门`);

  // 钉钉 dept_id → 本地 dept.id 映射
  const deptIdMap = new Map<number, number>();

  // 按 parent_id 排序，确保父部门先创建
  const sortedDepts = dingtalkDepts.sort((a, b) => a.parent_id - b.parent_id);

  for (const ddDept of sortedDepts) {
    // 钉钉根部门(dept_id=1)的直接子部门 → 本地顶级部门(parentId=null)
    // 钉钉其他部门 → 按层级关系挂载
    const parentLocalId =
      ddDept.parent_id === 1 ? null : (deptIdMap.get(ddDept.parent_id) ?? null);

    const existing = await prisma.department.findFirst({
      where: { tenantId: DEFAULT_TENANT_ID, code: `dingtalk_${ddDept.dept_id}` },
    });

    let localDept;
    if (existing) {
      localDept = await prisma.department.update({
        where: { id: existing.id },
        data: {
          name: ddDept.name,
          parentId: parentLocalId,
        },
      });
      stats.departments.updated++;
    } else {
      localDept = await prisma.department.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          name: ddDept.name,
          code: `dingtalk_${ddDept.dept_id}`,
          parentId: parentLocalId,
          sort: 0,
        },
      });
      stats.departments.created++;
    }

    deptIdMap.set(ddDept.dept_id, localDept.id);
    console.log(`[DingTalk] 部门: ${ddDept.name} (钉钉ID:${ddDept.dept_id} → 本地ID:${localDept.id}, 父ID:${parentLocalId})`);
  }

  // ========================================
  // 2. 同步员工
  // ========================================
  console.log("[DingTalk] 开始同步员工...");
  const syncedUserIds = new Set<string>();

  // 需要遍历的部门：根部门(1) + 所有子部门
  const allDeptIds = [1, ...dingtalkDepts.map((d) => d.dept_id)];
  console.log(`[DingTalk] 需要遍历 ${allDeptIds.length} 个部门获取用户`);

  for (const deptId of allDeptIds) {
    let users: DingtalkUserInfo[] = [];
    try {
      users = await fetchDepartmentUsers(deptId);
    } catch (err) {
      console.warn(`[DingTalk] 获取部门 ${deptId} 用户失败，跳过:`, err instanceof Error ? err.message : err);
      continue;
    }

    if (users.length === 0) {
      console.log(`[DingTalk] 部门 ${deptId}: 无用户`);
      continue;
    }

    console.log(`[DingTalk] 部门 ${deptId}: 获取到 ${users.length} 个用户`);

    for (const ddUser of users) {
      if (syncedUserIds.has(ddUser.userid)) continue;
      syncedUserIds.add(ddUser.userid);

      console.log(`[DingTalk] 处理用户: ${ddUser.name} (userid: ${ddUser.userid})`);

      // 创建或更新 User
      let localUser = await prisma.user.findFirst({
        where: { dingtalkUserId: ddUser.userid },
      });

      if (localUser) {
        localUser = await prisma.user.update({
          where: { id: localUser.id },
          data: {
            realName: ddUser.name,
            phone: ddUser.mobile || localUser.phone,
            email: ddUser.email || localUser.email,
            avatar: ddUser.avatar || localUser.avatar,
          },
        });
        stats.users.updated++;
      } else {
        const bcryptjs = await import("bcryptjs");
        const passwordHash = await bcryptjs.hash(`dingtalk_${ddUser.userid}`, 12);

        localUser = await prisma.user.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            username: ddUser.userid,
            passwordHash,
            realName: ddUser.name,
            phone: ddUser.mobile,
            email: ddUser.email,
            avatar: ddUser.avatar,
            dingtalkUserId: ddUser.userid,
          },
        });
        stats.users.created++;
      }

      // 创建或更新 Employee
      const existingEmployee = await prisma.employee.findFirst({
        where: { dingtalkId: ddUser.userid },
      });

      if (existingEmployee) {
        await prisma.employee.update({
          where: { id: existingEmployee.id },
          data: {
            name: ddUser.name,
            phone: ddUser.mobile,
            email: ddUser.email,
            userId: localUser.id,
          },
        });
        stats.employees.updated++;
      } else {
        await prisma.employee.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            name: ddUser.name,
            phone: ddUser.mobile,
            email: ddUser.email,
            dingtalkId: ddUser.userid,
            userId: localUser.id,
            employeeNo: ddUser.userid,
            status: "active",
          },
        });
        stats.employees.created++;
      }
    }
  }

  console.log(`[DingTalk] 同步完成: 部门${stats.departments.created + stats.departments.updated}, 员工${stats.employees.created + stats.employees.updated}, 用户${stats.users.created + stats.users.updated}`);
  return stats;
}
