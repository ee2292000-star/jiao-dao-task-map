"use client";

import { savedEventTemplates } from "@/lib/templates";

export function TemplatePanel() {
  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="templates">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">活動準備清單</p>
          <h2 className="text-4xl font-black">常用活動工作項目</h2>
        </div>
        <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-black text-forest-800">
          建立活動時可選擇清單，系統會自動產生準備任務。
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {savedEventTemplates.map((template) => (
          <article key={template.id} className="rounded-lg border border-forest-100 bg-warm p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-ink">{template.name}</h3>
                <p className="mt-1 text-base font-bold text-stone-600">
                  共 {template.items.length} 項準備工作
                </p>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-base font-black text-forest-700">
                可套用
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {template.items.slice(0, 6).map((item) => (
                <div key={item.title} className="rounded-md bg-white px-3 py-2">
                  <p className="text-lg font-black text-ink">{item.title}</p>
                  <p className="text-base font-bold text-stone-600">
                    活動前 {item.daysBeforeEvent} 天完成
                    {item.isKeyTask ? " / 關鍵工作" : ""}
                    {item.priority === "high" ? " / 優先" : ""}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
