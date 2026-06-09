"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { canvas as canvasApi, CanvasOut, ModuleOut, ModuleContent, ModuleItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MODULES, STATUS_LABELS, ModuleKey } from "@/lib/modules";

export default function ModuleDetailPage({
  params,
}: {
  params: Promise<{ canvasId: string; moduleKey: string }>;
}) {
  const { canvasId, moduleKey } = use(params);
  const { token, isReady } = useAuth();
  const router = useRouter();

  const [canvasData, setCanvasData] = useState<CanvasOut | null>(null);
  const [module, setModule] = useState<ModuleOut | null>(null);
  const [content, setContent] = useState<ModuleContent>({
    summary: "",
    items: [],
    notes: "",
    status: "not_started",
    last_reviewed_at: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [newItemTags, setNewItemTags] = useState("");

  // Version history
  const [versions, setVersions] = useState<{ version_num: number; content: ModuleContent; created_at: string }[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [diffResult, setDiffResult] = useState<Record<string, { old: unknown; new: unknown }>>({});

  useEffect(() => {
    if (!isReady || !token) return;
    loadData();
  }, [isReady, token, canvasId, moduleKey]);

  const loadData = async () => {
    if (!token) return;
    try {
      const c = await canvasApi.get(canvasId, token);
      setCanvasData(c);
      const mod = c.modules.find((m) => m.module_key === moduleKey);
      if (mod) {
        setModule(mod);
        setContent(mod.content);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await canvasApi.updateModule(canvasId, moduleKey, content, token);
      setModule(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const loadVersions = async () => {
    if (!token) return;
    try {
      const v = await canvasApi.getVersions(canvasId, moduleKey, token);
      setVersions(v);
      setShowVersions(true);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDiff = async (vA: number, vB: number) => {
    if (!token) return;
    try {
      const d = await canvasApi.diff(canvasId, moduleKey, vA, vB, token);
      setDiffResult(d.changes);
    } catch (e) {
      console.error(e);
    }
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const item: ModuleItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      tags: newItemTags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    setContent({ ...content, items: [...content.items, item] });
    setNewItemText("");
    setNewItemTags("");
  };

  const removeItem = (id: string) => {
    setContent({ ...content, items: content.items.filter((i) => i.id !== id) });
  };

  if (!isReady || !token || !module) return <div className="p-8 text-center text-brand-400">加载中...</div>;

  const def = MODULES[moduleKey as ModuleKey] || { name: moduleKey, icon: "📄", question: "" };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-brand-400 mb-6">
        <button onClick={() => router.push("/dashboard")} className="hover:text-brand transition">
          仪表盘
        </button>
        <span>/</span>
        <span>{canvasData?.name}</span>
        <span>/</span>
        <span className="text-brand-700 font-medium">{def.icon} {def.name}</span>
      </div>

      <div className="grid grid-cols-[1fr,320px] gap-6">
        {/* Main content */}
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-brand-800 flex items-center gap-2">
                  <span className="text-2xl">{def.icon}</span>
                  {def.name}
                </h1>
                <p className="text-brand-400 text-sm mt-1">{def.question}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={content.status}
                  onChange={(e) => setContent({ ...content, status: e.target.value as any })}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-brand-600"
                >
                  <option value="not_started">未填写</option>
                  <option value="active">良好</option>
                  <option value="stagnant">停滞</option>
                  <option value="attention">需关注</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-medium text-brand-600 mb-2">一句话概括</label>
            <input
              type="text"
              value={content.summary}
              onChange={(e) => setContent({ ...content, summary: e.target.value })}
              placeholder="用一句话描述这个模块的现状..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm"
            />
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-medium text-brand-600 mb-3">条目列表</label>

            {content.items.length > 0 ? (
              <div className="space-y-2 mb-4">
                {content.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-surface-muted rounded-lg group">
                    <span className="text-brand-300 mt-0.5">•</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-800">{item.text}</p>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">还没有条目</p>
            )}

            {/* Add item */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="添加新条目..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
              <input
                type="text"
                value={newItemTags}
                onChange={(e) => setNewItemTags(e.target.value)}
                placeholder="标签（逗号分隔）"
                className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
              <button
                onClick={addItem}
                className="px-3 py-2 bg-brand-50 text-brand rounded-lg text-sm font-medium hover:bg-brand-100 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-medium text-brand-600 mb-2">自由备注</label>
            <textarea
              value={content.notes}
              onChange={(e) => setContent({ ...content, notes: e.target.value })}
              rows={4}
              placeholder="补充任何想法..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition disabled:opacity-50"
            >
              {saving ? "保存中..." : saved ? "✓ 已保存" : "保存"}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Version history */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-brand-700">版本历史</h3>
              <button
                onClick={loadVersions}
                className="text-xs text-brand hover:underline"
              >
                {showVersions ? "刷新" : "查看"}
              </button>
            </div>

            {showVersions && versions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {versions.map((v, i) => (
                  <div key={v.version_num} className="flex items-center justify-between text-xs p-2 bg-surface-muted rounded-lg">
                    <div>
                      <span className="font-mono text-brand-600">v{v.version_num}</span>
                      <span className="text-brand-400 ml-2">
                        {new Date(v.created_at).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    {i < versions.length - 1 && (
                      <button
                        onClick={() => loadDiff(versions[i + 1].version_num, v.version_num)}
                        className="text-brand hover:underline"
                      >
                        对比
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : showVersions ? (
              <p className="text-xs text-gray-400">暂无版本历史</p>
            ) : null}

            {/* Diff display */}
            {Object.keys(diffResult).length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-2">变更对比</p>
                {Object.entries(diffResult).map(([field, change]) => (
                  <div key={field} className="text-xs mb-1">
                    <span className="font-mono text-amber-600">{field}:</span>
                    <span className="text-red-400 line-through ml-1">{String(change.old).slice(0, 50)}</span>
                    <span className="text-emerald-600 ml-1">→ {String(change.new).slice(0, 50)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Module info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-brand-700 mb-3">模块信息</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-brand-400">状态</dt>
                <dd>
                  <span className={`${STATUS_LABELS[content.status]?.class} px-2 py-0.5 rounded-full`}>
                    {STATUS_LABELS[content.status]?.label}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-400">条目数</dt>
                <dd className="text-brand-700 font-medium">{content.items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-400">上次更新</dt>
                <dd className="text-brand-600">
                  {module ? new Date(module.updated_at).toLocaleDateString("zh-CN") : "-"}
                </dd>
              </div>
              {content.last_reviewed_at && (
                <div className="flex justify-between">
                  <dt className="text-brand-400">上次 Review</dt>
                  <dd className="text-brand-600">
                    {new Date(content.last_reviewed_at).toLocaleDateString("zh-CN")}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
