"use client";

import dynamic from "next/dynamic";

const ScreenClient = dynamic(() => import("./ScreenClient"), { ssr: false });

export default function ScreenWrapper() {
  return <ScreenClient />;
}
