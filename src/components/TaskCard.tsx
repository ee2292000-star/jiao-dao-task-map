"use client";

import { useEffect, useState } from "react";
import type { Task, Teacher } from "@/lib/types";
import { getDaysLeft } from "@/lib/reminders";
import { getPriorityLabel, getStatusLabel } from "@/lib/decisionSupport";
import { ActionBar, ActionButton } from "./ActionBar";

type TaskCardProps = {
  task: Task;
  teachers: Teacher[];
  compact?: boolean;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
  onPriorityChange?: (taskId: string, priority: Task["priority"]) => void;
  onAssign?: (taskId: string, ownerId: string) => void;
  onDueDateChange?: (taskId: string, dueDate: string) => void;
  onQuickComment?: (taskId: string, body: string) => void;
  onRemind?: (message: string) => void;
  onOpen?: (taskId: string) => void;
  onUpdate?: (taskId: string, changes: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  priorityScore?: number;
  priorityReasons?: string[];
};

export function TaskCard({
  task,
  teachers,
  compact = false,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onDueDateChange,
  onQuickComment,
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
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description,
    ownerId: task.ownerIds[0] ?? "",
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status
  });
  const owners = teachers.filter((teacher) => task.ownerIds.includes(teacher.id));
  const daysLeft = getDaysLeft(task.dueDate);
  const isOverdue = daysLeft < 0 && task.status !== "done";
  const activeTeacherOptions = teachers.filter((teacher) => teacher.role !== "主任");

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
  }

  function saveEdit() {
    const title = draft.title.trim();
    if (!title) return;
    onUpdate?.(task.id, {
      title,
      description: draft.description,
      assignees: draft.ownerId ? [draft.ownerId] : [],
      ownerIds: draft.ownerId ? [draft.ownerId] : [],
      dueDate: draft.dueDate,
      priority: draft.priority,
      status: draft.status
    });
    setEditing(false);
  }

  function confirmDelete() {
    if (!window.confirm("確定要刪除此任務嗎？此動作無法復原。")) return;
    onDelete?.(task.id);
  }

  return (
    <article
      className={`group rounded-lg border bg-white p-4 shadow-soft ${
        isOverdue
          ? "border-red-200"
          : task.priority === "high"
            ? "border-amber-200"
            : "border-forest-100"
      }`}
      draggable
      onDragStart={(event) => event.dataTransfer.setData("taskId", task.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={() => onOpen?.(task.id)}>
          <h3 className="text-xl font-black leading-snug text-ink">{task.title}</h3>
          {!compact && (
            <p className="mt-2 text-base leading-relaxed text-stone-600">{task.description}</p>
          )}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-md px-3 py-1 text-base font-black ${
              task.status === "done"
                ? "bg-forest-100 text-forest-700"
                : task.status === "doing"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-stone-100 text-stone-700"
            }`}
          >
            {getStatusLabel(task.status)}
          </span>
          {(onUpdate || onDelete) && (
            <div className="flex gap-2">
              {onUpdate && (
                <button
                  className="rounded-md bg-forest-50 px-2 py-1 text-sm font-black text-forest-800 hover:bg-forest-100"
                  onClick={() => setEditing((value) => !value)}
                  type="button"
                >
                  編輯
                </button>
              )}
              {onDelete && (
                <button
                  className="rounded-md bg-red-50 px-2 py-1 text-sm font-black text-red-700 hover:bg-red-100"
                  onClick={confirmDelete}
                  type="button"
                >
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
            <span
              key={owner.id}
              className="inline-flex items-center gap-2 rounded-md bg-rice px-3 py-2 text-base font-bold text-ink"
            >
              <span className="grid size-7 place-items-center rounded-full bg-forest-700 text-sm text-white">
                {owner.avatar}
              </span>
              {owner.name}
            </span>
          ))
        ) : (
          <span className="rounded-md bg-red-50 px-3 py-2 text-base font-black text-red-800">
            尚未指派
          </span>
        )}
        <span
          className={`rounded-md px-3 py-2 text-base font-black ${
            task.priority === "high"
              ? "bg-amber-100 text-amber-900"
              : task.priority === "normal"
                ? "bg-forest-50 text-forest-700"
                : "bg-stone-100 text-stone-600"
          }`}
        >
          優先 {getPriorityLabel(task.priority)}
        </span>
        <span
          className={`rounded-md px-3 py-2 text-base font-black ${
            isOverdue ? "bg-red-50 text-red-700" : daysLeft <= 3 ? "bg-amber-50 text-amber-800" : "bg-forest-50 text-forest-700"
          }`}
        >
          {isOverdue ? `已逾期 ${Math.abs(daysLeft)} 天` : `剩 ${daysLeft} 天`}
        </span>
      </div>

      {priorityScore !== undefined && (
        <div className="mt-3 rounded-md bg-rice px-3 py-2 text-base font-bold text-stone-700">
          排序原因：{priorityReasons.slice(0, 2).join("、") || "依規則排序"}
          <span className="ml-2 text-sm text-stone-500">分數 {priorityScore}</span>
        </div>
      )}

      <ActionBar subtle>
        <ActionButton tone="primary" onClick={() => setExpanded((value) => !value)}>
          處理
        </ActionButton>
        <ActionButton
          tone="quiet"
          onClick={() => onStatusChange?.(task.id, "done")}
          disabled={task.status === "done"}
        >
          完成
        </ActionButton>
        <select
          className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
          value={task.ownerIds[0] ?? ""}
          onChange={(event) => onAssign?.(task.id, event.target.value)}
          aria-label="改派負責人"
        >
          <option value="">改派</option>
          {activeTeacherOptions.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
        <ActionButton
          tone="warm"
          onClick={() => onPriorityChange?.(task.id, "high")}
        >
          標優先
        </ActionButton>
        <ActionButton
          tone="quiet"
          onClick={() => onRemind?.(`已送出提醒：${task.title}`)}
        >
          催辦
        </ActionButton>
      </ActionBar>

      {editing && (
        <div className="mt-3 rounded-lg border border-forest-100 bg-warm p-3">
          <div className="grid gap-3">
            <input
              className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              aria-label="任務名稱"
              placeholder="任務名稱"
            />
            <textarea
              className="min-h-24 rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              aria-label="任務說明"
              placeholder="任務說明"
            />
            <div className="grid gap-2 md:grid-cols-4">
              <select
                className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
                value={draft.ownerId}
                onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}
                aria-label="負責教師"
              >
                <option value="">先不指派</option>
                {activeTeacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              <input
                className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
                type="date"
                value={draft.dueDate}
                onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                aria-label="截止日期"
              />
              <select
                className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
                value={draft.priority}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, priority: event.target.value as Task["priority"] }))
                }
                aria-label="優先順序"
              >
                <option value="low">低</option>
                <option value="normal">一般</option>
                <option value="high">高優先</option>
              </select>
              <select
                className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value as Task["status"] }))
                }
                aria-label="任務狀態"
              >
                <option value="todo">待辦</option>
                <option value="doing">進行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton tone="primary" onClick={saveEdit}>
                儲存
              </ActionButton>
              <ActionButton tone="quiet" onClick={() => setEditing(false)}>
                取消
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 rounded-lg border border-forest-100 bg-warm p-3">
          <div className="grid gap-2 md:grid-cols-4">
            <select
              className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              value={task.ownerIds[0] ?? ""}
              onChange={(event) => onAssign?.(task.id, event.target.value)}
              aria-label="負責人"
            >
              <option value="">負責人</option>
              {activeTeacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              value={task.status}
              onChange={(event) =>
                onStatusChange?.(task.id, event.target.value as Task["status"])
              }
              aria-label="狀態"
            >
              <option value="todo">待辦</option>
              <option value="doing">進行中</option>
              <option value="done">完成</option>
            </select>
            <select
              className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              value={task.priority}
              onChange={(event) =>
                onPriorityChange?.(task.id, event.target.value as Task["priority"])
              }
              aria-label="優先等級"
            >
              <option value="high">高優先</option>
              <option value="normal">一般</option>
              <option value="low">低</option>
            </select>
            <input
              className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              type="date"
              value={task.dueDate}
              onChange={(event) => onDueDateChange?.(task.id, event.target.value)}
              aria-label="截止日"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="快速留言，例如：已聯絡負責人"
              aria-label="快速留言"
            />
            <ActionButton tone="primary" onClick={submitComment}>留言</ActionButton>
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 rounded-md bg-forest-50 p-3 text-base font-bold text-stone-700">
          留言 {task.comments.length} 則 · 附件 {task.attachments.length} 份
          {task.isKeyTask ? " · 關鍵任務" : ""}
        </div>
      )}
    </article>
  );
}
