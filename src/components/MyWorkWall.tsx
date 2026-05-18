"use client";

import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { StickyNoteCard } from "@/components/StickyNoteCard";
import { getDaysLeft } from "@/lib/reminders";
import {
  deletePersonalTodoCloud,
  isPersonalTodoCloudAvailable,
  loadPersonalTodosCloud,
  mergePersonalTodos,
  personalTodoStoragePrefix,
  syncPersonalTodosCloud,
  upsertPersonalTodoCloud
} from "@/lib/personalTodos";
import type { PersonalTodo } from "@/lib/personalTodos";
import type { Task } from "@/lib/types";

type StickyColor = NonNullable<PersonalTodo["color"]>;
type StickyStatus = PersonalTodo["status"];

type MyWorkWallProps = {
  ownerId: string;
  ownerName: string;
  officialTasks?: Task[];
};

const colors: StickyColor[] = ["yellow", "pink", "blue", "green", "purple"];

const colorLabels: Record<StickyColor, string> = {
  yellow: "黃色提醒",
  pink: "粉色想法",
  blue: "藍色待辦",
  green: "綠色進度",
  purple: "紫色重點"
};

const colorClasses: Record<StickyColor, string> = {
  yellow: "border-yellow-200 bg-yellow-100",
  pink: "border-pink-200 bg-pink-100",
  blue: "border-blue-200 bg-blue-100",
  green: "border-green-200 bg-green-100",
  purple: "border-purple-200 bg-purple-100"
};

const statusLabels: Record<StickyStatus, string> = {
  todo: "待辦",
  doing: "進行中",
  done: "已撕下",
  archived: "封存"
};

const statusClasses: Record<StickyStatus, string> = {
  todo: "bg-stone-100 text-stone-700",
  doing: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  archived: "bg-stone-200 text-stone-600"
};

function todayString() {
  return new Date().toLocaleDateString("sv-SE");
}

function readLocalTodos(key: string, ownerId: string) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((todo, index) => normalizeTodo({ ...todo, ownerId: todo.ownerId || ownerId }, index));
  } catch {
    return [];
  }
}

function writeLocalTodos(key: string, todos: PersonalTodo[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(todos));
  } catch {
    // Cloud sync is the primary path; local storage is only a fallback.
  }
}

function normalizeTodo(todo: PersonalTodo, index = 0): PersonalTodo {
  return {
    ...todo,
    content: todo.content ?? todo.note ?? "",
    note: todo.note ?? todo.content ?? "",
    color: todo.color ?? colors[index % colors.length],
    x: Number.isFinite(todo.x) ? todo.x : 70 + (index % 4) * 260,
    y: Number.isFinite(todo.y) ? todo.y : 80 + Math.floor(index / 4) * 220,
    rotation: Number.isFinite(todo.rotation) ? todo.rotation : [-2, 1, -1, 2][index % 4],
    isPrivate: true
  };
}

function statusSortValue(status: StickyStatus) {
  if (status === "doing") return 0;
  if (status === "todo") return 1;
  if (status === "done") return 2;
  return 3;
}

function officialTaskDueText(task: Task) {
  const days = getDaysLeft(task.dueDate);
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今日到期";
  return `剩 ${days} 天`;
}

export function MyWorkWall({ ownerId, ownerName, officialTasks = [] }: MyWorkWallProps) {
  const storageKey = `${personalTodoStoragePrefix}${ownerId}`;
  const [stickies, setStickies] = useState<PersonalTodo[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState<StickyColor>("yellow");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingStickyId, setEditingStickyId] = useState("");
  const [draftPosition, setDraftPosition] = useState({ x: 90, y: 90 });
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; originalX: number; originalY: number } | null>(null);
  const [syncNotice, setSyncNotice] = useState(
    isPersonalTodoCloudAvailable()
      ? "個人工作牆已連線雲端，便利貼會跨電腦同步。"
      : "個人工作牆目前保存在這台電腦。"
  );

  const selectedSticky = stickies.find((sticky) => sticky.id === selectedId);
  const activeStickies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stickies
      .filter((sticky) => sticky.status !== "done" && sticky.status !== "archived")
      .filter((sticky) => !term || `${sticky.title} ${sticky.content ?? sticky.note}`.toLowerCase().includes(term))
      .sort((a, b) => statusSortValue(a.status) - statusSortValue(b.status) || b.updatedAt.localeCompare(a.updatedAt));
  }, [search, stickies]);
  const tornStickies = stickies.filter((sticky) => sticky.status === "done" || sticky.status === "archived");
  const todoCount = stickies.filter((sticky) => sticky.status === "todo").length;
  const doingCount = stickies.filter((sticky) => sticky.status === "doing").length;

  useEffect(() => {
    let isActive = true;
    const localTodos = readLocalTodos(storageKey, ownerId);
    setStickies(localTodos);

    async function loadCloud() {
      if (!isPersonalTodoCloudAvailable()) return;
      try {
        const cloudTodos = await loadPersonalTodosCloud(ownerId);
        if (!isActive || !cloudTodos) return;
        const merged = mergePersonalTodos(localTodos, cloudTodos.map(normalizeTodo), ownerId).map(normalizeTodo);
        setStickies(merged);
        writeLocalTodos(storageKey, merged);
        await syncPersonalTodosCloud(merged);
        setSyncNotice("個人工作牆已連線雲端，便利貼會跨電腦同步。");
      } catch {
        setSyncNotice("雲端同步暫時失敗，已先保留在本機。");
      }
    }

    void loadCloud();
    return () => {
      isActive = false;
    };
  }, [ownerId, storageKey]);

  function saveStickies(nextStickies: PersonalTodo[]) {
    setStickies(nextStickies);
    writeLocalTodos(storageKey, nextStickies);
  }

  function saveChangedSticky(stickyId: string, nextStickies: PersonalTodo[]) {
    saveStickies(nextStickies);
    const changedSticky = nextStickies.find((sticky) => sticky.id === stickyId);
    if (changedSticky) {
      void upsertPersonalTodoCloud(changedSticky).catch(() => setSyncNotice("雲端同步暫時失敗，已先保留在本機。"));
    }
  }

  function createSticky(position = draftPosition) {
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle && !nextContent) return;

    const now = todayString();
    const sticky: PersonalTodo = {
      id: `personal-sticky-${Date.now()}`,
      ownerId,
      title: nextTitle || "未命名便利貼",
      note: nextContent,
      content: nextContent,
      dueDate: dueDate || undefined,
      status: "todo",
      color,
      x: Math.max(20, position.x),
      y: Math.max(20, position.y),
      rotation: Math.round(Math.random() * 6 - 3),
      isPrivate: true,
      createdAt: now,
      updatedAt: now
    };
    saveStickies([sticky, ...stickies]);
    void upsertPersonalTodoCloud(sticky).catch(() => setSyncNotice("雲端同步暫時失敗，已先保留在本機。"));
    setTitle("");
    setContent("");
    setDueDate("");
    setColor("yellow");
    setSelectedId(sticky.id);
  }

  function updateSticky(stickyId: string, changes: Partial<PersonalTodo>) {
    const nextStickies = stickies.map((sticky) =>
      sticky.id === stickyId
        ? {
            ...sticky,
            ...changes,
            note: changes.content ?? changes.note ?? sticky.note,
            content: changes.content ?? changes.note ?? sticky.content,
            completedAt: changes.status === "done" ? todayString() : changes.status === "todo" || changes.status === "doing" ? undefined : sticky.completedAt,
            updatedAt: todayString()
          }
        : sticky
    );
    saveChangedSticky(stickyId, nextStickies);
  }

  function deleteSticky(stickyId: string) {
    if (!window.confirm("確定要刪除這張個人便利貼嗎？此動作無法復原。")) return;
    saveStickies(stickies.filter((sticky) => sticky.id !== stickyId));
    setSelectedId("");
    setEditingStickyId("");
    void deletePersonalTodoCloud(stickyId, ownerId).catch(() => setSyncNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function startDrag(event: PointerEvent<HTMLElement>, sticky: PersonalTodo) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({
      id: sticky.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: sticky.x ?? 90,
      originalY: sticky.y ?? 90
    });
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!dragging) return;
    const nextStickies = stickies.map((sticky) =>
      sticky.id === dragging.id
        ? {
            ...sticky,
            x: Math.max(0, dragging.originalX + event.clientX - dragging.startX),
            y: Math.max(0, dragging.originalY + event.clientY - dragging.startY),
            updatedAt: todayString()
          }
        : sticky
    );
    saveStickies(nextStickies);
  }

  function endDrag() {
    if (!dragging) return;
    const changedSticky = stickies.find((sticky) => sticky.id === dragging.id);
    if (changedSticky) void upsertPersonalTodoCloud(changedSticky).catch(() => setSyncNotice("雲端同步暫時失敗，已先保留在本機。"));
    setDragging(null);
  }

  function handleBoardDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDraftPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft sm:p-5" id="my-work-wall">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">個人便利貼、班級提醒、教學待辦</p>
          <h2 className="mt-1 text-5xl font-black leading-tight text-ink">我的工作牆</h2>
          <p className="mt-2 text-lg font-bold text-stone-700">{ownerName} 的私人工作牆，不列入正式行政任務統計。</p>
        </div>
        <div className="rounded-lg bg-forest-50 px-4 py-3 text-base font-black text-forest-800">{syncNotice}</div>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-forest-100 bg-rice p-4 xl:grid-cols-[1fr_1.2fr_180px_170px_170px]">
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="便利貼標題"
        />
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="想記下來的事"
        />
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label="期限"
        />
        <select className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold" value={color} onChange={(event) => setColor(event.target.value as StickyColor)}>
          {colors.map((nextColor) => <option key={nextColor} value={nextColor}>{colorLabels[nextColor]}</option>)}
        </select>
        <button className="rounded-md bg-forest-700 px-5 py-3 text-lg font-black text-white" type="button" onClick={() => createSticky()}>
          新增便利貼
        </button>
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold xl:col-span-5"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜尋我的便利貼"
        />
      </div>

      <div
        className="relative mt-5 min-h-[65vh] overflow-auto rounded-lg border border-forest-100 bg-[radial-gradient(circle_at_1px_1px,rgba(47,93,58,0.12)_1px,transparent_0)] bg-[length:24px_24px] p-4 xl:min-h-[72vh]"
        onDoubleClick={handleBoardDoubleClick}
      >
        {!activeStickies.length && (
          <div className="absolute left-6 top-6 rounded-lg bg-white/90 p-5 text-xl font-black text-forest-800 shadow-soft">
            這面牆還是空的。雙擊白板空白處或按「新增便利貼」開始。
          </div>
        )}
        {activeStickies.map((sticky) => {
          const stickyColor = sticky.color ?? "yellow";
          return (
            <div
              key={sticky.id}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{ left: sticky.x ?? 90, top: sticky.y ?? 90 }}
              onPointerDown={(event) => startDrag(event, sticky)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
            >
              <StickyNoteCard
                body={sticky.content || sticky.note || undefined}
                category={statusLabels[sticky.status]}
                footer={
                  <div className="flex flex-wrap gap-2">
                    {sticky.dueDate && <span>{sticky.dueDate}</span>}
                    <span>更新 {sticky.updatedAt}</span>
                  </div>
                }
                onEdit={() => {
                  setSelectedId(sticky.id);
                  setEditingStickyId(sticky.id);
                }}
                rotation={sticky.rotation ?? 0}
                title={sticky.title}
                tone={stickyColor}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg bg-rice p-4">
          <h3 className="text-2xl font-black text-ink">今日要處理</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-white p-3">
              <p className="text-3xl font-black text-forest-700">{todoCount}</p>
              <p className="text-base font-black text-stone-700">待辦</p>
            </div>
            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-3xl font-black text-blue-800">{doingCount}</p>
              <p className="text-base font-black text-stone-700">進行中</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-soft">
          <h3 className="text-2xl font-black text-ink">正式任務提醒</h3>
          <div className="mt-3 space-y-2">
            {officialTasks.length ? officialTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-md border border-forest-100 bg-forest-50 p-3">
                <p className="text-base font-black text-ink">{task.title}</p>
                <p className="mt-1 text-sm font-bold text-forest-800">{officialTaskDueText(task)}｜主任指派</p>
              </div>
            )) : <p className="rounded-md bg-rice p-3 text-base font-black text-forest-800">目前沒有主任指派的正式任務。</p>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-soft">
          <h3 className="text-2xl font-black text-ink">已撕下的便利貼</h3>
          <div className="mt-3 space-y-2">
            {tornStickies.length ? tornStickies.slice(0, 6).map((sticky) => (
              <button key={sticky.id} className="w-full rounded-md bg-stone-50 p-3 text-left text-base font-black text-stone-700" type="button" onClick={() => setSelectedId(sticky.id)}>
                {sticky.title}
              </button>
            )) : <p className="rounded-md bg-rice p-3 text-base font-black text-forest-800">完成後的便利貼會留在這裡。</p>}
          </div>
        </div>
      </div>

      {selectedSticky && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-forest-100 bg-white p-5 shadow-2xl md:max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-forest-700">便利貼細節</p>
              <h3 className="mt-1 text-4xl font-black text-ink">{selectedSticky.title}</h3>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-forest-700 px-4 py-2 text-base font-black text-white" type="button" onClick={() => setEditingStickyId(selectedSticky.id)}>編輯</button>
              <button className="rounded-md bg-rice px-4 py-2 text-base font-black text-ink" type="button" onClick={() => setSelectedId("")}>關閉</button>
            </div>
          </div>

          {editingStickyId === selectedSticky.id ? (
            <div className="mt-5 grid gap-3">
              <input
                className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold"
                value={selectedSticky.title}
                onChange={(event) => updateSticky(selectedSticky.id, { title: event.target.value })}
              />
              <textarea
                className="min-h-36 rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold"
                value={selectedSticky.content ?? selectedSticky.note}
                onChange={(event) => updateSticky(selectedSticky.id, { content: event.target.value, note: event.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold"
                  type="date"
                  value={selectedSticky.dueDate ?? ""}
                  onChange={(event) => updateSticky(selectedSticky.id, { dueDate: event.target.value || undefined })}
                />
                <select
                  className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold"
                  value={selectedSticky.color ?? "yellow"}
                  onChange={(event) => updateSticky(selectedSticky.id, { color: event.target.value as StickyColor })}
                >
                  {colors.map((nextColor) => <option key={nextColor} value={nextColor}>{colorLabels[nextColor]}</option>)}
                </select>
                <select
                  className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold"
                  value={selectedSticky.status}
                  onChange={(event) => updateSticky(selectedSticky.id, { status: event.target.value as StickyStatus })}
                >
                  <option value="todo">待辦</option>
                  <option value="doing">進行中</option>
                  <option value="done">已撕下</option>
                  <option value="archived">封存</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-rice p-4">
              <p className="whitespace-pre-wrap break-words text-xl font-bold leading-relaxed text-ink">
                {selectedSticky.content || selectedSticky.note}
              </p>
              <div className="mt-4 grid gap-2 text-base font-black text-stone-700 sm:grid-cols-2">
                <span>狀態：{statusLabels[selectedSticky.status]}</span>
                {selectedSticky.dueDate ? <span>期限：{selectedSticky.dueDate}</span> : null}
                <span>顏色：{colorLabels[selectedSticky.color ?? "yellow"]}</span>
                <span>更新：{selectedSticky.updatedAt}</span>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button className="rounded-md bg-blue-700 px-4 py-3 text-lg font-black text-white" type="button" onClick={() => updateSticky(selectedSticky.id, { status: "doing" })}>改為進行中</button>
            <button className="rounded-md bg-forest-700 px-4 py-3 text-lg font-black text-white" type="button" onClick={() => updateSticky(selectedSticky.id, { status: "done" })}>完成並撕下</button>
            <button className="rounded-md bg-stone-100 px-4 py-3 text-lg font-black text-stone-700" type="button" onClick={() => updateSticky(selectedSticky.id, { status: "archived" })}>封存</button>
            <button className="rounded-md bg-red-50 px-4 py-3 text-lg font-black text-red-700" type="button" onClick={() => deleteSticky(selectedSticky.id)}>刪除</button>
          </div>
        </aside>
      )}
    </section>
  );
}
