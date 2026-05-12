"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent, PointerEvent } from "react";
import {
  defaultIdeaTopic,
  deleteIdeaCloud,
  ideaTopicStorageKey,
  ideaTopicUpdatedEvent,
  ideaWallStorageKey,
  isIdeaWallCloudAvailable,
  loadIdeaWallCloudData,
  saveIdeaTopicCloud,
  subscribeIdeaWallCloud,
  upsertIdeaCloud
} from "@/lib/ideaWall";
import type { IdeaColor, IdeaComment, IdeaNote, IdeaTopic, IdeaVisibility } from "@/lib/ideaWall";
import type { AuthRole, Teacher } from "@/lib/types";

type IdeaWallProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: AuthRole;
  teachers?: Teacher[];
};

const text = {
  title: "\u60f3\u6cd5\u7246\uff0f\u5171\u5275\u4fbf\u5229\u8cbc",
  topicPlaceholder: "\u4f8b\u5982\uff1a\u7562\u696d\u5178\u79ae\u4e3b\u984c\u52df\u96c6",
  saveTopic: "\u66f4\u65b0\u4e3b\u984c",
  topicSaved: "\u4e3b\u984c\u5df2\u66f4\u65b0",
  archiveTopic: "\u5c01\u5b58\u4e3b\u984c",
  reopenTopic: "\u91cd\u958b\u4e3b\u984c",
  loading: "\u6b63\u5728\u8f09\u5165\u6700\u65b0\u4fbf\u5229\u8cbc...",
  syncing: "\u540c\u6b65\u4e2d...",
  cloudReady: "\u5df2\u9023\u7dda\u96f2\u7aef\uff0c\u5171\u5275\u4fbf\u5229\u8cbc\u4ee5\u8cc7\u6599\u5eab\u70ba\u6e96\u3002",
  cloudFallback: "\u96f2\u7aef\u540c\u6b65\u5c1a\u672a\u555f\u7528\uff0c\u76ee\u524d\u50c5\u4fdd\u7559\u5728\u9019\u53f0\u96fb\u8166\u3002",
  cloudSavingFailed: "\u96f2\u7aef\u66ab\u6642\u7121\u6cd5\u5132\u5b58\uff0c\u5df2\u91cd\u65b0\u8f09\u5165\u6700\u65b0\u8cc7\u6599\u3002",
  addNote: "\u65b0\u589e\u4fbf\u5229\u8cbc",
  titleInput: "\u6a19\u984c\uff08\u53ef\u9078\uff09",
  bodyInput: "\u60f3\u6cd5\u5167\u5bb9\uff0cEnter \u53ef\u63db\u884c",
  search: "\u641c\u5c0b\u60f3\u6cd5",
  noIdeas: "\u96d9\u64ca\u767d\u677f\u7a7a\u767d\u8655\uff0c\u8cbc\u4e0a\u7b2c\u4e00\u5f35\u60f3\u6cd5\u3002",
  support: "\u652f\u6301",
  supported: "\u5df2\u652f\u6301",
  comments: "\u7559\u8a00",
  commentPlaceholder: "\u88dc\u5145\u4e00\u500b\u60f3\u6cd5\u6216\u56de\u61c9",
  sendComment: "\u7559\u8a00",
  edit: "\u7de8\u8f2f",
  save: "\u5132\u5b58",
  close: "\u95dc\u9589",
  remove: "\u522a\u9664",
  pin: "\u7f6e\u9802",
  unpin: "\u53d6\u6d88\u7f6e\u9802",
  pinned: "\u7f6e\u9802",
  moveMode: "\u79fb\u52d5\u6a21\u5f0f",
  untitled: "\u672a\u547d\u540d\u60f3\u6cd5",
  confirmDelete: "\u78ba\u5b9a\u8981\u522a\u9664\u9019\u5f35\u60f3\u6cd5\u4fbf\u5229\u8cbc\u55ce\uff1f"
};

const colorClasses: Record<IdeaColor, string> = {
  yellow: "border-yellow-200 bg-yellow-100",
  pink: "border-pink-200 bg-pink-100",
  blue: "border-blue-200 bg-blue-100",
  green: "border-green-200 bg-green-100",
  purple: "border-purple-200 bg-purple-100"
};

const colorOptions: IdeaColor[] = ["yellow", "pink", "blue", "green", "purple"];
const colorLabels: Record<IdeaColor, string> = {
  yellow: "\u9ec3\u8272\u9748\u611f",
  pink: "\u7c89\u8272\u8a0e\u8ad6",
  blue: "\u85cd\u8272\u60f3\u6cd5",
  green: "\u7da0\u8272\u88dc\u5145",
  purple: "\u7d2b\u8272\u91cd\u9ede"
};

function todayString() {
  return new Date().toLocaleDateString("sv-SE");
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
    // localStorage is only used when cloud sync is not configured.
  }
}

function clearStoredIdeaWall() {
  try {
    window.localStorage.removeItem(ideaWallStorageKey);
  } catch {
    // Ignore browser storage failures.
  }
}

function normalizeIdea(idea: IdeaNote, index: number): IdeaNote {
  return {
    ...idea,
    x: Number.isFinite(idea.x) ? idea.x : 70 + (index % 4) * 250,
    y: Number.isFinite(idea.y) ? idea.y : 80 + Math.floor(index / 4) * 210,
    rotation: Number.isFinite(idea.rotation) ? idea.rotation : [-3, 2, -1, 3][index % 4],
    color: (idea.color as string) === "orange" ? "purple" : idea.color,
    visibility: idea.visibility ?? "all",
    targetTeacherIds: idea.targetTeacherIds ?? [],
    supportUserIds: idea.supportUserIds ?? [],
    comments: idea.comments ?? []
  };
}

function sortIdeas(ideas: IdeaNote[]) {
  return [...ideas].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

function autoResizeTextArea(event: FormEvent<HTMLTextAreaElement>) {
  const element = event.currentTarget;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function IdeaWall({ currentUserId, currentUserName, currentUserRole, teachers = [] }: IdeaWallProps) {
  const [ideas, setIdeas] = useState<IdeaNote[]>([]);
  const [topic, setTopic] = useState<IdeaTopic>(defaultIdeaTopic);
  const [topicDraft, setTopicDraft] = useState(defaultIdeaTopic.title);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState<IdeaColor>("yellow");
  const [visibility, setVisibility] = useState<IdeaVisibility>("all");
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editColor, setEditColor] = useState<IdeaColor>("yellow");
  const [editVisibility, setEditVisibility] = useState<IdeaVisibility>("all");
  const [editTargetTeacherId, setEditTargetTeacherId] = useState("");
  const [topicNotice, setTopicNotice] = useState("");
  const [syncNotice, setSyncNotice] = useState(isIdeaWallCloudAvailable() ? text.loading : text.cloudFallback);
  const [isLoading, setIsLoading] = useState(isIdeaWallCloudAvailable());
  const [isSyncing, setIsSyncing] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [draftPosition, setDraftPosition] = useState({ x: 90, y: 90 });
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; originalX: number; originalY: number } | null>(null);

  const isAdmin = currentUserRole === "admin";
  const currentActorId = currentUserId || `name:${currentUserName}`;
  const selectedIdea = ideas.find((idea) => idea.id === selectedId);

  const visibleIdeas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortIdeas(
      ideas
        .filter((idea) => !idea.archived)
        .filter((idea) => isAdmin || isIdeaOwner(idea) || idea.visibility === "all" || idea.targetTeacherIds.includes(currentActorId) || idea.targetTeacherIds.includes(currentUserId))
        .filter((idea) => !term || `${idea.title} ${idea.body} ${idea.authorName}`.toLowerCase().includes(term))
    );
  }, [currentActorId, currentUserId, currentUserName, ideas, isAdmin, search]);

  async function refreshCloudIdeas() {
    if (!isIdeaWallCloudAvailable()) return;
    setIsSyncing(true);
    try {
      const cloudData = await loadIdeaWallCloudData();
      if (!cloudData) return;
      const normalizedIdeas = cloudData.ideas.map(normalizeIdea);
      const nextTopic = cloudData.topic.title ? cloudData.topic : defaultIdeaTopic;
      setTopic(nextTopic);
      setTopicDraft(nextTopic.title);
      setIdeas(sortIdeas(normalizedIdeas));
      clearStoredIdeaWall();
      setSyncNotice(text.cloudReady);
    } catch {
      setSyncNotice(text.cloudSavingFailed);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (isIdeaWallCloudAvailable()) {
      void refreshCloudIdeas();
      const unsubscribe = subscribeIdeaWallCloud(() => {
        void refreshCloudIdeas();
      });
      const intervalId = window.setInterval(() => {
        void refreshCloudIdeas();
      }, 20000);
      const handleVisibility = () => {
        if (document.visibilityState === "visible") void refreshCloudIdeas();
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        unsubscribe();
        window.clearInterval(intervalId);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }

    const storedTopic = readJson<IdeaTopic>(ideaTopicStorageKey, defaultIdeaTopic);
    const storedIdeas = readJson<IdeaNote[]>(ideaWallStorageKey, []).map(normalizeIdea);
    setTopic(storedTopic);
    setTopicDraft(storedTopic.title);
    setIdeas(sortIdeas(storedIdeas));
    setIsLoading(false);
    setSyncNotice(text.cloudFallback);
    return undefined;
  }, []);

  function saveLocalIdeas(nextIdeas: IdeaNote[]) {
    setIdeas(nextIdeas);
    if (!isIdeaWallCloudAvailable()) writeJson(ideaWallStorageKey, nextIdeas);
  }

  async function saveTopic(nextTopic: IdeaTopic) {
    setTopic(nextTopic);
    setTopicDraft(nextTopic.title);
    window.dispatchEvent(new Event(ideaTopicUpdatedEvent));
    if (!isIdeaWallCloudAvailable()) {
      writeJson(ideaTopicStorageKey, nextTopic);
      return;
    }
    setIsSyncing(true);
    try {
      await saveIdeaTopicCloud(nextTopic);
      setSyncNotice(text.cloudReady);
    } catch {
      setSyncNotice(text.cloudSavingFailed);
      await refreshCloudIdeas();
    } finally {
      setIsSyncing(false);
    }
  }

  function updateTopicTitle() {
    void saveTopic({ ...topic, title: topicDraft.trim() || topic.title });
    setTopicNotice(text.topicSaved);
    window.setTimeout(() => setTopicNotice(""), 1800);
  }

  function persistIdea(idea: IdeaNote) {
    if (!isIdeaWallCloudAvailable()) {
      writeJson(ideaWallStorageKey, sortIdeas(ideas.map((item) => item.id === idea.id ? idea : item)));
      return;
    }
    setIsSyncing(true);
    void upsertIdeaCloud(idea)
      .then(() => setSyncNotice(text.cloudReady))
      .catch(async () => {
        setSyncNotice(text.cloudSavingFailed);
        await refreshCloudIdeas();
      })
      .finally(() => setIsSyncing(false));
  }

  function saveChangedIdea(ideaId: string, nextIdeas: IdeaNote[]) {
    const sortedIdeas = sortIdeas(nextIdeas);
    saveLocalIdeas(sortedIdeas);
    const changedIdea = sortedIdeas.find((idea) => idea.id === ideaId);
    if (changedIdea) persistIdea(changedIdea);
  }

  function createIdea(position = draftPosition) {
    const nextBody = body.trim();
    if (!nextBody || topic.archived) return;
    const now = todayString();
    const idea: IdeaNote = {
      id: `idea-${Date.now()}`,
      title: title.trim(),
      body: nextBody,
      authorId: currentActorId,
      authorName: currentUserName,
      color,
      x: Math.max(20, position.x),
      y: Math.max(20, position.y),
      rotation: Math.round(Math.random() * 6 - 3),
      visibility,
      targetTeacherIds: visibility === "teachers" && targetTeacherId ? [targetTeacherId] : [],
      supportUserIds: [],
      comments: [],
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now
    };
    saveLocalIdeas(sortIdeas([idea, ...ideas]));
    persistIdea(idea);
    setTitle("");
    setBody("");
    setColor("yellow");
    setSelectedId(idea.id);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, idea: IdeaNote) {
    if (!moveMode && event.pointerType === "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({ id: idea.id, startX: event.clientX, startY: event.clientY, originalX: idea.x, originalY: idea.y });
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const nextIdeas = ideas.map((idea) =>
      idea.id === dragging.id
        ? { ...idea, x: Math.max(0, dragging.originalX + event.clientX - dragging.startX), y: Math.max(0, dragging.originalY + event.clientY - dragging.startY), updatedAt: todayString() }
        : idea
    );
    saveLocalIdeas(nextIdeas);
  }

  function endDrag() {
    if (!dragging) return;
    const changedIdea = ideas.find((idea) => idea.id === dragging.id);
    if (changedIdea) persistIdea(changedIdea);
    setDragging(null);
  }

  function handleBoardDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDraftPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setTitle("");
    setBody("");
  }

  function toggleSupport(ideaId: string) {
    const nextIdeas = ideas.map((idea) => {
      if (idea.id !== ideaId) return idea;
      const supported = idea.supportUserIds.includes(currentActorId);
      return { ...idea, supportUserIds: supported ? idea.supportUserIds.filter((id) => id !== currentActorId) : [...idea.supportUserIds, currentActorId], updatedAt: todayString() };
    });
    saveChangedIdea(ideaId, nextIdeas);
  }

  function addComment(ideaId: string) {
    const nextBody = commentDrafts[ideaId]?.trim();
    if (!nextBody) return;
    const comment: IdeaComment = { id: `idea-comment-${Date.now()}`, authorId: currentActorId, authorName: currentUserName, body: nextBody, createdAt: todayString() };
    const nextIdeas = ideas.map((idea) => idea.id === ideaId ? { ...idea, comments: [...idea.comments, comment], updatedAt: todayString() } : idea);
    saveChangedIdea(ideaId, nextIdeas);
    setCommentDrafts((current) => ({ ...current, [ideaId]: "" }));
  }

  function startEdit(idea: IdeaNote) {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body);
    setEditColor(idea.color);
    setEditVisibility(idea.visibility);
    setEditTargetTeacherId(idea.targetTeacherIds[0] ?? "");
  }

  function saveEdit(ideaId: string) {
    const nextBody = editBody.trim();
    if (!nextBody) return;
    const nextIdeas = ideas.map((idea) =>
      idea.id === ideaId
        ? {
            ...idea,
            title: editTitle.trim(),
            body: nextBody,
            color: editColor,
            visibility: editVisibility,
            targetTeacherIds: editVisibility === "teachers" && editTargetTeacherId ? [editTargetTeacherId] : [],
            updatedAt: todayString()
          }
        : idea
    );
    saveChangedIdea(ideaId, nextIdeas);
    setEditingId("");
  }

  async function deleteIdea(ideaId: string) {
    if (!window.confirm(text.confirmDelete)) return;
    const nextIdeas = ideas.filter((idea) => idea.id !== ideaId);
    saveLocalIdeas(nextIdeas);
    setSelectedId("");
    if (!isIdeaWallCloudAvailable()) {
      writeJson(ideaWallStorageKey, nextIdeas);
      return;
    }
    setIsSyncing(true);
    try {
      await deleteIdeaCloud(ideaId);
      setSyncNotice(text.cloudReady);
    } catch {
      setSyncNotice(text.cloudSavingFailed);
      await refreshCloudIdeas();
    } finally {
      setIsSyncing(false);
    }
  }

  function togglePin(ideaId: string) {
    const nextIdeas = ideas.map((idea) => idea.id === ideaId ? { ...idea, pinned: !idea.pinned, updatedAt: todayString() } : idea);
    saveChangedIdea(ideaId, nextIdeas);
  }

  function isIdeaOwner(idea: IdeaNote) {
    if (idea.authorId) return idea.authorId === currentActorId || idea.authorId === currentUserId;
    return Boolean(idea.authorName && idea.authorName === currentUserName);
  }

  function canManage(idea: IdeaNote) {
    return isAdmin || isIdeaOwner(idea);
  }

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setBody(event.target.value);
  }

  return (
    <div className="space-y-4" id="idea-wall">
      <section className="rounded-lg border border-forest-100 bg-white p-4 shadow-soft">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_auto_auto_auto_auto] xl:items-center">
          <div>
            <p className="text-lg font-black text-forest-700">{text.title}</p>
            <input className="mt-2 w-full rounded-md border border-forest-100 bg-warm px-3 py-3 text-2xl font-black text-ink" value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} placeholder={text.topicPlaceholder} disabled={!isAdmin} />
          </div>
          {isAdmin && <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={updateTopicTitle}>{text.saveTopic}</button>}
          {isAdmin && <button className="rounded-md bg-rice px-4 py-3 text-base font-black text-ink" type="button" onClick={() => void saveTopic({ ...topic, archived: !topic.archived })}>{topic.archived ? text.reopenTopic : text.archiveTopic}</button>}
          <button className={`rounded-md px-4 py-3 text-base font-black ${moveMode ? "bg-blue-100 text-blue-900" : "bg-rice text-ink"}`} type="button" onClick={() => setMoveMode((value) => !value)}>{text.moveMode}</button>
          <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} />
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1.7fr_150px_170px_180px_auto]">
          <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={text.titleInput} />
          <textarea
            className="min-h-20 resize-none overflow-hidden rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold leading-relaxed whitespace-pre-wrap break-words"
            value={body}
            onChange={handleBodyChange}
            onInput={autoResizeTextArea}
            placeholder={text.bodyInput}
            rows={3}
          />
          <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={color} onChange={(event) => setColor(event.target.value as IdeaColor)} aria-label="便利貼顏色">
            {colorOptions.map((item) => <option key={item} value={item}>{colorLabels[item]}</option>)}
          </select>
          <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={visibility} onChange={(event) => setVisibility(event.target.value as IdeaVisibility)} aria-label="可見對象">
            <option value="all">全體教師</option>
            <option value="director">主任</option>
            <option value="teachers">指定教師</option>
          </select>
          <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={targetTeacherId} onChange={(event) => setTargetTeacherId(event.target.value)} disabled={visibility !== "teachers"} aria-label="指定教師">
            <option value="">選擇教師</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
          <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => createIdea()}>{text.addNote}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-base font-black">
          {topicNotice && <span className="rounded-md bg-forest-50 px-3 py-2 text-forest-800">{topicNotice}</span>}
          <span className="rounded-md bg-forest-50 px-3 py-2 text-forest-800">{isSyncing ? text.syncing : syncNotice}</span>
        </div>
      </section>

      <section className="relative min-h-[720px] overflow-auto rounded-lg border border-forest-100 bg-[#fffdf5] shadow-soft">
        <div className="relative min-h-[980px] min-w-[1100px] bg-[radial-gradient(circle,rgba(47,93,80,.16)_1px,transparent_1px)] bg-[size:24px_24px] p-6" onDoubleClick={handleBoardDoubleClick}>
          {isLoading && <p className="pointer-events-none absolute left-8 top-8 rounded-lg bg-white/90 p-5 text-2xl font-black text-forest-800">{text.loading}</p>}
          {!isLoading && !visibleIdeas.length && <p className="pointer-events-none absolute left-8 top-8 rounded-lg bg-white/80 p-5 text-2xl font-black text-forest-800">{text.noIdeas}</p>}
          {visibleIdeas.map((idea) => (
            <button
              key={idea.id}
              className={`absolute w-56 touch-none rounded-sm border p-4 text-left shadow-lg transition hover:z-20 hover:shadow-xl ${colorClasses[idea.color]} ${idea.pinned ? "ring-4 ring-amber-300" : ""}`}
              style={{ left: idea.x, top: idea.y, transform: `rotate(${idea.rotation}deg)` }}
              type="button"
              onClick={() => setSelectedId(idea.id)}
              onPointerDown={(event) => startDrag(event, idea)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
            >
              <p className="text-xs font-black text-stone-600">{idea.authorName} / {idea.createdAt}</p>
              {idea.pinned && <span className="mt-2 inline-block rounded-full bg-white px-2 py-1 text-xs font-black text-forest-800">{text.pinned}</span>}
              {idea.title && <h3 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-ink">{idea.title}</h3>}
              <p className="mt-2 line-clamp-5 whitespace-pre-wrap break-words text-base font-bold leading-relaxed text-ink">{idea.body}</p>
              <div className="mt-3 flex gap-2 text-sm font-black text-forest-800">
                <span>{text.support} {idea.supportUserIds.length}</span>
                <span>{text.comments} {idea.comments.length}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedIdea && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-forest-100 bg-white p-5 shadow-2xl md:max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-forest-700">{selectedIdea.authorName} / {selectedIdea.createdAt}</p>
              <h3 className="mt-1 text-3xl font-black text-ink">{selectedIdea.title || text.untitled}</h3>
            </div>
            <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => setSelectedId("")}>{text.close}</button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className={`rounded-md px-3 py-2 text-base font-black ${selectedIdea.supportUserIds.includes(currentActorId) ? "bg-forest-700 text-white" : "bg-rice text-forest-800"}`} type="button" onClick={() => toggleSupport(selectedIdea.id)}>{selectedIdea.supportUserIds.includes(currentActorId) ? text.supported : text.support} {selectedIdea.supportUserIds.length}</button>
            {isAdmin && <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => togglePin(selectedIdea.id)}>{selectedIdea.pinned ? text.unpin : text.pin}</button>}
            {canManage(selectedIdea) && <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => startEdit(selectedIdea)}>{text.edit}</button>}
            {canManage(selectedIdea) && <button className="rounded-md bg-red-50 px-3 py-2 text-base font-black text-red-700" type="button" onClick={() => void deleteIdea(selectedIdea.id)}>{text.remove}</button>}
          </div>

          {editingId === selectedIdea.id ? (
            <div className="mt-4 grid gap-3">
              <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              <textarea
                className="min-h-40 resize-none overflow-hidden rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold leading-relaxed whitespace-pre-wrap break-words"
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                onInput={autoResizeTextArea}
                rows={5}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={editColor} onChange={(event) => setEditColor(event.target.value as IdeaColor)} aria-label="編輯便利貼顏色">
                  {colorOptions.map((item) => <option key={item} value={item}>{colorLabels[item]}</option>)}
                </select>
                <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={editVisibility} onChange={(event) => setEditVisibility(event.target.value as IdeaVisibility)} aria-label="編輯可見對象">
                  <option value="all">全體教師</option>
                  <option value="director">主任</option>
                  <option value="teachers">指定教師</option>
                </select>
                <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={editTargetTeacherId} onChange={(event) => setEditTargetTeacherId(event.target.value)} disabled={editVisibility !== "teachers"} aria-label="編輯指定教師">
                  <option value="">選擇教師</option>
                  {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
              </div>
              <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => saveEdit(selectedIdea.id)}>{text.save}</button>
            </div>
          ) : (
            <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-rice p-4 text-xl font-bold leading-relaxed text-ink">{selectedIdea.body}</p>
          )}

          <div className="mt-5 space-y-3">
            <p className="text-xl font-black text-ink">{text.comments} {selectedIdea.comments.length}</p>
            {selectedIdea.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-forest-50 p-3">
                <p className="text-sm font-black text-stone-600">{comment.authorName} / {comment.createdAt}</p>
                <p className="whitespace-pre-wrap break-words text-base font-bold text-ink">{comment.body}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={commentDrafts[selectedIdea.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [selectedIdea.id]: event.target.value }))} placeholder={text.commentPlaceholder} />
              <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => addComment(selectedIdea.id)}>{text.sendComment}</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
