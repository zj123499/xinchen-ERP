import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AuthCookieSetter from "@/components/AuthCookieSetter";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={null}>
        <AuthCookieSetter />
      </Suspense>
      <Sidebar />
      <Header />
      <main className="ml-[240px] mt-14 p-6 min-h-[calc(100vh-56px)]">
        {children}
      </main>
    </div>
  );
}
