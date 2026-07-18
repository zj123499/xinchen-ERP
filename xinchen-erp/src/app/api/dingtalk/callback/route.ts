/**
 * 钉钉事件回调 HTTP 接口
 * POST /api/dingtalk/callback - 接收钉钉推送的事件
 * GET  /api/dingtalk/callback - 回调 URL 校验
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCallbackUrl, computeDingtalkSignature, type DingtalkEventType } from "@/lib/dingtalk/event";
import {
  handleUserAddOrg,
  handleUserLeaveOrg,
  handleUserModifyOrg,
  handleDeptCreate,
  handleDeptModify,
  handleDeptRemove,
  handleBpmsTaskChange,
  handleBpmsInstanceChange,
} from "@/lib/dingtalk/handlers";

/**
 * GET: 回调 URL 校验
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const msgSignature = url.searchParams.get("msg_signature") || "";
  const timestamp = url.searchParams.get("timestamp") || "";
  const nonce = url.searchParams.get("nonce") || "";

  const result = verifyCallbackUrl(msgSignature, timestamp, nonce);

  if (!result.success) {
    return new NextResponse("signature invalid", { status: 403 });
  }

  return new NextResponse(result.encrypted, {
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST: 接收钉钉事件推送
 */
export async function POST(request: NextRequest) {
  try {
    const timestamp = request.headers.get("timestamp") || "";
    const sign = request.headers.get("sign") || "";

    const computedSign = computeDingtalkSignature(timestamp);
    if (sign !== computedSign) {
      console.warn("[DingTalk] 签名验证失败");
      return NextResponse.json({ errcode: 403, errmsg: "signature invalid" }, { status: 403 });
    }

    const body = await request.json();
    const eventType = body?.EventType as DingtalkEventType;

    console.log(`[DingTalk] HTTP 回调事件: ${eventType}`);

    if (!eventType) {
      return NextResponse.json({ errcode: 400, errmsg: "missing event type" });
    }

    switch (eventType) {
      case "user_add_org":
        await handleUserAddOrg(body);
        break;
      case "user_leave_org":
        await handleUserLeaveOrg(body);
        break;
      case "user_modify_org":
        await handleUserModifyOrg(body);
        break;
      case "org_dept_create":
        await handleDeptCreate(body);
        break;
      case "org_dept_modify":
        await handleDeptModify(body);
        break;
      case "org_dept_remove":
        await handleDeptRemove(body);
        break;
      case "bpms_task_change":
        await handleBpmsTaskChange(body);
        break;
      case "bpms_instance_change":
        await handleBpmsInstanceChange(body);
        break;
      default:
        console.log(`[DingTalk] 未处理的事件类型: ${eventType}`);
    }

    return NextResponse.json({
      msg_signature: computeDingtalkSignature(timestamp),
      timeStamp: timestamp,
      nonce: Math.random().toString(36).slice(2),
      encrypt: "success",
    });
  } catch (error) {
    console.error("[DingTalk] 回调处理异常:", error);
    return NextResponse.json({ errcode: 500, errmsg: "internal error" }, { status: 500 });
  }
}
