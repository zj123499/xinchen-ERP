/**
 * 钉钉免登 API
 * POST /api/dingtalk/login - 通过钉钉 authCode 实现免登
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { getUserInfoByAuthCode, getUserDetail } from "@/lib/dingtalk/auth";

export async function POST(request: NextRequest) {
  try {
    const { authCode } = await request.json();

    if (!authCode) {
      return NextResponse.json({ error: "缺少 authCode" }, { status: 400 });
    }

    // 1. 通过 authCode 获取钉钉 userid
    const userInfo = await getUserInfoByAuthCode(authCode);
    const dingtalkUserId = userInfo.userid;

    console.log(`[DingTalk] 免登请求, userId: ${dingtalkUserId}`);

    // 2. 查找或创建本地用户
    let user = await prisma.user.findFirst({
      where: { dingtalkUserId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      // 获取钉钉用户详情
      const detail = await getUserDetail(dingtalkUserId);
      const bcryptjs = await import("bcryptjs");
      const passwordHash = await bcryptjs.hash(`dingtalk_${dingtalkUserId}`, 12);

      user = await prisma.user.create({
        data: {
          tenantId: 1,
          username: dingtalkUserId,
          passwordHash,
          realName: detail.name,
          phone: detail.mobile,
          email: detail.email,
          avatar: detail.avatar,
          dingtalkUserId,
        },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });

      // 创建员工档案
      await prisma.employee.create({
        data: {
          tenantId: 1,
          userId: user.id,
          name: detail.name || dingtalkUserId,
          phone: detail.mobile,
          email: detail.email,
          dingtalkId: dingtalkUserId,
          employeeNo: dingtalkUserId,
          status: "active",
        },
      });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "账号已被停用" }, { status: 403 });
    }

    // 3. 生成 JWT
    const roles = user.userRoles.map((ur) => ur.role.code);
    const token = await signToken({
      userId: user.id,
      tenantId: user.tenantId,
      username: user.username,
      roles,
    });

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        avatar: user.avatar,
        roles,
      },
    });

    // 注意: 当前仅 HTTP 部署，secure 必须为 false
    // HTTPS 部署时改为: process.env.NODE_ENV === "production"
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[DingTalk] 免登失败:", error);
    return NextResponse.json({ error: "钉钉登录失败" }, { status: 500 });
  }
}
