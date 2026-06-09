"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isReady } = useAuth();
  const router = useRouter();

  if (!isReady) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = isRegister ? auth.register : auth.login;
      const res = await fn(email, password);
      login(res.access_token, res.user_id);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">OPC 经营仪表盘</h1>
          <p className="text-brand-400 mt-2">经营画布 · AI Review 引擎</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <h2 className="text-xl font-semibold text-brand-800">
            {isRegister ? "创建账号" : "登录"}
          </h2>

          <div>
            <label className="block text-sm font-medium text-brand-600 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition disabled:opacity-50"
          >
            {loading ? "处理中..." : isRegister ? "注册" : "登录"}
          </button>

          <p className="text-center text-sm text-brand-400">
            {isRegister ? "已有账号？" : "没有账号？"}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-brand font-medium ml-1 hover:underline"
            >
              {isRegister ? "去登录" : "注册"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
