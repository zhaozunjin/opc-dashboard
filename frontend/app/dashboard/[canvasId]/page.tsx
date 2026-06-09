"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { canvas as canvasApi, CanvasOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MODULES, STATUS_LABELS, ModuleKey } from "@/lib/modules";

export default function CanvasDetailPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = use(params);
  const { token, isReady } = useAuth();
  const router = useRouter();
  const [canvasData, setCanvasData] = useState<CanvasOut | null>(null);

  useEffect(() => {
    if (!isReady || !token) return;
    canvasApi.get(canvasId, token).then(setCanvasData).catch(console.error);
  }, [isReady, token, canvasId]);

  if (!isReady || !token || !canvasData) return <div className="p-8 text-center text-brand-400">加载中...</div>;

  const filledCount = canvasData.modules.filter(
    (m) => m.content.summary || m.content.items.length > 0
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-brand-400 mb-6">
        <button onClick={() => router.push("/dashboard")} className="hover:text-brand transition">
          仪表盘
        </button>
        <span>/</span>
        <span className="text-brand-700 font-medium">{canvasData.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">{canvasData.name}</h1>
          <p className="text-brand-400 text-sm mt-1">
            {filledCount}/9 模块已填写 · 创建于{" "}
            {new Date(canvasData.created_at).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <button
          onClick={() => router.push(`/review?canvasId=${canvasId}`)}
          className="px-4 py-2 bg-brand-50 text-brand border border-brand-200 rounded-lg text-sm font-medium hover:bg-brand-100 transition"
        >
          开始 Review
        </button>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
        <div
          className="bg-brand h-2 rounded-full transition-all"
          style={{ width: `${(filledCount / 9) * 100}%` }}
        />
      </div>

      {/* 九宫格 */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(MODULES) as ModuleKey[]).map((key) => {
          const mod = canvasData.modules.find((m) => m.module_key === key);
          const def = MODULES[key];
          const status = mod?.content.status || "not_started";
          const statusDef = STATUS_LABELS[status];
          const hasContent = !!(mod?.content.summary || mod?.content.items.length);

          return (
            <button
              key={key}
              onClick={() => router.push(`/dashboard/${canvasId}/${key}`)}
              className={`text-left p-5 rounded-2xl border transition hover:shadow-md ${
                hasContent
                  ? "border-brand-100 bg-white"
                  : "border-gray-100 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{def.icon}</span>
                <div>
                  <h3 className="font-semibold text-brand-800">{def.name}</h3>
                  <p className="text-xs text-brand-400">{def.question}</p>
                </div>
              </div>

              {mod?.content.summary ? (
                <p className="text-sm text-brand-600 line-clamp-2 mt-3 leading-relaxed">
                  {mod.content.summary}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic mt-3">点击开始填写...</p>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusDef.class}`}>
                  {statusDef.label}
                </span>
                {mod?.content.items && mod.content.items.length > 0 && (
                  <span className="text-[10px] text-brand-400">
                    {mod.content.items.length} 条
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
