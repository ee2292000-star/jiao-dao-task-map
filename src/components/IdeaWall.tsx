"use client";

import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import {
  defaultIdeaTopic,
  deleteIdeaCloud,
  ideaTopicStorageKey,
  ideaTopicUpdatedEvent,
  ideaWallStorageKey,
  isIdeaWallCloudAvailable,
  loadIdeaWallCloudData,
  saveIdeaTopicCloud,
  syncIdeasCloud,
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
  cloudReady: "\u5df2\u9023\u7dda\u96f2\u7aef\uff0c\u60f3\u6cd5\u7246\u6703\u8de8\u96fb\u8166\u540c\u6b65\u3002",
  cloudFallback: "\u60f3\u6cd5\u7246\u96f2\u7aef\u540c\u6b65\u5c1a\u672a\u555f\u7528\uff0c\u76ee\u524d\u50c5\u4fdd\u7559\u5728\u9019\u53f0\u96fb\u8166\u3002",
  cloudSavingFailed: "\u96f2\u7aef\u66ab\u6642\u7121\u6cd5\u5132\u5b58\uff0c\u5df2\u5148\u4fdd\u7559\u5728\u672c\u6a5f\u3002",
  addNote: "\u65b0\u589e\u4fbf\u5229\u8cbc",
  titleInput: "\u6a19\u984c\uff08\u53ef\u9078\uff09",
  bodyInput: "\u60f3\u6cd5\u5167\u5bb9",
  search: "\u641c\u5c0b\u60f3\u6cd5",
  post: "\u8cbc\u5230\u767d\u677f",
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
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeIdea(idea: IdeaNote, index: number): IdeaNote {
  return {
    ...idea,
    x: Number.isFinite(idea.x) ? idea.x : 70 + (index % 4) * 250,
    y: Number.isFinite(idea.y) ? idea.y : 80 + Math.floor(index / 4) * 210,
    rotation: Number.isFinite(idea.rotation) ? idea.rotation : [-3, 2, -1, 3][index % 4],
    color: (idea.color as string) === "orange" ? "purple" : idea.color,
    visibility: idea.visibility ?? "all",
    targetTeacherIds: idea.targetTeacherIds ?? []
  };
}

function mergeIdeas(localIdeas: IdeaNote[], cloudIdeas: IdeaNote[]) {
  const byId = new Map<string, IdeaNote>();
  [...cloudIdeas, ...localIdeas].forEach((idea, index) => {
    const normalized = normalizeIdea(idea, index);
    const existing = byId.get(normalized.id);
    if (!existing || normalized.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      byId.set(normalized.id, normalized);
    }
  });
  return Array.from(byId.values()).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)
  );
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
  const [topicNotice, setTopicNotice] = useState("");
  const [syncNotice, setSyncNotice] = useState(isIdeaWallCloudAvailable() ? text.cloudReady : text.cloudFallback);
  const [moveMode, setMoveMode] = useState(false);
  const [draftPosition, setDraftPosition] = useState({ x: 90, y: 90 });
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; originalX: number; originalY: number } | null>(null);

  const isAdmin = currentUserRole === "admin";
  const selectedIdea = ideas.find((idea) => idea.id === selectedId);

  const visibleIdeas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ideas
      .filter((idea) => !idea.archived)
      .filter((idea) => isAdmin || idea.authorId === currentUserId || idea.visibility === "all" || idea.targetTeacherIds.includes(currentUserId))
      .filter((idea) => !term || `${idea.title} ${idea.body} ${idea.authorName}`.toLowerCase().includes(term))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [currentUserId, ideas, isAdmin, search]);

  useEffect(() => {
    let isActive = true;
    const storedTopic = readJson<IdeaTopic>(ideaTopicStorageKey, defaultIdeaTopic);
    const storedIdeas = readJson<IdeaNote[]>(ideaWallStorageKey, []).map(normalizeIdea);
    setTopic(storedTopic);
    setTopicDraft(storedTopic.title);
    setIdeas(storedIdeas);

    async function loadCloudIdeas() {
      if (!isIdeaWallCloudAvailable()) return;
      try {
        const cloudData = await loadIdeaWallCloudData();
        if (!isActive || !cloudData) return;
        const mergedIdeas = mergeIdeas(storedIdeas, cloudData.ideas);
        const nextTopic = cloudData.topic.title ? cloudData.topic : storedTopic;
        setTopic(nextTopic);
        setTopicDraft(nextTopic.title);
        setIdeas(mergedIdeas);
        writeJson(ideaTopicStorageKey, nextTopic);
        writeJson(ideaWallStorageKey, mergedIdeas);
        await Promise.all([saveIdeaTopicCloud(nextTopic), syncIdeasCloud(mergedIdeas)]);
        setSyncNotice(text.cloudReady);
      } catch {
        setSyncNotice(text.cloudFallback);
      }
    }

    void loadCloudIdeas();
    return () => {
      isActive = false;
    };
  }, []);

  function saveIdeas(nextIdeas: IdeaNote[]) {
    setIdeas(nextIdeas);
    writeJson(ideaWallStorageKey, nextIdeas);
  }

  function saveTopic(nextTopic: IdeaTopic) {
    setTopic(nextTopic);
    setTopicDraft(nextTopic.title);
    writeJson(ideaTopicStorageKey, nextTopic);
    window.dispatchEvent(new Event(ideaTopicUpdatedEvent));
    void saveIdeaTopicCloud(nextTopic).catch(() => setSyncNotice(text.cloudSavingFailed));
  }

  function updateTopicTitle() {
    saveTopic({ ...topic, title: topicDraft.trim() || topic.title });
    setTopicNotice(text.topicSaved);
    window.setTimeout(() => setTopicNotice(""), 1800);
  }

  function saveChangedIdea(ideaId: string, nextIdeas: IdeaNote[]) {
    saveIdeas(nextIdeas);
    const changedIdea = nextIdeas.find((idea) => idea.id === ideaId);
    if (changedIdea) void upsertIdeaCloud(changedIdea).catch(() => setSyncNotice(text.cloudSavingFailed));
  }

  function createIdea(position = draftPosition) {
    const nextBody = body.trim();
    if (!nextBody || topic.archived) return;
    const now = todayString();
    const idea: IdeaNote = {
      id: `idea-${Date.now()}`,
      title: title.trim(),
      body: nextBody,
      authorId: currentUserId,
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
    saveIdeas([idea, ...ideas]);
    void upsertIdeaCloud(idea).catch(() => setSyncNotice(text.cloudSavingFailed));
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
    saveIdeas(nextIdeas);
  }

  function endDrag() {
    if (!dragging) return;
    const changedIdea = ideas.find((idea) => idea.id === dragging.id);
    if (changedIdea) void upsertIdeaCloud(changedIdea).catch(() => setSyncNotice(text.cloudSavingFailed));
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
      const supported = idea.supportUserIds.includes(currentUserId);
      return { ...idea, supportUserIds: supported ? idea.supportUserIds.filter((id) => id !== currentUserId) : [...idea.supportUserIds, currentUserId], updatedAt: todayString() };
    });
    saveChangedIdea(ideaId, nextIdeas);
  }

  function addComment(ideaId: string) {
    const nextBody = commentDrafts[ideaId]?.trim();
    if (!nextBody) return;
    const comment: IdeaComment = { id: `idea-comment-${Date.now()}`, authorId: currentUserId, authorName: currentUserName, body: nextBody, createdAt: todayString() };
    const nextIdeas = ideas.map((idea) => idea.id === ideaId ? { ...idea, comments: [...idea.comments, comment], updatedAt: todayString() } : idea);
    saveChangedIdea(ideaId, nextIdeas);
    setCommentDrafts((current) => ({ ...current, [ideaId]: "" }));
  }

  function startEdit(idea: IdeaNote) {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body);
  }

  function saveEdit(ideaId: string) {
    const nextBody = editBody.trim();
    if (!nextBody) return;
    const nextIdeas = ideas.map((idea) => idea.id === ideaId ? { ...idea, title: editTitle.trim(), body: nextBody, updatedAt: todayString() } : idea);
    saveChangedIdea(ideaId, nextIdeas);
    setEditingId("");
  }

  function deleteIdea(ideaId: string) {
    if (!window.confirm(text.confirmDelete)) return;
    saveIdeas(ideas.filter((idea) => idea.id !== ideaId));
    setSelectedId("");
    void deleteIdeaCloud(ideaId).catch(() => setSyncNotice(text.cloudSavingFailed));
  }

  function togglePin(ideaId: string) {
    const nextIdeas = ideas.map((idea) => idea.id === ideaId ? { ...idea, pinned: !idea.pinned, updatedAt: todayString() } : idea);
    saveChangedIdea(ideaId, nextIdeas);
  }

  function canManage(idea: IdeaNote) {
    return isAdmin || idea.authorId === currentUserId;
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
          {isAdmin && <button className="rounded-md bg-rice px-4 py-3 text-base font-black text-ink" type="button" onClick={() => saveTopic({ ...topic, archived: !topic.archived })}>{topic.archived ? text.reopenTopic : text.archiveTopic}</button>}
          <button className={`rounded-md px-4 py-3 text-base font-black ${moveMode ? "bg-blue-100 text-blue-900" : "bg-rice text-ink"}`} type="button" onClick={() => setMoveMode((value) => !value)}>{text.moveMode}</button>
          <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} />
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1.7fr_150px_170px_180px_auto]">
          <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={text.titleInput} />
          <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={body} onChange={(event) => setBody(event.target.value)} placeholder={text.bodyInput} />
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
          <span className="rounded-md bg-forest-50 px-3 py-2 text-forest-800">{syncNotice}</span>
        </div>
      </section>

      <section className="relative min-h-[720px] overflow-auto rounded-lg border border-forest-100 bg-[#fffdf5] shadow-soft">
        <div className="relative min-h-[980px] min-w-[1100px] bg-[radial-gradient(circle,rgba(47,93,80,.16)_1px,transparent_1px)] bg-[size:24px_24px] p-6" onDoubleClick={handleBoardDoubleClick}>
          {!visibleIdeas.length && <p className="pointer-events-none absolute left-8 top-8 rounded-lg bg-white/80 p-5 text-2xl font-black text-forest-800">{text.noIdeas}</p>}
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
              <p className="mt-2 line-clamp-5 whitespace-pre-line text-base font-bold leading-relaxed text-ink">{idea.body}</p>
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
              <h3 className="mt-1 text-3xl font-black text-ink">{selectedIdea.title || "未命名想法"}</h3>
            </div>
            <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => setSelectedId("")}>{text.close}</button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className={`rounded-md px-3 py-2 text-base font-black ${selectedIdea.supportUserIds.includes(currentUserId) ? "bg-forest-700 text-white" : "bg-rice text-forest-800"}`} type="button" onClick={() => toggleSupport(selectedIdea.id)}>{selectedIdea.supportUserIds.includes(currentUserId) ? text.supported : text.support} {selectedIdea.supportUserIds.length}</button>
            {isAdmin && <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => togglePin(selectedIdea.id)}>{selectedIdea.pinned ? text.unpin : text.pin}</button>}
            {canManage(selectedIdea) && <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => startEdit(selectedIdea)}>{text.edit}</button>}
            {canManage(selectedIdea) && <button className="rounded-md bg-red-50 px-3 py-2 text-base font-black text-red-700" type="button" onClick={() => deleteIdea(selectedIdea.id)}>{text.remove}</button>}
            {isAdmin && <button className="rounded-md bg-amber-100 px-3 py-2 text-base font-black text-amber-900" type="button">轉成任務</button>}
          </div>

          {editingId === selectedIdea.id ? (
            <div className="mt-4 grid gap-3">
              <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              <textarea className="min-h-40 rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={editBody} onChange={(event) => setEditBody(event.target.value)} />
              <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => saveEdit(selectedIdea.id)}>{text.save}</button>
            </div>
          ) : (
            <p className="mt-4 whitespace-pre-line rounded-lg bg-rice p-4 text-xl font-bold leading-relaxed text-ink">{selectedIdea.body}</p>
          )}

          <div className="mt-5 space-y-3">
            <p className="text-xl font-black text-ink">{text.comments} {selectedIdea.comments.length}</p>
            {selectedIdea.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-forest-50 p-3">
                <p className="text-sm font-black text-stone-600">{comment.authorName} / {comment.createdAt}</p>
                <p className="text-base font-bold text-ink">{comment.body}</p>
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
