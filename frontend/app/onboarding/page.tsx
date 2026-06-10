"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { canvas as canvasApi, ModuleContent, ModuleOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MODULES, ModuleKey } from "@/lib/modules";

const STEPS = Object.keys(MODULES) as ModuleKey[];

export default function OnboardingPage() {
  const { token, isReady } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Current module form
  const [summary, setSummary] = useState("");
  const [itemText, setItemText] = useState("");
  const [items, setItems] = useState<{ id: string; text: string; tags: string[] }[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!token) { router.push("/"); return; }
    initCanvas();
  }, [isReady, token]);

  const initCanvas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const c = await canvasApi.create("我的经营画布", token);
      setCanvasId(c.id);
      setModules(c.modules);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!itemText.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), text: itemText.trim(), tags: [] }]);
    setItemText("");
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const saveAndNext = async () => {
    if (!token || !canvasId) return;

    const currentKey = STEPS[step];
    const content: ModuleContent = {
      summary,
      items,
      notes,
      status: items.length > 0 || summary ? "active" : "not_started",
      last_reviewed_at: null,
    };

    try {
      await canvasApi.updateModule(canvasId, currentKey, content, token);
    } catch (e) {
      console.error(e);
    }

    if (step < STEPS.length - 1) {
      // 清空表单进入下一步
      setSummary("");
      setItems([]);
      setNotes("");
      setItemText("");
      setStep(step + 1);
    } else {
      // 完成 — 跳转到仪表盘
      router.push(`/dashboard/${canvasId}`);
    }
  };

  const skipAndNext = () => {
    if (step < STEPS.length - 1) {
      setSummary("");
      setItems([]);
      setNotes("");
      setItemText("");
      setStep(step + 1);
    } else {
      router.push(canvasId ? `/dashboard/${canvasId}` : "/dashboard");
    }
  };

  if (loading) return <div className="p-8 text-center text-brand-400">初始化中...</div>;

  const currentKey = STEPS[step];
  const currentDef = MODULES[currentKey];
  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-brand-800 text-white p-6 hidden md:block">
        <h1 className="text-lg font-bold mb-6">创建经营画布</h1>
        <div className="space-y-1">
          {STEPS.map((key, i) => {
            const def = MODULES[key];
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  isCurrent
                    ? "bg-brand-600 text-white"
                    : isDone
                    ? "text-brand-200"
                    : "text-brand-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? "bg-emerald-400 text-white"
                      : isCurrent
                      ? "bg-white text-brand-700"
                      : "bg-brand-600 text-brand-300"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <div>
                  <div className="font-medium">{def.name}</div>
                  <div className="text-[10px] opacity-60">{def.question}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2 text-sm text-brand-400 mb-1">
            <span>初始化引导</span>
            <span>/</span>
            <span className="text-brand-700 font-medium">{currentDef.icon} {currentDef.name}</span>
            <span className="ml-auto text-brand-400">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-brand h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Question */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{currentDef.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-brand-800">{currentDef.name}</h2>
                  <p className="text-brand-400 text-sm mt-0.5">{currentDef.question}</p>
                </div>
              </div>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="一句话回答这个模块的核心内容..."
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm"
              />
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <label className="block text-sm font-medium text-brand-600 mb-3">具体条目</label>
              
              {items.length > 0 && (
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-muted rounded-lg group">
                      <span className="text-brand-300">•</span>
                      <span className="flex-1 text-sm text-brand-800">{item.text}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                  placeholder="添加一个条目..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
                <button onClick={addItem} className="px-3 py-2 bg-brand-50 text-brand rounded-lg text-sm font-medium hover:bg-brand-100 transition">
                  + 添加
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <label className="block text-sm font-medium text-brand-600 mb-2">补充备注（可选）</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="还有什么想补充的？"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 bg-white px-6 py-4">
          <div className="max-w-2xl mx-auto flex justify-between">
            <button
              onClick={skipAndNext}
              className="px-4 py-2 text-sm text-brand-400 hover:text-brand transition"
            >
              {step < STEPS.length - 1 ? "跳过 →" : "稍后填写 →"}
            </button>
            <button
              onClick={saveAndNext}
              className="px-6 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition"
            >
              {step < STEPS.length - 1 ? "保存并继续" : "完成 🎉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
