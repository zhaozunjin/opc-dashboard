"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { review as reviewApi, canvas as canvasApi, ReviewOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MODULES, ModuleKey } from "@/lib/modules";

export default function ReviewPage() {
  const { token, isReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasId = searchParams.get("canvasId");

  const [reviewData, setReviewData] = useState<ReviewOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isReady) return;
    if (!token || !canvasId) { router.push("/"); return; }
    startReview();
  }, [isReady, token, canvasId]);

  const startReview = async () => {
    if (!token || !canvasId) return;
    setLoading(true);
    try {
      const r = await reviewApi.start(canvasId, token);
      setReviewData(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!token || !reviewData) return;
    const q = reviewData.answers[currentIndex];
    if (!answer.trim()) {
      // Skip
      setSkipped(new Set([...skipped, q.module_key]));
      nextQuestion();
      return;
    }

    setSubmitting(true);
    try {
      await reviewApi.answer(reviewData.id, q.module_key, q.question, answer, token);
      nextQuestion();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    setAnswer("");
    if (currentIndex < reviewData!.answers.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setDone(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🤖</div>
          <p className="text-brand-400 text-lg">正在为你生成 Review 问题...</p>
          <p className="text-brand-300 text-sm mt-2">基于你填写的画布内容</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-brand-800 mb-2">Review 完成！</h1>
          <p className="text-brand-400 mb-2">
            已回答 {reviewData!.answers.length - skipped.size} 个问题
            {skipped.size > 0 && `，跳过 ${skipped.size} 个`}。
          </p>
          <p className="text-brand-400 text-sm mb-6">
            你的回答已保存，随时可以回来继续
          </p>
          <button
            onClick={() => router.push(`/dashboard/${canvasId}`)}
            className="px-6 py-3 bg-brand text-white rounded-xl font-medium hover:bg-brand-dark transition"
          >
            回到画布
          </button>
        </div>
      </div>
    );
  }

  const q = reviewData?.answers[currentIndex];
  if (!q) return null;

  const def = MODULES[q.module_key as ModuleKey];
  const progress = ((currentIndex + 1) / reviewData!.answers.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-brand-400">AI 经营 Review</span>
            <span className="text-brand-600 font-medium">
              {currentIndex + 1} / {reviewData!.answers.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-brand h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full space-y-6">
          {/* Module badge */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 rounded-full border border-brand-100">
              <span className="text-lg">{def?.icon || "📄"}</span>
              <span className="text-sm font-medium text-brand-700">{def?.name || q.module_key}</span>
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-brand text-sm">AI</span>
              </div>
              <div>
                <p className="text-sm text-brand-400 mb-1">Review 教练</p>
                <p className="text-lg font-medium text-brand-800 leading-relaxed">{q.question}</p>
              </div>
            </div>

            {/* Answer */}
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="写下你的思考..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm resize-none"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => { setAnswer(""); submitAnswer(); }}
              className="text-sm text-brand-400 hover:text-brand transition px-4 py-2"
            >
              暂不回答
            </button>
            <button
              onClick={submitAnswer}
              disabled={submitting}
              className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition disabled:opacity-50"
            >
              {submitting ? "保存中..." : answer.trim() ? "提交回答" : "跳过"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
