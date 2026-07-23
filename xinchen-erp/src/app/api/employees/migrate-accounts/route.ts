import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAccountUsername } from "@/lib/employee-account";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

/**
 * POST /api/employees/migrate-accounts
 * 将已有员工的登录账号（user.username）批量同步为手机号。
 * - 以员工手机号作为默认 username（通过 resolveAccountUsername 保证唯一）
 * - 跳过无手机号或无关联 User 的员工
 * - 跳过已是手机号的员工（幂等）
 * - 仅管理员可调用
 */
export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);

  const employees = await prisma.employee.findMany({
    where: {
      tenantId,
      phone: { not: null },
      user: { isNot: null },
    },
    include: {
      user: {
        select: { id: true, username: true },
      },
    },
  });

  const result = {
    total: employees.length,
    skipped: 0,
    updated: 0,
    failed: 0,
    details: [] as Array<{ employeeId: number; name: string; phone: string; oldUsername: string; newUsername: string; action: string }>,
  };

  for (const emp of employees) {
    if (!emp.phone || !emp.user) {
      result.skipped += 1;
      continue;
    }

    // 已经是手机号则跳过（幂等）
    if (emp.user.username === emp.phone) {
      result.skipped += 1;
      result.details.push({
        employeeId: emp.id,
        name: emp.name,
        phone: emp.phone,
        oldUsername: emp.user.username,
        newUsername: emp.phone,
        action: "skip",
      });
      continue;
    }

    try {
      const newUsername = await resolveAccountUsername(emp.phone, emp.phone);
      if (!newUsername) {
        result.failed += 1;
        continue;
      }

      const conflict = await prisma.user.findFirst({
        where: { username: newUsername, id: { not: emp.user.id } },
      });
      if (conflict) {
        result.skipped += 1;
        result.details.push({
          employeeId: emp.id,
          name: emp.name,
          phone: emp.phone,
          oldUsername: emp.user.username,
          newUsername: newUsername,
          action: "conflict",
        });
        continue;
      }

      await prisma.user.update({
        where: { id: emp.user.id },
        data: { username: newUsername },
      });

      result.updated += 1;
      result.details.push({
        employeeId: emp.id,
        name: emp.name,
        phone: emp.phone,
        oldUsername: emp.user.username,
        newUsername,
        action: "updated",
      });
    } catch (e: any) {
      result.failed += 1;
      result.details.push({
        employeeId: emp.id,
        name: emp.name,
        phone: emp.phone || "",
        oldUsername: emp.user.username,
        newUsername: "",
        action: `error: ${e?.message || "unknown"}`,
      });
    }
  }

  return NextResponse.json(result);
}

/**
 * GET /api/employees/migrate-accounts
 * 预览：列出哪些员工的 username 需要同步（不执行修改）
 */
export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);

  const employees = await prisma.employee.findMany({
    where: {
      tenantId,
      phone: { not: null },
      user: { isNot: null },
    },
    include: {
      user: {
        select: { id: true, username: true },
      },
    },
  });

  const needsMigration = employees
    .filter((emp) => emp.phone && emp.user && emp.user.username !== emp.phone)
    .map((emp) => ({
      employeeId: emp.id,
      name: emp.name,
      phone: emp.phone,
      currentUsername: emp.user!.username,
    }));

  const alreadyPhone = employees.filter(
    (emp) => emp.phone && emp.user && emp.user.username === emp.phone
  ).length;

  return NextResponse.json({
    totalEmployeesWithPhone: employees.length,
    alreadyUsingPhoneAsUsername: alreadyPhone,
    needMigration: needsMigration.length,
    preview: needsMigration,
  });
}
