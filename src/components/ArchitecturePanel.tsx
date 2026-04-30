export function ArchitecturePanel() {
  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="data-structure">
      <h2 className="text-4xl font-black">完整資料結構與資料留存</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "User / Teacher",
            body: "id、姓名、角色、頭像。主任端看全局，教師端只看自己任務。"
          },
          {
            title: "Task",
            body: "名稱、說明、負責人、狀態、優先等級、是否關鍵、截止日、留言與附件。"
          },
          {
            title: "Event",
            body: "活動月份、起訖、任務清單、使用模板、檢討紀錄，封存後可複製成新活動。"
          },
          {
            title: "Comment / Attachment",
            body: "保留留言、照片與文件，讓活動結束後仍有可追溯紀錄。"
          },
          {
            title: "StickyNote",
            body: "內容、顏色分類、指派對象、截止日、完成狀態，可轉正式任務。"
          },
          {
            title: "ActivityArchive",
            body: "自動保存任務、分工、留言、附件與檢討，形成學校活動資料庫。"
          }
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-forest-100 bg-warm p-4">
            <h3 className="text-2xl font-black text-forest-700">{item.title}</h3>
            <p className="mt-2 text-lg font-bold leading-relaxed text-stone-700">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
