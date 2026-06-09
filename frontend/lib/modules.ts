/**
 * 九模块定义
 */
export const MODULES = {
  resources:     { name: "核心资源", icon: "💎", question: "我是谁？我有什么？" },
  activities:    { name: "关键业务", icon: "⚡", question: "我能做什么？" },
  customers:     { name: "客户群体", icon: "👥", question: "谁为我买单？" },
  value:         { name: "价值服务", icon: "🎯", question: "我提供什么价值？" },
  channels:      { name: "渠道通路", icon: "📡", question: "如何触达和交付？" },
  relationships: { name: "客户关系", icon: "🤝", question: "如何建立和维护关系？" },
  partners:      { name: "重要合作", icon: "🔗", question: "谁能帮我？" },
  costs:         { name: "成本结构", icon: "💰", question: "我付出什么？" },
  revenue:       { name: "收入来源", icon: "📈", question: "我得到什么？" },
} as const;

export type ModuleKey = keyof typeof MODULES;

export const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  active:      { label: "良好", class: "status-active" },
  stagnant:    { label: "停滞", class: "status-stagnant" },
  attention:   { label: "需关注", class: "status-attention" },
  not_started: { label: "未填写", class: "status-not_started" },
};
