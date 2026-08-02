"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthCookieSetter() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("_t");
    if (token) {
      // proxy.ts 已经通过 Set-Cookie 设置了 httpOnly cookie
      // 这里只需清除 URL 中的 _t 参数，保持地址栏干净
      const params = new URLSearchParams(searchParams.toString());
      params.delete("_t");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname);
    }
  }, [searchParams, router]);

  return null;
}
