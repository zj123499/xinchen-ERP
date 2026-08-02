"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * 创建 AbortController 的 hook，组件卸载时自动 abort
 * 避免 "Can't perform a React state update on an unmounted component" 警告
 *
 * 用法：
 *   const { signal, abort } = useAbortController();
 *   useEffect(() => {
 *     fetch("/api/data", { signal })
 *       .then(r => r.json())
 *       .then(data => { if (!signal.aborted) setData(data); });
 *     return () => abort();
 *   }, []);
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  // 获取或创建 controller
  const getController = useCallback(() => {
    if (!controllerRef.current || controllerRef.current.signal.aborted) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current;
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  // 组件卸载时 abort
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    signal: getController().signal,
    abort,
  };
}
