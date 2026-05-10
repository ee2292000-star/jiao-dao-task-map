"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthRole } from "@/lib/types";

type IdeaWallProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: AuthRole;
};

type IdeaComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type IdeaNote = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  color: IdeaColor;
  supportUserIds: string[];
  comments: IdeaComment[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type IdeaTopic = {
  title: string;
  archived: boolean;
};

type IdeaColor = "yellow" | "blue" | "green" | "pink" | "orange";

const wallStorageKey = "jiao-dao-task-map:idea-wall:v1";
const topicStorageKey = "jiao-dao-task-map:idea-wall-topic:v1";

const text = {
  kicker: "\u6821\u5167\u5171\u540c\u767c\u60f3\u8207\u4ea4\u6d41\u7a7a\u9593",
  title: "\u60f3\u6cd5\u7246\uff0f\u5171\u5275\u4fbf\u5229\u8cbc",
  topicLabel: "\u672c\u9031\u5171\u5275\u4e3b\u984c",
  topicPlaceholder: "\u4f8b\u5982\uff1a\u7562\u696d\u5178\u79ae\u4e3b\u984c\u52df\u96c6",
  saveTopic: "\u66f4\u65b0\u4e3b\u984c",
  archiveTopic: "\u5c01\u5b58\u4e3b\u984c",
  reopenTopic: "\u91cd\u958b\u4e3b\u984c",
  topicArchived: "\u9019\u500b\u4e3b\u984c\u5df2\u5c01\u5b58\uff0c\u53ef\u4ee5\u700f\u89bd\uff0c\u4e3b\u4efb\u91cd\u958b\u5f8c\u624d\u80fd\u7e7c\u7e8c\u65b0\u589e\u3002",
  newIdea: "\u8cbc\u4e0a\u4e00\u500b\u60f3\u6cd5",
  titleInput: "\u6a19\u984c\uff08\u53ef\u9078\uff09",
  bodyInput: "\u628a\u9ede\u5b50\u5beb\u4e0b\u4f86\uff0c\u53ef\u4ee5\u662f\u4e00\u53e5\u8a71\u6216\u4e00\u500b\u65b9\u5411",
  post: "\u5f35\u8cbc\u60f3\u6cd5",
  noIdeas: "\u76ee\u524d\u9084\u6c92\u6709\u60f3\u6cd5\uff0c\u5148\u8cbc\u4e00\u5f35\u5427\u3002",
  support: "\u652f\u6301",
  supported: "\u5df2\u652f\u6301",
  comments: "\u7559\u8a00",
  commentPlaceholder: "\u88dc\u5145\u4e00\u500b\u60f3\u6cd5\u6216\u56de\u61c9",
  sendComment: "\u7559\u8a00",
  edit: "\u7de8\u8f2f",
  save: "\u5132\u5b58",
  cancel: "\u53d6\u6d88",
  remove: "\u522a\u9664",
  pin: "\u7f6e\u9802",
  unpin: "\u53d6\u6d88\u7f6e\u9802",
  pinned: "\u7f6e\u9802",
  confirmDelete: "\u78ba\u5b9a\u8981\u522a\u9664\u9019\u5f35\u60f3\u6cd5\u4fbf\u5229\u8cbc\u55ce\uff1f",
  archive: "\u5df2\u5c01\u5b58"
};

const colorClasses: Record<IdeaColor, string> = {
  yellow: "border-yellow-200 bg-yellow-100 rotate-[-1deg]",
  blue: "border-blue-200 bg-blue-100 rotate-[1deg]",
  green: "border-green-200 bg-green-100 rotate-[-.5deg]",
  pink: "border-pink-200 bg-pink-100 rotate-[.75deg]",
  orange: "border-orange-200 bg-orange-100 rotate-[-.75deg]"
};

const colorOptions: IdeaColor[] = ["yellow", "blue", "green", "pink", "orange"];

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

export function IdeaWall({ currentUserId, currentUserName, currentUserRole }: IdeaWallProps) {
  const [ideas, setIdeas] = useState<IdeaNote[]>([]);
  const [topic, setTopic] = useState<IdeaTopic>({
    title: "\u7562\u696d\u5178\u79ae\u4e3b\u984c\u52df\u96c6",
    archived: false
  });
  const [topicDraft, setTopicDraft] = useState(topic.title);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState<IdeaColor>("yellow");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const isAdmin = currentUserRole === "admin";
  const visibleIdeas = useMemo(
    () =>
      ideas
        .filter((idea) => !idea.archived)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)),
    [ideas]
  );

  useEffect(() => {
    const storedTopic = readJson<IdeaTopic>(topicStorageKey, {
      title: "\u7562\u696d\u5178\u79ae\u4e3b\u984c\u52df\u96c6",
      archived: false
    });
    setTopic(storedTopic);
    setTopicDraft(storedTopic.title);
    setIdeas(readJson<IdeaNote[]>(wallStorageKey, []));
  }, []);

  function saveIdeas(nextIdeas: IdeaNote[]) {
    setIdeas(nextIdeas);
    window.localStorage.setItem(wallStorageKey, JSON.stringify(nextIdeas));
  }

  function saveTopic(nextTopic: IdeaTopic) {
    setTopic(nextTopic);
    setTopicDraft(nextTopic.title);
    window.localStorage.setItem(topicStorageKey, JSON.stringify(nextTopic));
  }

  function createIdea() {
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
      supportUserIds: [],
      comments: [],
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now
    };
    saveIdeas([idea, ...ideas]);
    setTitle("");
    setBody("");
    setColor("yellow");
  }

  function toggleSupport(ideaId: string) {
    saveIdeas(
      ideas.map((idea) => {
        if (idea.id !== ideaId) return idea;
        const supported = idea.supportUserIds.includes(currentUserId);
        return {
          ...idea,
          supportUserIds: supported
            ? idea.supportUserIds.filter((id) => id !== currentUserId)
            : [...idea.supportUserIds, currentUserId],
          updatedAt: todayString()
        };
      })
    );
  }

  function addComment(ideaId: string) {
    const body = commentDrafts[ideaId]?.trim();
    if (!body) return;
    const comment: IdeaComment = {
      id: `idea-comment-${Date.now()}`,
      authorId: currentUserId,
      authorName: currentUserName,
      body,
      createdAt: todayString()
    };
    saveIdeas(
      ideas.map((idea) =>
        idea.id === ideaId ? { ...idea, comments: [...idea.comments, comment], updatedAt: todayString() } : idea
      )
    );
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
    saveIdeas(
      ideas.map((idea) =>
        idea.id === ideaId
          ? { ...idea, title: editTitle.trim(), body: nextBody, updatedAt: todayString() }
          : idea
      )
    );
    setEditingId("");
  }

  function deleteIdea(ideaId: string) {
    if (!window.confirm(text.confirmDelete)) return;
    saveIdeas(ideas.filter((idea) => idea.id !== ideaId));
  }

  function togglePin(ideaId: string) {
    saveIdeas(
      ideas.map((idea) =>
        idea.id === ideaId ? { ...idea, pinned: !idea.pinned, updatedAt: todayString() } : idea
      )
    );
  }

  function canManageOwn(idea: IdeaNote) {
    return idea.authorId === currentUserId;
  }

  return (
    <div className="space-y-6" id="idea-wall">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-xl font-bold text-forest-700">{text.kicker}</p>
        <div className="mt-2 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-5xl font-black leading-tight text-ink">{text.title}</h2>
            <p className="mt-3 rounded-lg bg-rice px-4 py-3 text-2xl font-black text-forest-800">
              {text.topicLabel}: {topic.title}
            </p>
          </div>
          {isAdmin && (
            <div className="grid gap-2 xl:min-w-[420px]">
              <input
                className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
                value={topicDraft}
                onChange={(event) => setTopicDraft(event.target.value)}
                placeholder={text.topicPlaceholder}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white"
                  type="button"
                  onClick={() => saveTopic({ ...topic, title: topicDraft.trim() || topic.title })}
                >
                  {text.saveTopic}
                </button>
                <button
                  className="rounded-md bg-rice px-4 py-3 text-base font-black text-ink"
                  type="button"
                  onClick={() => saveTopic({ ...topic, archived: !topic.archived })}
                >
                  {topic.archived ? text.reopenTopic : text.archiveTopic}
                </button>
              </div>
            </div>
          )}
        </div>
        {topic.archived && <p className="mt-4 rounded-lg bg-stone-100 p-4 text-lg font-black text-stone-700">{text.topicArchived}</p>}
      </section>

      {!topic.archived && (
        <section className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
          <h3 className="text-3xl font-black text-ink">{text.newIdea}</h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]">
            <input
              className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={text.titleInput}
            />
            <textarea
              className="min-h-24 rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={text.bodyInput}
            />
            <div className="grid gap-2">
              <select
                className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
                value={color}
                onChange={(event) => setColor(event.target.value as IdeaColor)}
                aria-label="便利貼顏色"
              >
                {colorOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={createIdea}>
                {text.post}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg bg-[linear-gradient(90deg,rgba(47,93,80,.08)_1px,transparent_1px),linear-gradient(rgba(47,93,80,.08)_1px,transparent_1px)] bg-[size:28px_28px] p-5 shadow-soft">
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleIdeas.length ? (
            visibleIdeas.map((idea) => {
              const isEditing = editingId === idea.id;
              const supported = idea.supportUserIds.includes(currentUserId);
              return (
                <article key={idea.id} className={`rounded-sm border p-4 shadow-soft ${colorClasses[idea.color]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {idea.pinned && <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-forest-800">{text.pinned}</span>}
                      <p className="mt-2 text-sm font-black text-stone-600">{idea.authorName} / {idea.createdAt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isAdmin && (
                        <button className="rounded-md bg-white px-2 py-1 text-sm font-black" type="button" onClick={() => togglePin(idea.id)}>
                          {idea.pinned ? text.unpin : text.pin}
                        </button>
                      )}
                      {canManageOwn(idea) && (
                        <button className="rounded-md bg-white px-2 py-1 text-sm font-black" type="button" onClick={() => startEdit(idea)}>
                          {text.edit}
                        </button>
                      )}
                      {canManageOwn(idea) && (
                        <button className="rounded-md bg-red-50 px-2 py-1 text-sm font-black text-red-700" type="button" onClick={() => deleteIdea(idea.id)}>
                          {text.remove}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid gap-2">
                      <input className="rounded-md border border-white bg-white px-3 py-2 text-base font-bold" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                      <textarea className="min-h-28 rounded-md border border-white bg-white px-3 py-2 text-base font-bold" value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                      <div className="flex gap-2">
                        <button className="rounded-md bg-forest-700 px-3 py-2 text-sm font-black text-white" type="button" onClick={() => saveEdit(idea.id)}>{text.save}</button>
                        <button className="rounded-md bg-white px-3 py-2 text-sm font-black" type="button" onClick={() => setEditingId("")}>{text.cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {idea.title && <h3 className="mt-3 text-2xl font-black leading-snug text-ink">{idea.title}</h3>}
                      <p className="mt-3 whitespace-pre-line text-lg font-bold leading-relaxed text-ink">{idea.body}</p>
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button className={`rounded-full px-3 py-2 text-sm font-black ${supported ? "bg-forest-700 text-white" : "bg-white text-forest-800"}`} type="button" onClick={() => toggleSupport(idea.id)}>
                      {supported ? text.supported : text.support} {idea.supportUserIds.length}
                    </button>
                    <span className="rounded-full bg-white px-3 py-2 text-sm font-black text-stone-700">
                      {text.comments} {idea.comments.length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {idea.comments.map((comment) => (
                      <div key={comment.id} className="rounded-md bg-white/80 px-3 py-2">
                        <p className="text-sm font-black text-stone-600">{comment.authorName} / {comment.createdAt}</p>
                        <p className="text-base font-bold text-ink">{comment.body}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-md border border-white bg-white px-3 py-2 text-sm font-bold"
                        value={commentDrafts[idea.id] ?? ""}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [idea.id]: event.target.value }))}
                        placeholder={text.commentPlaceholder}
                      />
                      <button className="rounded-md bg-white px-3 py-2 text-sm font-black text-forest-800" type="button" onClick={() => addComment(idea.id)}>
                        {text.sendComment}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-lg bg-white p-5 text-xl font-black text-forest-800 md:col-span-2 xl:col-span-3">{text.noIdeas}</p>
          )}
        </div>
      </section>
    </div>
  );
}
