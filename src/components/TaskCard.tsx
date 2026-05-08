"use client";

import { useEffect, useState } from "react";
import type { Comment, Task, Teacher } from "@/lib/types";
import { getPriorityLabel, getStatusLabel } from "@/lib/decisionSupport";
import { getDaysLeft, isTaskClosed } from "@/lib/reminders";
import { ActionButton } from "./ActionBar";

type TaskCardProps = {
  task: Task;
  teachers: Teacher[];
  compact?: boolean;
  currentUserId?: string;
  editableCommentAuthorIds?: string[];
  canManageComments?: boolean;
  canConfirmTask?: boolean;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
  onPriorityChange?: (taskId: string, priority: Task["priority"]) => void;
  onAssign?: (taskId: string, ownerId: string) => void;
  onDueDateChange?: (taskId: string, dueDate: string) => void;
  onQuickComment?: (taskId: string, body: string) => void;
  onUpdateComment?: (taskId: string, commentId: string, body: string) => void;
  onDeleteComment?: (taskId: string, commentId: string) => void;
  onRemind?: (message: string) => void;
  onOpen?: (taskId: string) => void;
  onUpdate?: (taskId: string, changes: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  priorityScore?: number;
  priorityReasons?: string[];
};

const statusClass: Record<Task["status"], string> = {
  todo: "bg-stone-100 text-stone-700",
  doing: "bg-blue-100 text-blue-800",
  waiting: "bg-yellow-100 text-yellow-900",
  review: "bg-purple-100 text-purple-800",
  done: "bg-forest-100 text-forest-700",
  archived: "bg-stone-50 text-stone-500"
};

const teacherStatuses: Task["status"][] = ["todo", "doing", "waiting", "review"];
const directorStatuses: Task["status"][] = ["todo", "doing", "waiting", "review", "done", "archived"];

function dayText(daysLeft: number, status: Task["status"]) {
  if (status === "done") return "已完成";
  if (status === "archived") return "已封存";
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return "今天到期";
  return `剩 ${daysLeft} 天`;
}

function commentAuthorName(authorId: string, teachers: Teacher[]) {
  return teachers.find((teacher) => teacher.id === authorId)?.name ?? "系統留言";
}

export function TaskCard({
  task,
  teachers,
  compact = false,
  currentUserId,
  editableCommentAuthorIds = currentUserId ? [currentUserId] : [],
  canManageComments = false,
  canConfirmTask = false,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onDueDateChange,
  onQuickComment,
  onUpdateComment,
  onDeleteComment,
  onRemind,
  onOpen,
  onUpdate,
  onDelete,
  priorityScore,
  priorityReasons = []
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description,
    ownerId: task.ownerIds[0] ?? "",
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status
  });
  const owners = teachers.filter((teacher) => task.ownerIds.includes(teacher.id));
  const activeTeacherOptions = teachers.filter((teacher) => teacher.enabled !== false);
  const daysLeft = getDaysLeft(task.dueDate);
  const isOverdue = daysLeft < 0 && !isTaskClosed(task);
  const statusOptions = canConfirmTask ? directorStatuses : teacherStatuses;

  useEffect(() => {
    setDraft({
      title: task.title,
      description: task.description,
      ownerId: task.ownerIds[0] ?? "",
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status
    });
  }, [task]);

  function submitComment() {
    const body = comment.trim();
    if (!body) return;
    onQuickComment?.(task.id, body);
    setComment("");
    setExpanded(true);
  }

  function saveCommentEdit() {
    const body = editingCommentBody.trim();
    if (!body || !editingCommentId) return;
    onUpdateComment?.(task.id, editingCommentId, body);
    setEditingCommentId("");
    setEditingCommentBody("");
  }

  function confirmDeleteComment(commentId: string) {
    if (!window.confirm("確定要刪除此留言嗎？此動作無法復原。")) return;
    onDeleteComment?.(task.id, commentId);
    if (editingCommentId === commentId) setEditingCommentId("");
  }

  function canEditComment(item: Comment) {
    return canManageComments || editableCommentAuthorIds.includes(item.authorId);
  }

  function saveEdit() {
    const title = draft.title.trim();
    if (!title) return;
    onUpdate?.(task.id, {
      title,
      description: draft.description,
      assignees: draft.ownerId ? [draft.ownerId] : [],
      ownerIds: draft.ownerId ? [draft.ownerId] : [],
      assignedTo: draft.ownerId || undefined,
      dueDate: draft.dueDate,
      priority: draft.priority,
      status: canConfirmTask || teacherStatuses.includes(draft.status) ? draft.status : task.status
    });
    setEditing(false);
  }

  function confirmDelete() {
    if (!window.confirm("確定要刪除此任務嗎？此動作無法復原。")) return;
    onDelete?.(task.id);
  }

  function renderTeacherActions() {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={() => onStatusChange?.(task.id, "doing")} disabled={task.status === "doing" || isTaskClosed(task)}>
          我已開始處理
        </ActionButton>
        <ActionButton tone="warm" onClick={() => onStatusChange?.(task.id, "waiting")} disabled={task.status === "waiting" || isTaskClosed(task)}>
          我需要協助
        </ActionButton>
        <ActionButton tone="quiet" onClick={() => onStatusChange?.(task.id, "review")} disabled={task.status === "review" || isTaskClosed(task)}>
          送主任確認
        </ActionButton>
        <ActionButton tone="quiet" onClick={() => setExpanded((value) => !value)}>
          回覆留言
        </ActionButton>
      </div>
    );
  }

  function renderDirectorActions() {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={() => setExpanded((value) => !value)}>
          處理
        </ActionButton>
        <ActionButton tone="quiet" onClick={() => onStatusChange?.(task.id, "done")} disabled={task.status === "done" || task.status === "archived"}>
          確認完成
        </ActionButton>
        <select
          className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
          value={task.ownerIds[0] ?? ""}
          onChange={(event) => onAssign?.(task.id, event.target.value)}
          aria-label="改派負責教師"
        >
          <option value="">尚未指派</option>
          {activeTeacherOptions.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
        <ActionButton tone="warm" onClick={() => onPriorityChange?.(task.id, "high")}>
          標優先
        </ActionButton>
        <ActionButton tone="quiet" onClick={() => onRemind?.(`提醒：${task.title}`)}>
          催辦
        </ActionButton>
        <ActionButton tone="quiet" onClick={() => onStatusChange?.(task.id, "archived")} disabled={task.status === "archived"}>
          封存
        </ActionButton>
      </div>
    );
  }

  return (
    <article
      className={`group rounded-lg border bg-white p-4 shadow-soft ${
        isOverdue ? "border-red-200" : task.priority === "high" ? "border-amber-200" : "border-forest-100"
      } ${task.status === "archived" ? "opacity-70" : ""}`}
      draggable={canConfirmTask}
      onDragStart={(event) => event.dataTransfer.setData("taskId", task.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={() => onOpen?.(task.id)} type="button">
          <h3 className="text-xl font-black leading-snug text-ink">{task.title}</h3>
          {!compact && task.description && (
            <p className="mt-2 text-base leading-relaxed text-stone-600">{task.description}</p>
          )}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-md px-3 py-1 text-base font-black ${statusClass[task.status]}`}>
            {getStatusLabel(task.status)}
          </span>
          {canConfirmTask && (onUpdate || onDelete) && (
            <div className="flex gap-2">
              {onUpdate && (
                <button className="rounded-md bg-forest-50 px-2 py-1 text-sm font-black text-forest-800 hover:bg-forest-100" onClick={() => setEditing((value) => !value)} type="button">
                  編輯
                </button>
              )}
              {onDelete && (
                <button className="rounded-md bg-red-50 px-2 py-1 text-sm font-black text-red-700 hover:bg-red-100" onClick={confirmDelete} type="button">
                  刪除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {owners.length ? (
          owners.map((owner) => (
            <span key={owner.id} className="inline-flex items-center gap-2 rounded-md bg-rice px-3 py-2 text-base font-bold text-ink">
              <span className="grid size-7 place-items-center rounded-full bg-forest-700 text-sm text-white">
                {owner.avatar}
              </span>
              {owner.name}
            </span>
          ))
        ) : (
          <span className="rounded-md bg-red-50 px-3 py-2 text-base font-black text-red-800">尚未指派</span>
        )}
        {canConfirmTask && (
          <span className="rounded-md bg-forest-50 px-3 py-2 text-base font-black text-forest-700">
            {getPriorityLabel(task.priority)}
          </span>
        )}
        <span className={`rounded-md px-3 py-2 text-base font-black ${isOverdue ? "bg-red-50 text-red-700" : daysLeft <= 3 ? "bg-amber-50 text-amber-800" : "bg-forest-50 text-forest-700"}`}>
          {dayText(daysLeft, task.status)}
        </span>
        <span className="rounded-md bg-rice px-3 py-2 text-base font-bold text-stone-700">
          更新 {task.updatedAt}
        </span>
        {task.comments.length > 0 && (
          <button className="rounded-md bg-blue-50 px-3 py-2 text-base font-black text-blue-800 hover:bg-blue-100" onClick={() => setExpanded(true)} type="button">
            留言 {task.comments.length}
          </button>
        )}
      </div>

      {canConfirmTask && priorityScore !== undefined && (
        <div className="mt-3 rounded-md bg-rice px-3 py-2 text-base font-bold text-stone-700">
          排序原因：{priorityReasons.slice(0, 2).join("、") || "依期限與狀態排序"}
          <span className="ml-2 text-sm text-stone-500">分數 {priorityScore}</span>
        </div>
      )}

      {canConfirmTask ? renderDirectorActions() : renderTeacherActions()}

      {editing && canConfirmTask && (
        <div className="mt-3 rounded-lg border border-forest-100 bg-warm p-3">
          <div className="grid gap-3">
            <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="任務名稱" />
            <textarea className="min-h-24 rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="任務說明" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
                <option value="">尚未指派</option>
                {activeTeacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
              <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Task["priority"] }))}>
                <option value="low">低</option>
                <option value="normal">一般</option>
                <option value="high">優先</option>
              </select>
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Task["status"] }))}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{getStatusLabel(status)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton tone="primary" onClick={saveEdit}>儲存</ActionButton>
              <ActionButton tone="quiet" onClick={() => setEditing(false)}>取消</ActionButton>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 rounded-lg border border-forest-100 bg-warm p-3">
          {canConfirmTask && (
            <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={task.status} onChange={(event) => onStatusChange?.(task.id, event.target.value as Task["status"])}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{getStatusLabel(status)}</option>
                ))}
              </select>
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={task.priority} onChange={(event) => onPriorityChange?.(task.id, event.target.value as Task["priority"])}>
                <option value="high">優先</option>
                <option value="normal">一般</option>
                <option value="low">低</option>
              </select>
              <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" type="date" value={task.dueDate} onChange={(event) => onDueDateChange?.(task.id, event.target.value)} />
              <ActionButton tone="primary" onClick={() => onStatusChange?.(task.id, "doing")}>改為進行中</ActionButton>
            </div>
          )}

          <div className="flex gap-2">
            <input className="min-w-0 flex-1 rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="回覆留言，例如：已聯絡負責人" />
            <ActionButton tone="primary" onClick={submitComment}>留言</ActionButton>
          </div>

          <div className="mt-3 rounded-md bg-white p-3">
            <p className="text-base font-black text-forest-700">留言紀錄</p>
            {task.comments.length ? (
              <div className="mt-2 space-y-2">
                {task.comments.slice().reverse().map((item: Comment) => {
                  const editable = canEditComment(item);
                  return (
                    <div key={item.id} className="rounded-md bg-rice px-3 py-2">
                      {editingCommentId === item.id ? (
                        <div className="grid gap-2">
                          <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={editingCommentBody} onChange={(event) => setEditingCommentBody(event.target.value)} />
                          <div className="flex flex-wrap gap-2">
                            <ActionButton tone="primary" onClick={saveCommentEdit}>儲存留言</ActionButton>
                            <ActionButton tone="quiet" onClick={() => setEditingCommentId("")}>取消</ActionButton>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-base font-black text-ink">{item.body}</p>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-stone-600">{commentAuthorName(item.authorId, teachers)} / {item.createdAt}</p>
                            {editable && (
                              <div className="flex gap-2">
                                <button className="rounded-md bg-white px-2 py-1 text-sm font-black text-forest-800 hover:bg-forest-50" type="button" onClick={() => {
                                  setEditingCommentId(item.id);
                                  setEditingCommentBody(item.body);
                                }}>編輯</button>
                                <button className="rounded-md bg-red-50 px-2 py-1 text-sm font-black text-red-700 hover:bg-red-100" type="button" onClick={() => confirmDeleteComment(item.id)}>刪除</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 rounded-md bg-rice px-3 py-2 text-base font-bold text-stone-600">目前尚無留言</p>
            )}
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 rounded-md bg-forest-50 p-3 text-base font-bold text-stone-700">
          留言 {task.comments.length} 則 / 附件 {task.attachments.length} 件
          {task.isKeyTask ? " / 關鍵任務" : ""}
        </div>
      )}
    </article>
  );
}
