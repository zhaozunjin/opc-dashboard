"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canvas as canvasApi, CanvasOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MODULES, STATUS_LABELS, ModuleKey } from "@/lib/modules";

export default function DashboardPage() {
  const { token, isReady, logout } = useAuth();
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!token) { router.push("/"); return; }
    loadCanvases();
  }, [isReady, token]);

  const loadCanvases = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await canvasApi.list(token);
      setCanvases(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!token) return;
    setCreating(true);
    try {
      const c = await canvasApi.create("我的经营画布", token);
      setCanvases([c, ...canvases]);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  if (!isReady || !token) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">OPC 经营仪表盘</h1>
          <p className="text-brand-400 text-sm mt-1">经营画布 · AI Review 引擎</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition disabled:opacity-50"
          >
            {creating ? "创建中..." : "+ 新建画布"}
          </button>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-brand-600 hover:bg-gray-50 transition"
          >
            退出
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-brand-400">加载中...</div>
      ) : canvases.length === 0 ? (
        <EmptyState onCreate={handleCreate} creating={creating} />
      ) : (
        <div className="space-y-8">
          {canvases.map((c) => (
            <CanvasCard key={c.id} canvas={c} onClick={() => router.push(`/dashboard/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="text-xl font-semibold text-brand-700 mb-2">还没有画布</h2>
      <p className="text-brand-400 mb-6">创建你的第一个经营画布，开始梳理你的商业模式</p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="px-6 py-3 bg-brand text-white rounded-xl font-medium hover:bg-brand-dark transition"
      >
        {creating ? "创建中..." : "创建画布"}
      </button>
    </div>
  );
}

function CanvasCard({ canvas: c, onClick }: { canvas: CanvasOut; onClick: () => void }) {
  const filledCount = c.modules.filter(
    (m) => m.content.summary || m.content.items.length > 0
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer" onClick={onClick}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-800">{c.name}</h2>
          <span className="text-sm text-brand-400">{filledCount}/9 模块已填写</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5">
          <div
            className="bg-brand h-1.5 rounded-full transition-all"
            style={{ width: `${(filledCount / 9) * 100}%` }}
          />
        </div>

        {/* 九宫格 */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(MODULES) as ModuleKey[]).map((key) => {
            const mod = c.modules.find((m) => m.module_key === key);
            const def = MODULES[key];
            const status = mod?.content.status || "not_started";
            const statusDef = STATUS_LABELS[status];
            const hasContent = !!(mod?.content.summary || mod?.content.items.length);

            return (
              <div
                key={key}
                className={`p-3 rounded-xl border transition ${
                  hasContent
                    ? "border-brand-100 bg-brand-50/30"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{def.icon}</span>
                  <span className="text-xs font-medium text-brand-700">{def.name}</span>
                </div>
                {mod?.content.summary ? (
                  <p className="text-xs text-brand-500 line-clamp-2 leading-relaxed">
                    {mod.content.summary}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">{def.question}</p>
                )}
                <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusDef.class}`}>
                  {statusDef.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
