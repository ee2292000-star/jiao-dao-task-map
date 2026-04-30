"use client";

import { savedEventTemplates } from "@/lib/templates";

export function TemplatePanel() {
  const template = savedEventTemplates[0];

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="templates">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">可儲存、下次可複製</p>
          <h2 className="text-4xl font-black">活動模板系統</h2>
        </div>
        <button className="rounded-md bg-forest-700 px-5 py-3 text-xl font-black text-white">
          複製成新活動
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {template.items.map((item) => (
          <div key={item.title} className="rounded-lg border border-forest-100 bg-warm p-4">
            <h3 className="text-2xl font-black">{item.title}</h3>
            <p className="mt-2 text-lg font-bold text-stone-700">活動前 {item.daysBeforeEvent} 天</p>
            <p className="mt-1 text-lg font-bold text-forest-700">
              {item.isKeyTask ? "關鍵任務" : "一般任務"} · {item.priority === "high" ? "高優先" : "一般"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
