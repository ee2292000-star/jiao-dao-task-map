"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  applyNodeChanges,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance
} from "@xyflow/react";
import { StickyNoteCard } from "@/components/StickyNoteCard";
import "@xyflow/react/dist/style.css";
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

type IdeaNodeData = {
  idea: IdeaNote;
  canManage: boolean;
  onEdit: (ideaId: string) => void;
  onSelect: (ideaId: string) => void;
} & Record<string, unknown>;

type IdeaFlowNode = Node<IdeaNodeData, "ideaSticky">;

const text = {
  title: "校內共創牆",
  topicPlaceholder: "共創主題，例如：畢業典禮主題募集",
  saveTopic: "更新主題",
  topicSaved: "主題已更新",
  archiveTopic: "封存主題",
  reopenTopic: "重新開啟",
  loading: "正在載入共創便利貼...",
  syncing: "同步中...",
  cloudReady: "已連線 Supabase，便利貼會同步到其他裝置。",
  cloudFallback: "雲端同步暫時未啟用，將使用本機資料。",
  cloudSavingFailed: "雲端同步失敗，已重新載入最新資料。",
  addNote: "新增便利貼",
  titleInput: "便利貼標題（可選）",
  bodyInput: "想法內容，按 Enter 可換行",
  search: "搜尋便利貼",
  noIdeas: "目前還沒有便利貼。雙擊白板空白處，或在上方輸入內容新增。",
  support: "支持",
  supported: "已支持",
  comments: "留言",
  commentPlaceholder: "補充一句想法...",
  sendComment: "留言",
  edit: "編輯",
  save: "儲存",
  close: "關閉",
  remove: "刪除",
  pin: "置頂",
  unpin: "取消置頂",
  pinned: "置頂",
  cancel: "取消",
  untitled: "未命名想法",
  confirmDelete: "確定要刪除此便利貼嗎？此動作無法復原。",
  visibilityAll: "全體教師",
  visibilityDirector: "主任",
  visibilityTeachers: "指定教師",
  chooseTeacher: "選擇教師"
};


const colorOptions: IdeaColor[] = ["yellow", "pink", "blue", "green", "purple"];
const colorLabels: Record<IdeaColor, string> = {
  yellow: "黃色提醒",
  pink: "粉色討論",
  blue: "藍色想法",
  green: "綠色整理",
  purple: "紫色靈感"
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
    x: Number.isFinite(idea.x) ? idea.x : 70 + (index % 4) * 260,
    y: Number.isFinite(idea.y) ? idea.y : 80 + Math.floor(index / 4) * 220,
    rotation: Number.isFinite(idea.rotation) ? idea.rotation : [-2, 1, -1, 2][index % 4],
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

function IdeaStickyNode({ data }: NodeProps<IdeaFlowNode>) {
  const { idea, canManage, onEdit, onSelect } = data;

  return (
    <div
      className="nodrag nowheel w-64 cursor-grab text-left active:cursor-grabbing"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(idea.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(idea.id);
      }}
    >
      <StickyNoteCard
        body={idea.body}
        category={idea.pinned ? text.pinned : colorLabels[idea.color]}
        className={idea.pinned ? "ring-4 ring-amber-300" : ""}
        footer={
          <div className="flex flex-wrap gap-2">
            <span>{idea.authorName} / {idea.createdAt}</span>
            <span>{text.support} {idea.supportUserIds.length}</span>
            <span>{text.comments} {idea.comments.length}</span>
          </div>
        }
        onEdit={canManage ? () => onEdit(idea.id) : undefined}
        rotation={idea.rotation}
        title={idea.title || text.untitled}
        tone={idea.color}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  ideaSticky: IdeaStickyNode
};

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
  const [draftPosition, setDraftPosition] = useState({ x: 90, y: 90 });
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<IdeaFlowNode> | null>(null);
  const [flowNodes, setFlowNodes] = useState<IdeaFlowNode[]>([]);

  const isAdmin = currentUserRole === "admin";
  const currentActorId = currentUserId || `name:${currentUserName}`;
  const selectedIdea = ideas.find((idea) => idea.id === selectedId);

  function isIdeaOwner(idea: IdeaNote) {
    if (idea.authorId) return idea.authorId === currentActorId || idea.authorId === currentUserId;
    return Boolean(idea.authorName && idea.authorName === currentUserName);
  }

  function canManage(idea: IdeaNote) {
    return isAdmin || isIdeaOwner(idea);
  }

  function openIdeaDetails(ideaId: string) {
    setSelectedId(ideaId);
    setEditingId("");
  }

  function openIdeaEditor(ideaId: string) {
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea || !canManage(idea)) return;
    setSelectedId(idea.id);
    startEdit(idea);
  }

  const visibleIdeas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortIdeas(
      ideas
        .filter((idea) => !idea.archived)
        .filter(
          (idea) =>
            isAdmin ||
            isIdeaOwner(idea) ||
            idea.visibility === "all" ||
            idea.targetTeacherIds.includes(currentActorId) ||
            idea.targetTeacherIds.includes(currentUserId)
        )
        .filter((idea) => !term || `${idea.title} ${idea.body} ${idea.authorName}`.toLowerCase().includes(term))
    );
  }, [currentActorId, currentUserId, currentUserName, ideas, isAdmin, search]);

  const visibleFlowNodes = useMemo<IdeaFlowNode[]>(
    () =>
      visibleIdeas.map((idea) => ({
        id: idea.id,
        type: "ideaSticky",
        position: { x: idea.x, y: idea.y },
        data: {
          idea,
          canManage: canManage(idea),
          onEdit: openIdeaEditor,
          onSelect: openIdeaDetails
        },
        draggable: true
      })),
    [visibleIdeas]
  );

  useEffect(() => {
    setFlowNodes(visibleFlowNodes);
  }, [visibleFlowNodes]);

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
      writeJson(
        ideaWallStorageKey,
        sortIdeas(ideas.map((item) => (item.id === idea.id ? idea : item)))
      );
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
      rotation: Math.round(Math.random() * 4 - 2),
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

  function handleNodesChange(changes: NodeChange<IdeaFlowNode>[]) {
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as IdeaFlowNode[]);
  }

  function handleNodeDragStop(_event: ReactMouseEvent, node: IdeaFlowNode) {
    const nextIdeas = ideas.map((idea) =>
      idea.id === node.id
        ? { ...idea, x: Math.round(node.position.x), y: Math.round(node.position.y), updatedAt: todayString() }
        : idea
    );
    saveLocalIdeas(nextIdeas);
    const changedIdea = nextIdeas.find((idea) => idea.id === node.id);
    if (changedIdea) persistIdea(changedIdea);
  }

  function handlePaneClick(event: ReactMouseEvent) {
    if (event.detail !== 2) return;
    const position = flowInstance?.screenToFlowPosition({ x: event.clientX, y: event.clientY }) ?? { x: 90, y: 90 };
    setDraftPosition(position);
    setTitle("");
    setBody("");
  }

  function toggleSupport(ideaId: string) {
    const nextIdeas = ideas.map((idea) => {
      if (idea.id !== ideaId) return idea;
      const supported = idea.supportUserIds.includes(currentActorId);
      return {
        ...idea,
        supportUserIds: supported
          ? idea.supportUserIds.filter((id) => id !== currentActorId)
          : [...idea.supportUserIds, currentActorId],
        updatedAt: todayString()
      };
    });
    saveChangedIdea(ideaId, nextIdeas);
  }

  function addComment(ideaId: string) {
    const nextBody = commentDrafts[ideaId]?.trim();
    if (!nextBody) return;
    const comment: IdeaComment = {
      id: `idea-comment-${Date.now()}`,
      authorId: currentActorId,
      authorName: currentUserName,
      body: nextBody,
      createdAt: todayString()
    };
    const nextIdeas = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, comments: [...idea.comments, comment], updatedAt: todayString() } : idea
    );
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
    setEditingId("");
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
    const nextIdeas = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, pinned: !idea.pinned, updatedAt: todayString() } : idea
    );
    saveChangedIdea(ideaId, nextIdeas);
  }

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setBody(event.target.value);
  }

  return (
    <div className="space-y-4" id="idea-wall">
      <section className="rounded-lg border border-forest-100 bg-white p-4 shadow-soft">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_auto_auto_260px] xl:items-center">
          <div>
            <p className="text-lg font-black text-forest-700">{text.title}</p>
            <input
              className="mt-2 w-full rounded-md border border-forest-100 bg-warm px-3 py-3 text-2xl font-black text-ink"
              value={topicDraft}
              onChange={(event) => setTopicDraft(event.target.value)}
              placeholder={text.topicPlaceholder}
              disabled={!isAdmin}
            />
          </div>
          {isAdmin && (
            <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={updateTopicTitle}>
              {text.saveTopic}
            </button>
          )}
          {isAdmin && (
            <button
              className="rounded-md bg-rice px-4 py-3 text-base font-black text-ink"
              type="button"
              onClick={() => void saveTopic({ ...topic, archived: !topic.archived })}
            >
              {topic.archived ? text.reopenTopic : text.archiveTopic}
            </button>
          )}
          <input
            className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.search}
          />
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1.7fr_150px_170px_180px_auto]">
          <input
            className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={text.titleInput}
          />
          <textarea
            className="min-h-20 resize-none overflow-hidden rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold leading-relaxed whitespace-pre-wrap break-words"
            value={body}
            onChange={handleBodyChange}
            onInput={autoResizeTextArea}
            placeholder={text.bodyInput}
            rows={3}
          />
          <select
            className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
            value={color}
            onChange={(event) => setColor(event.target.value as IdeaColor)}
            aria-label="便利貼顏色"
          >
            {colorOptions.map((item) => (
              <option key={item} value={item}>
                {colorLabels[item]}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as IdeaVisibility)}
            aria-label="可見對象"
          >
            <option value="all">{text.visibilityAll}</option>
            <option value="director">{text.visibilityDirector}</option>
            <option value="teachers">{text.visibilityTeachers}</option>
          </select>
          <select
            className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
            value={targetTeacherId}
            onChange={(event) => setTargetTeacherId(event.target.value)}
            disabled={visibility !== "teachers"}
            aria-label="指定教師"
          >
            <option value="">{text.chooseTeacher}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white" type="button" onClick={() => createIdea()}>
            {text.addNote}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-base font-black">
          {topicNotice && <span className="rounded-md bg-forest-50 px-3 py-2 text-forest-800">{topicNotice}</span>}
          <span className="rounded-md bg-forest-50 px-3 py-2 text-forest-800">{isSyncing ? text.syncing : syncNotice}</span>
        </div>
      </section>

      <section className="relative h-[78vh] min-h-[640px] overflow-hidden rounded-lg border border-forest-100 bg-[#fffdf5] shadow-soft">
        {isLoading && (
          <p className="absolute left-8 top-8 z-10 rounded-lg bg-white/90 p-5 text-2xl font-black text-forest-800 shadow-soft">{text.loading}</p>
        )}
        {!isLoading && !visibleIdeas.length && (
          <p className="absolute left-8 top-8 z-10 max-w-xl rounded-lg bg-white/80 p-5 text-2xl font-black text-forest-800 shadow-soft">
            {text.noIdeas}
          </p>
        )}
        <ReactFlow<IdeaFlowNode>
          nodes={flowNodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onInit={setFlowInstance}
          onNodesChange={handleNodesChange}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={handlePaneClick}
          fitView
          minZoom={0.25}
          maxZoom={2}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          className="bg-[#fffdf5]"
        >
          <Background color="rgba(47,93,80,.22)" gap={24} size={1.2} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </section>

      {selectedIdea && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-forest-100 bg-white p-5 shadow-2xl md:max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-forest-700">
                {selectedIdea.authorName} / {selectedIdea.createdAt}
              </p>
              <h3 className="mt-1 text-3xl font-black text-ink">{selectedIdea.title || text.untitled}</h3>
            </div>
            <button
              className="rounded-md bg-rice px-3 py-2 text-base font-black"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId("");
                setEditingId("");
              }}
            >
              {text.close}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`rounded-md px-3 py-2 text-base font-black ${selectedIdea.supportUserIds.includes(currentActorId) ? "bg-forest-700 text-white" : "bg-rice text-forest-800"}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleSupport(selectedIdea.id);
              }}
            >
              {selectedIdea.supportUserIds.includes(currentActorId) ? text.supported : text.support} {selectedIdea.supportUserIds.length}
            </button>
            {isAdmin && (
              <button
                className="rounded-md bg-rice px-3 py-2 text-base font-black"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  togglePin(selectedIdea.id);
                }}
              >
                {selectedIdea.pinned ? text.unpin : text.pin}
              </button>
            )}
            {canManage(selectedIdea) && (
              <button
                className="rounded-md bg-rice px-3 py-2 text-base font-black"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  startEdit(selectedIdea);
                }}
              >
                {text.edit}
              </button>
            )}
            {canManage(selectedIdea) && (
              <button
                className="rounded-md bg-red-50 px-3 py-2 text-base font-black text-red-700"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteIdea(selectedIdea.id);
                }}
              >
                {text.remove}
              </button>
            )}
          </div>

          {editingId === selectedIdea.id ? (
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
              <textarea
                className="min-h-40 resize-none overflow-hidden rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold leading-relaxed whitespace-pre-wrap break-words"
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                onInput={autoResizeTextArea}
                rows={5}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
                  value={editColor}
                  onChange={(event) => setEditColor(event.target.value as IdeaColor)}
                  aria-label="編輯便利貼顏色"
                >
                  {colorOptions.map((item) => (
                    <option key={item} value={item}>
                      {colorLabels[item]}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
                  value={editVisibility}
                  onChange={(event) => setEditVisibility(event.target.value as IdeaVisibility)}
                  aria-label="編輯可見對象"
                >
                  <option value="all">{text.visibilityAll}</option>
                  <option value="director">{text.visibilityDirector}</option>
                  <option value="teachers">{text.visibilityTeachers}</option>
                </select>
                <select
                  className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black"
                  value={editTargetTeacherId}
                  onChange={(event) => setEditTargetTeacherId(event.target.value)}
                  disabled={editVisibility !== "teachers"}
                  aria-label="編輯指定教師"
                >
                  <option value="">{text.chooseTeacher}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    saveEdit(selectedIdea.id);
                  }}
                >
                  {text.save}
                </button>
                <button
                  className="rounded-md bg-rice px-4 py-3 text-base font-black text-ink"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingId("");
                  }}
                >
                  {text.cancel}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-rice p-4 text-xl font-bold leading-relaxed text-ink">
              {selectedIdea.body}
            </p>
          )}

          <div className="mt-5 space-y-3">
            <p className="text-xl font-black text-ink">
              {text.comments} {selectedIdea.comments.length}
            </p>
            {selectedIdea.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-forest-50 p-3">
                <p className="text-sm font-black text-stone-600">
                  {comment.authorName} / {comment.createdAt}
                </p>
                <p className="whitespace-pre-wrap break-words text-base font-bold text-ink">{comment.body}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold"
                value={commentDrafts[selectedIdea.id] ?? ""}
                onChange={(event) => setCommentDrafts((current) => ({ ...current, [selectedIdea.id]: event.target.value }))}
                placeholder={text.commentPlaceholder}
              />
              <button
                className="rounded-md bg-forest-700 px-4 py-3 text-base font-black text-white"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  addComment(selectedIdea.id);
                }}
              >
                {text.sendComment}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
