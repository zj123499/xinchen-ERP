/**
 * 钉钉 Stream 模式连接管理器
 * 在独立进程中运行，负责建立和维护与钉钉的 Websocket 长连接
 * 
 * 注意：此文件仅在 Node.js 独立进程中使用（scripts/dingtalk-stream.ts），
 * 不通过 Next.js App Router 导入。
 */

import { getStreamEndpoint, decryptDingtalkMessage, type EventHandler, type DingtalkEventType } from "./event";

const eventHandlers = new Map<string, EventHandler[]>();
let wsConnection: InstanceType<typeof WebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

/**
 * 注册事件处理器
 */
export function on(event: string, handler: EventHandler): void {
  const handlers = eventHandlers.get(event) || [];
  handlers.push(handler);
  eventHandlers.set(event, handlers);
}

/**
 * 移除事件处理器
 */
export function off(event: string, handler: EventHandler): void {
  const handlers = eventHandlers.get(event) || [];
  const idx = handlers.indexOf(handler);
  if (idx > -1) handlers.splice(idx, 1);
  eventHandlers.set(event, handlers);
}

/**
 * 触发事件
 */
async function emit(type: string, data: Record<string, unknown>): Promise<void> {
  const event = {
    eventType: type as DingtalkEventType,
    timestamp: Date.now(),
    data,
  };

  const handlers = eventHandlers.get(type) || [];
  const wildcardHandlers = eventHandlers.get("*") || [];

  for (const handler of [...handlers, ...wildcardHandlers]) {
    try {
      await handler(event);
    } catch (err) {
      console.error(`[DingTalk] 事件处理异常 [${type}]:`, err);
    }
  }
}

/**
 * 连接钉钉 Stream Websocket
 */
async function connect(): Promise<void> {
  try {
    console.log("[DingTalk] 正在获取 Stream endpoint...");
    const { endpoint, ticket } = await getStreamEndpoint();
    console.log("[DingTalk] Stream endpoint 获取成功, 开始连接:", endpoint);

    // 使用全局 WebSocket (Node.js 21+ 内置或通过 ws 包)
    const WS = globalThis.WebSocket;
    const ws = new WS(`${endpoint}?ticket=${ticket}`);

    ws.onopen = () => {
      console.log("[DingTalk] Stream Websocket 已连接");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = async (event: MessageEvent) => {
      try {
        const rawData = typeof event.data === "string" ? event.data : "";
        const message = JSON.parse(rawData);

        if (message.headers?.type === "SYSTEM" && message.headers?.topic === "disconnect") {
          console.log("[DingTalk] 收到断开连接请求:", message.headers?.message);
          ws.close();
          return;
        }

        if (message.headers?.type === "SYSTEM" && message.headers?.topic === "ping") {
          ws.send(JSON.stringify({
            code: 200,
            headers: {
              topic: "pong",
              messageId: message.headers?.messageId,
            },
            message: "success",
          }));
          return;
        }

        if (message.data) {
          let eventData = message.data;

          if (typeof eventData === "string" && eventData.length > 16) {
            try {
              const decrypted = decryptDingtalkMessage(eventData);
              eventData = JSON.parse(decrypted);
            } catch {
              if (typeof eventData === "string") {
                eventData = JSON.parse(eventData);
              }
            }
          }

          const eventType = message.headers?.topic || eventData?.EventType || "";
          console.log(`[DingTalk] 收到事件: ${eventType}`);

          await emit(eventType, eventData);

          ws.send(JSON.stringify({
            code: 200,
            headers: {
              topic: eventType,
              messageId: message.headers?.messageId,
            },
            message: "success",
          }));
        }
      } catch (err) {
        console.error("[DingTalk] 消息处理异常:", err);
      }
    };

    ws.onerror = (error: Event) => {
      console.error("[DingTalk] Websocket 错误:", error);
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`[DingTalk] Websocket 已断开 (code: ${event.code})`);
      wsConnection = null;

      if (isRunning) {
        console.log("[DingTalk] 5秒后尝试重连...");
        reconnectTimer = setTimeout(() => {
          if (isRunning) connect();
        }, 5000);
      }
    };

    wsConnection = ws;
  } catch (err) {
    console.error("[DingTalk] 连接失败:", err);
    if (isRunning) {
      reconnectTimer = setTimeout(() => {
        if (isRunning) connect();
      }, 10000);
    }
  }
}

/**
 * 启动 Stream 连接
 */
export function startStream(): void {
  if (isRunning) return;
  isRunning = true;
  console.log("[DingTalk] 启动 Stream 模式...");
  connect();
}

/**
 * 停止 Stream 连接
 */
export function stopStream(): void {
  isRunning = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
  console.log("[DingTalk] Stream 已停止");
}

/**
 * 获取连接状态
 */
export function getStreamStatus(): {
  connected: boolean;
  running: boolean;
} {
  return {
    connected: wsConnection !== null && wsConnection.readyState === WebSocket.OPEN,
    running: isRunning,
  };
}
