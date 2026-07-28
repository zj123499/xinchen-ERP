"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthCookieSetter() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("_t");
    if (token) {
      // 写入 cookie（非 httpOnly，浏览器可以读写）
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
      // 清除 URL 中的 token，保持地址栏干净
      const params = new URLSearchParams(searchParams.toString());
      params.delete("_t");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname);
    }
  }, [searchParams, router]);

  return null;
}
