"use client";

import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import {
  defaultIdeaTopic,
  ideaTopicStorageKey,
  ideaTopicUpdatedEvent,
  ideaWallStorageKey,
  upsertIdeaCloud
} from "@/lib/ideaWall";
import type { IdeaNote } from "@/lib/ideaWall";
import {
  deleteInspirationNoteCloud,
  deleteInspirationTopicCloud,
  inspirationNotesStoragePrefix,
  inspirationTopicsStoragePrefix,
  isInspirationCloudAvailable,
  loadInspirationCloud,
  mergeInspirationNotes,
  mergeInspirationTopics,
  syncInspirationCloud,
  upsertInspirationNoteCloud,
  upsertInspirationTopicCloud
} from "@/lib/inspirationWall";
import type {
  InspirationCategory,
  InspirationColor,
  InspirationStickyNote,
  InspirationTopic
} from "@/lib/inspirationWall";
import {
  personalTodoStoragePrefix,
  upsertPersonalTodoCloud
} from "@/lib/personalTodos";
import { StickyNoteCard } from "@/components/StickyNoteCard";
import type { PersonalTodo } from "@/lib/personalTodos";
import type { AuthRole, Priority, Teacher } from "@/lib/types";

type InspirationWallProps = {
  ownerId: string;
  ownerName: string;
  role: AuthRole;
  teachers?: Teacher[];
  onCreateOfficialTask?: (input: {
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority: Priority;
    isCritical: boolean;
  }) => void;
};

const colors: InspirationColor[] = ["yellow", "pink", "blue", "green", "purple"];
const categoryOptions: InspirationCategory[] = ["teaching", "admin", "activity", "class", "exhibition", "other"];

const colorLabels: Record<InspirationColor, string> = {
  yellow: "黃色靈感",
  pink: "粉色草稿",
  blue: "藍色想法",
  green: "綠色整理",
  purple: "紫色重點"
};

const colorClasses: Record<InspirationColor, string> = {
  yellow: "border-yellow-200 bg-yellow-100",
  pink: "border-pink-200 bg-pink-100",
  blue: "border-blue-200 bg-blue-100",
  green: "border-green-200 bg-green-100",
  purple: "border-purple-200 bg-purple-100"
};

const categoryLabels: Record<InspirationCategory, string> = {
  teaching: "教學靈感",
  admin: "行政想法",
  activity: "活動發想",
  class: "班級經營",
  exhibition: "展覽策展",
  other: "其他"
};

function todayString() {
  return new Date().toLocaleDateString("sv-SE");
}

function nextWeekString() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toLocaleDateString("sv-SE");
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is a fallback for offline use.
  }
}

function normalizeNote(note: InspirationStickyNote, index = 0): InspirationStickyNote {
  return {
    ...note,
    color: note.color ?? colors[index % colors.length],
    x: Number.isFinite(note.x) ? note.x : 80 + (index % 4) * 260,
    y: Number.isFinite(note.y) ? note.y : 90 + Math.floor(index / 4) * 220,
    rotation: Number.isFinite(note.rotation) ? note.rotation : [-2, 1, -1, 2][index % 4],
    status: note.status ?? "active"
  };
}

function createDefaultTopic(ownerId: string) {
  const now = todayString();
  return {
    id: `inspiration-topic-${Date.now()}`,
    ownerId,
    title: "我的第一面靈感牆",
    description: "這裡只有你看得到，可以先放心亂想。",
    category: "other" as InspirationCategory,
    status: "open" as const,
    createdAt: now,
    updatedAt: now
  };
}

export function InspirationWall({ ownerId, ownerName, role, teachers = [], onCreateOfficialTask }: InspirationWallProps) {
  const topicsStorageKey = `${inspirationTopicsStoragePrefix}${ownerId}`;
  const notesStorageKey = `${inspirationNotesStoragePrefix}${ownerId}`;
  const isAdmin = role === "admin";
  const [topics, setTopics] = useState<InspirationTopic[]>([]);
  const [notes, setNotes] = useState<InspirationStickyNote[]>([]);
  const [activeTopicId, setActiveTopicId] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicCategory, setTopicCategory] = useState<InspirationCategory>("other");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState<InspirationColor>("yellow");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [shareTopicTitle, setShareTopicTitle] = useState(defaultIdeaTopic.title);
  const [personalDueDate, setPersonalDueDate] = useState(nextWeekString());
  const [officialDueDate, setOfficialDueDate] = useState(nextWeekString());
  const [officialAssigneeId, setOfficialAssigneeId] = useState("");
  const [officialPriority, setOfficialPriority] = useState<Priority>("normal");
  const [draftPosition, setDraftPosition] = useState({ x: 90, y: 90 });
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; originalX: number; originalY: number } | null>(null);
  const [notice, setNotice] = useState(
    isInspirationCloudAvailable()
      ? "私人靈感牆已連線雲端，只會載入你自己的資料。"
      : "目前先保存在這台電腦，連線 Supabase 後可跨電腦同步。"
  );

  const activeTopic = topics.find((topic) => topic.id === activeTopicId);
  const selectedNote = notes.find((note) => note.id === selectedId);
  const visibleNotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes
      .filter((note) => note.ownerId === ownerId)
      .filter((note) => note.topicId === activeTopicId)
      .filter((note) => note.status !== "archived")
      .filter((note) => !term || `${note.title} ${note.content}`.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [activeTopicId, notes, ownerId, search]);
  const archivedNotes = notes.filter((note) => note.ownerId === ownerId && note.topicId === activeTopicId && note.status === "archived");

  useEffect(() => {
    let isActive = true;
    const localTopics = readJson<InspirationTopic[]>(topicsStorageKey, []).filter((topic) => topic.ownerId === ownerId);
    const localNotes = readJson<InspirationStickyNote[]>(notesStorageKey, [])
      .filter((note) => note.ownerId === ownerId)
      .map(normalizeNote);
    const initialTopics = localTopics.length ? localTopics : [createDefaultTopic(ownerId)];
    setTopics(initialTopics);
    setNotes(localNotes);
    setActiveTopicId(initialTopics[0]?.id ?? "");

    async function loadCloud() {
      if (!isInspirationCloudAvailable()) return;
      try {
        const cloudData = await loadInspirationCloud(ownerId);
        if (!isActive || !cloudData) return;
        const mergedTopics = mergeInspirationTopics(initialTopics, cloudData.topics, ownerId);
        const mergedNotes = mergeInspirationNotes(localNotes, cloudData.notes.map(normalizeNote), ownerId);
        setTopics(mergedTopics);
        setNotes(mergedNotes);
        setActiveTopicId((current) => current || mergedTopics[0]?.id || "");
        writeJson(topicsStorageKey, mergedTopics);
        writeJson(notesStorageKey, mergedNotes);
        await syncInspirationCloud(mergedTopics, mergedNotes);
        setNotice("私人靈感牆已連線雲端，只會載入你自己的資料。");
      } catch {
        setNotice("雲端同步暫時失敗，已先保留在本機。");
      }
    }

    void loadCloud();
    return () => {
      isActive = false;
    };
  }, [notesStorageKey, ownerId, topicsStorageKey]);

  function saveTopics(nextTopics: InspirationTopic[]) {
    const ownedTopics = nextTopics.filter((topic) => topic.ownerId === ownerId);
    setTopics(ownedTopics);
    writeJson(topicsStorageKey, ownedTopics);
  }

  function saveNotes(nextNotes: InspirationStickyNote[]) {
    const ownedNotes = nextNotes.filter((note) => note.ownerId === ownerId);
    setNotes(ownedNotes);
    writeJson(notesStorageKey, ownedNotes);
  }

  function createTopic() {
    const title = topicTitle.trim();
    if (!title) return;
    const now = todayString();
    const topic: InspirationTopic = {
      id: `inspiration-topic-${Date.now()}`,
      ownerId,
      title,
      description: topicDescription.trim(),
      category: topicCategory,
      status: "open",
      createdAt: now,
      updatedAt: now
    };
    const nextTopics = [topic, ...topics];
    saveTopics(nextTopics);
    setActiveTopicId(topic.id);
    setTopicTitle("");
    setTopicDescription("");
    setTopicCategory("other");
    void upsertInspirationTopicCloud(topic).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function archiveTopic(topicId: string) {
    const nextTopics = topics.map((topic) =>
      topic.id === topicId
        ? {
            ...topic,
            status: (topic.status === "archived" ? "open" : "archived") as InspirationTopic["status"],
            archivedAt: topic.status === "archived" ? undefined : todayString(),
            updatedAt: todayString()
          }
        : topic
    );
    saveTopics(nextTopics);
    const changedTopic = nextTopics.find((topic) => topic.id === topicId);
    if (changedTopic) void upsertInspirationTopicCloud(changedTopic).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function deleteTopic(topicId: string) {
    if (!window.confirm("確定要刪除這面靈感牆嗎？牆上的私人便利貼也會一起刪除。")) return;
    const nextTopics = topics.filter((topic) => topic.id !== topicId);
    const nextNotes = notes.filter((note) => note.topicId !== topicId);
    saveTopics(nextTopics);
    saveNotes(nextNotes);
    setActiveTopicId(nextTopics[0]?.id ?? "");
    void deleteInspirationTopicCloud(topicId, ownerId).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function createNote(position = draftPosition) {
    if (!activeTopicId) return;
    const content = noteContent.trim();
    const title = noteTitle.trim();
    if (!content && !title) return;
    const now = todayString();
    const note: InspirationStickyNote = {
      id: `inspiration-note-${Date.now()}`,
      topicId: activeTopicId,
      ownerId,
      title: title || "未命名靈感",
      content,
      color: noteColor,
      x: Math.max(20, position.x),
      y: Math.max(20, position.y),
      rotation: Math.round(Math.random() * 6 - 3),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    saveNotes([note, ...notes]);
    setNoteTitle("");
    setNoteContent("");
    setNoteColor("yellow");
    setSelectedId(note.id);
    void upsertInspirationNoteCloud(note).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function updateNote(noteId: string, changes: Partial<InspirationStickyNote>) {
    const nextNotes = notes.map((note) => note.id === noteId ? { ...note, ...changes, updatedAt: todayString() } : note);
    saveNotes(nextNotes);
    const changedNote = nextNotes.find((note) => note.id === noteId);
    if (changedNote) void upsertInspirationNoteCloud(changedNote).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function deleteNote(noteId: string) {
    if (!window.confirm("確定要刪除這張靈感便利貼嗎？")) return;
    saveNotes(notes.filter((note) => note.id !== noteId));
    setSelectedId("");
    setEditingNoteId("");
    void deleteInspirationNoteCloud(noteId, ownerId).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
  }

  function startDrag(event: PointerEvent<HTMLElement>, note: InspirationStickyNote) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({ id: note.id, startX: event.clientX, startY: event.clientY, originalX: note.x, originalY: note.y });
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!dragging) return;
    const nextNotes = notes.map((note) =>
      note.id === dragging.id
        ? { ...note, x: Math.max(0, dragging.originalX + event.clientX - dragging.startX), y: Math.max(0, dragging.originalY + event.clientY - dragging.startY), updatedAt: todayString() }
        : note
    );
    saveNotes(nextNotes);
  }

  function endDrag() {
    if (!dragging) return;
    const changedNote = notes.find((note) => note.id === dragging.id);
    if (changedNote) void upsertInspirationNoteCloud(changedNote).catch(() => setNotice("雲端同步暫時失敗，已先保留在本機。"));
    setDragging(null);
  }

  function handleBoardDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDraftPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  function shareToIdeaWall(note: InspirationStickyNote) {
    const now = todayString();
    const topicTitle = shareTopicTitle.trim() || defaultIdeaTopic.title;
    const idea: IdeaNote = {
      id: `idea-from-inspiration-${Date.now()}`,
      title: note.title,
      body: note.content,
      authorId: ownerId,
      authorName: ownerName,
      color: note.color,
      x: note.x,
      y: note.y,
      rotation: note.rotation,
      visibility: "all",
      targetTeacherIds: [],
      supportUserIds: [],
      comments: [],
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now
    };
    const existingIdeas = readJson<IdeaNote[]>(ideaWallStorageKey, []);
    writeJson(ideaWallStorageKey, [idea, ...existingIdeas]);
    writeJson(ideaTopicStorageKey, { title: topicTitle, archived: false });
    window.dispatchEvent(new Event(ideaTopicUpdatedEvent));
    void upsertIdeaCloud(idea).catch(() => setNotice("已先分享到本機共創牆，雲端稍後再同步。"));
    setNotice("已複製一份到校內共創牆，原本私人靈感仍保留。");
  }

  function convertToPersonalTask(note: InspirationStickyNote) {
    const now = todayString();
    const todo: PersonalTodo = {
      id: `personal-sticky-${Date.now()}`,
      ownerId,
      title: note.title || "靈感待辦",
      note: note.content,
      content: note.content,
      dueDate: personalDueDate || undefined,
      status: "todo",
      color: note.color,
      x: note.x,
      y: note.y,
      rotation: note.rotation,
      isPrivate: true,
      createdAt: now,
      updatedAt: now
    };
    const storageKey = `${personalTodoStoragePrefix}${ownerId}`;
    const existingTodos = readJson<PersonalTodo[]>(storageKey, []);
    writeJson(storageKey, [todo, ...existingTodos]);
    void upsertPersonalTodoCloud(todo).catch(() => setNotice("已先轉到本機工作牆，雲端稍後再同步。"));
    setNotice("已轉成我的工作牆便利貼任務。");
  }

  function createOfficialTaskDraft(note: InspirationStickyNote) {
    if (!isAdmin || !onCreateOfficialTask) return;
    onCreateOfficialTask({
      title: note.title || "靈感轉正式任務",
      description: note.content,
      assigneeId: officialAssigneeId,
      dueDate: officialDueDate || nextWeekString(),
      priority: officialPriority,
      isCritical: officialPriority === "high"
    });
    setNotice("已建立正式任務草稿，可到正式任務牆確認。");
  }

  return (
    <section className="space-y-5" id="inspiration-wall">
      <div className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-xl font-bold text-forest-700">私人書桌、自由發想、暫不公開</p>
        <div className="mt-2 flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-5xl font-black leading-tight text-ink">我的靈感牆</h2>
            <p className="mt-2 text-xl font-bold text-stone-700">這裡只有你看得到，可以先放心亂想。</p>
          </div>
          <p className="rounded-lg bg-forest-50 px-4 py-3 text-base font-black text-forest-800">{notice}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-lg bg-white p-4 shadow-soft">
          <div>
            <h3 className="text-3xl font-black text-ink">私人主題</h3>
            <p className="mt-1 text-base font-bold text-stone-700">每個主題都是一面獨立白板。</p>
          </div>
          <div className="grid gap-2">
            <input className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} placeholder="主題名稱，例如：畢業典禮點子" />
            <input className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={topicDescription} onChange={(event) => setTopicDescription(event.target.value)} placeholder="簡短描述，可先空著" />
            <select className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={topicCategory} onChange={(event) => setTopicCategory(event.target.value as InspirationCategory)}>
              {categoryOptions.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
            </select>
            <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={createTopic}>建立靈感牆</button>
          </div>
          <div className="space-y-2">
            {topics.length ? topics.map((topic) => (
              <button
                key={topic.id}
                className={`w-full rounded-md border px-3 py-3 text-left ${activeTopicId === topic.id ? "border-forest-700 bg-forest-50" : "border-forest-100 bg-rice"}`}
                type="button"
                onClick={() => setActiveTopicId(topic.id)}
              >
                <p className="text-lg font-black text-ink">{topic.title}</p>
                <p className="text-sm font-bold text-forest-800">{categoryLabels[topic.category]}｜{topic.status === "archived" ? "已封存" : "開放中"}</p>
              </button>
            )) : <p className="rounded-md bg-rice p-4 text-base font-black text-forest-800">還沒有靈感牆，先建立一面自己的想法白板吧。</p>}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow-soft">
            <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
              <div>
                <p className="text-lg font-black text-forest-700">{activeTopic ? categoryLabels[activeTopic.category] : "私人白板"}</p>
                <h3 className="text-4xl font-black text-ink">{activeTopic?.title ?? "尚未建立靈感牆"}</h3>
                {activeTopic?.description && <p className="mt-1 text-base font-bold text-stone-700">{activeTopic.description}</p>}
              </div>
              {activeTopic && (
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md bg-rice px-4 py-2 text-base font-black text-ink" type="button" onClick={() => archiveTopic(activeTopic.id)}>
                    {activeTopic.status === "archived" ? "重新開啟" : "封存主題"}
                  </button>
                  <button className="rounded-md bg-red-50 px-4 py-2 text-base font-black text-red-700" type="button" onClick={() => deleteTopic(activeTopic.id)}>刪除主題</button>
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.5fr_180px_170px_170px]">
              <input className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="便利貼標題" />
              <input className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="先把想法貼上來" />
              <select className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={noteColor} onChange={(event) => setNoteColor(event.target.value as InspirationColor)}>
                {colors.map((nextColor) => <option key={nextColor} value={nextColor}>{colorLabels[nextColor]}</option>)}
              </select>
              <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => createNote()} disabled={!activeTopic || activeTopic.status === "archived"}>新增便利貼</button>
              <input className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-base font-bold" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋" />
            </div>
          </div>

          <div
            className="relative min-h-[70vh] overflow-auto rounded-lg border border-forest-100 bg-[radial-gradient(circle_at_1px_1px,rgba(47,93,58,0.12)_1px,transparent_0)] bg-[length:24px_24px] p-4 shadow-soft"
            onDoubleClick={handleBoardDoubleClick}
          >
            {!visibleNotes.length && (
              <div className="absolute left-6 top-6 rounded-lg bg-white/90 p-5 text-xl font-black text-forest-800 shadow-soft">
                雙擊白板空白處，或用上方按鈕貼上第一張靈感便利貼。
              </div>
            )}
            {visibleNotes.map((note) => (
              <div
                key={note.id}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{ left: note.x, top: note.y }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedId(note.id);
                  setEditingNoteId("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedId(note.id);
                    setEditingNoteId("");
                  }
                }}
                onPointerDown={(event) => startDrag(event, note)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
              >
                <StickyNoteCard
                  body={note.content || "??????"}
                  category="??"
                  footer={<span>?? {note.updatedAt}</span>}
                  onEdit={() => {
                    setSelectedId(note.id);
                    setEditingNoteId(note.id);
                  }}
                  rotation={note.rotation}
                  title={note.title}
                  tone={note.color}
                />
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white p-4 shadow-soft">
            <h3 className="text-2xl font-black text-ink">封存的靈感便利貼</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {archivedNotes.length ? archivedNotes.map((note) => (
                <button key={note.id} className="rounded-md bg-rice p-3 text-left text-base font-black text-stone-700" type="button" onClick={() => setSelectedId(note.id)}>
                  {note.title}
                </button>
              )) : <p className="rounded-md bg-rice p-3 text-base font-black text-forest-800 md:col-span-2 xl:col-span-3">目前沒有封存的靈感便利貼。</p>}
            </div>
          </div>
        </div>
      </div>

      {selectedNote && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-forest-100 bg-white p-5 shadow-2xl md:max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-forest-700">靈感便利貼</p>
              <h3 className="mt-1 text-4xl font-black text-ink">{selectedNote.title}</h3>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-forest-700 px-4 py-2 text-base font-black text-white" type="button" onClick={() => setEditingNoteId(selectedNote.id)}>編輯</button>
              <button className="rounded-md bg-rice px-4 py-2 text-base font-black text-ink" type="button" onClick={() => setSelectedId("")}>關閉</button>
            </div>
          </div>

          {editingNoteId === selectedNote.id ? (
            <div className="mt-5 grid gap-3">
              <input className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold" value={selectedNote.title} onChange={(event) => updateNote(selectedNote.id, { title: event.target.value })} />
              <textarea className="min-h-36 rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold" value={selectedNote.content} onChange={(event) => updateNote(selectedNote.id, { content: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="rounded-md border border-forest-100 bg-rice px-3 py-3 text-lg font-bold" value={selectedNote.color} onChange={(event) => updateNote(selectedNote.id, { color: event.target.value as InspirationColor })}>
                  {colors.map((nextColor) => <option key={nextColor} value={nextColor}>{colorLabels[nextColor]}</option>)}
                </select>
                <button className="rounded-md bg-stone-100 px-4 py-3 text-lg font-black text-stone-700" type="button" onClick={() => updateNote(selectedNote.id, { status: selectedNote.status === "archived" ? "active" : "archived" })}>
                  {selectedNote.status === "archived" ? "??" : "??"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-rice p-4">
              <p className="whitespace-pre-wrap break-words text-xl font-bold leading-relaxed text-ink">
                {selectedNote.content || "??????"}
              </p>
              <div className="mt-4 grid gap-2 text-base font-black text-stone-700 sm:grid-cols-2">
                <span>???{colorLabels[selectedNote.color]}</span>
                <span>???{selectedNote.status === "archived" ? "???" : "???"}</span>
                <span>???{selectedNote.updatedAt}</span>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-lg bg-rice p-4">
            <h4 className="text-2xl font-black text-ink">分享或轉換</h4>
            <div className="mt-3 grid gap-2">
              <input className="rounded-md border border-forest-100 bg-white px-3 py-3 text-base font-bold" value={shareTopicTitle} onChange={(event) => setShareTopicTitle(event.target.value)} placeholder="分享到哪個共創主題" />
              <button className="rounded-md bg-blue-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => shareToIdeaWall(selectedNote)}>分享到校內共創牆</button>
              <input className="rounded-md border border-forest-100 bg-white px-3 py-3 text-base font-bold" type="date" value={personalDueDate} onChange={(event) => setPersonalDueDate(event.target.value)} />
              <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => convertToPersonalTask(selectedNote)}>轉成我的工作牆任務</button>
              {isAdmin && (
                <>
                  <select className="rounded-md border border-forest-100 bg-white px-3 py-3 text-base font-bold" value={officialAssigneeId} onChange={(event) => setOfficialAssigneeId(event.target.value)}>
                    <option value="">尚未指派</option>
                    {teachers.filter((teacher) => teacher.enabled !== false).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                  </select>
                  <input className="rounded-md border border-forest-100 bg-white px-3 py-3 text-base font-bold" type="date" value={officialDueDate} onChange={(event) => setOfficialDueDate(event.target.value)} />
                  <select className="rounded-md border border-forest-100 bg-white px-3 py-3 text-base font-bold" value={officialPriority} onChange={(event) => setOfficialPriority(event.target.value as Priority)}>
                    <option value="low">低</option>
                    <option value="normal">一般</option>
                    <option value="high">高</option>
                  </select>
                  <button className="rounded-md bg-amber-100 px-4 py-3 text-base font-black text-amber-900" type="button" onClick={() => createOfficialTaskDraft(selectedNote)}>轉成正式任務草稿</button>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button className="rounded-md bg-red-50 px-4 py-3 text-lg font-black text-red-700" type="button" onClick={() => deleteNote(selectedNote.id)}>刪除</button>
          </div>
        </aside>
      )}
    </section>
  );
}
