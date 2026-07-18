/**
 * 钉钉 JSAPI 类型声明
 * 用于前端钉钉免登和 JSAPI 调用
 */

interface DdRuntimePermission {
  requestAuthCode: (options: {
    corpId: string;
    onSuccess: (result: { code: string }) => void;
    onFail: (err: Error) => void;
  }) => void;
}

interface DdRuntime {
  permission?: DdRuntimePermission;
}

interface DingtalkJSAPI {
  runtime?: DdRuntime;
  ready: (callback: () => void) => void;
  error: (callback: (err: Error) => void) => void;
  config: (options: {
    agentId: string;
    corpId: string;
    timeStamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }) => void;
}

declare global {
  interface Window {
    dd?: DingtalkJSAPI;
  }
}

export {};
