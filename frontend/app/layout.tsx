import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "OPC 经营仪表盘",
  description: "经营画布 + AI Review 引擎",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-surface">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
