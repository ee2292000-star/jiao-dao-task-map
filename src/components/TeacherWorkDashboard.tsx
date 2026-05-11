"use client";

import { useEffect, useMemo, useState } from "react";
import type { Event, StickyNote, Task, Teacher } from "@/lib/types";
import { getAssigneeIds, getPriorityLabel, getStatusLabel } from "@/lib/decisionSupport";
import { MyWorkWall } from "@/components/MyWorkWall";
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
import { getDaysLeft, isTaskClosed } from "@/lib/reminders";

type TeacherWorkDashboardProps = {
  teacher: Teacher;
  teacherIds: string[];
  currentUserId: string;
  tasks: Task[];
  notes: StickyNote[];
  teachers: Teacher[];
  events: Event[];
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onUpdateTask: (taskId: string, changes: Partial<Task>) => void;
  onQuickComment: (taskId: string, body: string) => void;
  onNavigate?: (section: string) => void;
};

type FilterKey = "all" | "todo" | "doing" | "done" | "overdue";

const allRecipientId = "__all__";
const ideaTopicStorageKey = "jiao-dao-task-map:idea-wall-topic:v1";
const defaultIdeaTopicTitle = "\u7562\u696d\u5178\u79ae\u4e3b\u984c\u52df\u96c6";

const text = {
  kicker: "\u6211\u7684\u5de5\u4f5c\u3001\u4f4e\u58d3\u63d0\u9192\u3001\u72c0\u614b\u56de\u5831",
  title: "\u6211\u7684\u5de5\u4f5c\u9996\u9801",
  todayTasks: "\u4eca\u65e5\u6211\u7684\u4efb\u52d9",
  todayHint: "\u5148\u770b\u4eca\u5929\u8981\u63a8\u9032\u7684\u4e8b\uff0c\u5176\u4ed6\u4e0d\u6025\u7684\u653e\u5728\u6e05\u55ae\u88e1\u3002",
  weekProgress: "\u6211\u7684\u672c\u9031\u9032\u5ea6",
  taskList: "\u6211\u7684\u4efb\u52d9\u6e05\u55ae",
  recentNotice: "\u6700\u8fd1\u901a\u77e5",
  doneRecord: "\u6211\u7684\u5b8c\u6210\u7d00\u9304",
  noToday: "\u4eca\u5929\u6c92\u6709\u5fc5\u9808\u5148\u8655\u7406\u7684\u4efb\u52d9\u3002",
  noTasks: "\u76ee\u524d\u6c92\u6709\u4efb\u52d9\u3002",
  noNotice: "\u76ee\u524d\u6c92\u6709\u65b0\u901a\u77e5\u3002",
  noDone: "\u5b8c\u6210\u7d00\u9304\u6703\u986f\u793a\u5728\u9019\u88e1\uff0c\u8b93\u5de5\u4f5c\u6709\u7559\u4e0b\u75d5\u8de1\u3002",
  overdue: "\u903e\u671f",
  todayDue: "\u4eca\u65e5\u5230\u671f",
  weekDue: "\u672c\u9031\u5230\u671f",
  doing: "\u9032\u884c\u4e2d",
  done: "\u5df2\u5b8c\u6210",
  todo: "\u5f85\u958b\u59cb",
  all: "\u5168\u90e8",
  priority: "\u512a\u5148\u7a0b\u5ea6",
  dueDate: "\u622a\u6b62\u65e5",
  source: "\u4f86\u6e90",
  directorNote: "\u4e3b\u4efb\u7559\u8a00\u6216\u63d0\u9192",
  openDetail: "\u67e5\u770b\u7d30\u7bc0",
  close: "\u95dc\u9589",
  detail: "\u4efb\u52d9\u8a73\u7d30",
  description: "\u4efb\u52d9\u8aaa\u660e",
  assignee: "\u8ca0\u8cac\u4eba",
  attachments: "\u9644\u4ef6\u6216\u9023\u7d50",
  noAttachments: "\u76ee\u524d\u6c92\u6709\u9644\u4ef6",
  manual: "\u624b\u52d5\u5efa\u7acb",
  template: "\u6d3b\u52d5\u6a21\u677f",
  sticky: "\u4fbf\u5229\u8cbc\u8f49\u4efb\u52d9",
  activity: "\u6d3b\u52d5\u4efb\u52d9",
  progressNote: "\u6559\u5e2b\u9032\u5ea6\u56de\u5831",
  progressPlaceholder: "\u4f8b\u5982\uff1a\u5df2\u806f\u7e6b\u5b8c\u6210\uff0c\u7b49\u5f85\u56de\u8986\u3002",
  saveProgress: "\u5132\u5b58\u56de\u5831",
  needSupport: "\u9700\u8981\u5354\u52a9",
  startWork: "\u6211\u5df2\u958b\u59cb\u8655\u7406",
  waiting: "\u6211\u9700\u8981\u5354\u52a9",
  sendReview: "\u56de\u5831\u5df2\u5b8c\u6210",
  comment: "\u56de\u8986\u7559\u8a00",
  supportOn: "\u5df2\u6a19\u793a\u9700\u8981\u5354\u52a9",
  supportOff: "\u76ee\u524d\u4e0d\u9700\u8981\u5354\u52a9",
  completedPrefix: "\u5b8c\u6210",
  totalPrefix: "\u7e3d\u4efb\u52d9"
};

const todoText = {
  title: "\u6211\u7684\u4ee3\u8fa6\u4e8b\u9805",
  hint: "\u9019\u662f\u4f60\u81ea\u5df1\u7684\u5c0f\u63d0\u9192\uff0c\u4e0d\u6703\u9032\u5165\u4e3b\u4efb\u7684\u6b63\u5f0f\u4efb\u52d9\u770b\u677f\u3002",
  newTitle: "\u4ee3\u8fa6\u6a19\u984c",
  note: "\u5099\u8a3b",
  dueDate: "\u622a\u6b62\u65e5\uff08\u53ef\u9078\uff09",
  add: "\u65b0\u589e\u4ee3\u8fa6",
  save: "\u5132\u5b58",
  cancel: "\u53d6\u6d88",
  edit: "\u7de8\u8f2f",
  remove: "\u522a\u9664",
  complete: "\u6a19\u8a18\u5b8c\u6210",
  reopen: "\u6539\u56de\u5f85\u8655\u7406",
  pending: "\u5f85\u8655\u7406",
  done: "\u5df2\u5b8c\u6210",
  doneRecord: "\u5df2\u5b8c\u6210\u7d00\u9304",
  noPending: "\u76ee\u524d\u6c92\u6709\u500b\u4eba\u4ee3\u8fa6\u3002",
  noDone: "\u5b8c\u6210\u5f8c\u6703\u7559\u5728\u9019\u88e1\uff0c\u4e0d\u6703\u5f71\u97ff\u6b63\u5f0f\u884c\u653f\u4efb\u52d9\u3002",
  confirmDelete: "\u78ba\u5b9a\u8981\u522a\u9664\u9019\u500b\u4ee3\u8fa6\u4e8b\u9805\u55ce\uff1f"
};

function isAssignedToTeacher(task: Task, teacherIds: string[]) {
  const ids = new Set([...getAssigneeIds(task), task.assignedTo].filter(Boolean) as string[]);
  return teacherIds.some((id) => ids.has(id));
}

function taskStatusTag(task: Task) {
  const days = getDaysLeft(task.dueDate);
  if (!isTaskClosed(task) && days < 0) return text.overdue;
  if (!isTaskClosed(task) && days === 0) return text.todayDue;
  if (!isTaskClosed(task) && days <= 7) return text.weekDue;
  if (task.status === "doing") return text.doing;
  if (task.status === "done") return text.done;
  return getStatusLabel(task.status);
}

function tagClass(task: Task) {
  const days = getDaysLeft(task.dueDate);
  if (!isTaskClosed(task) && days < 0) return "bg-red-50 text-red-700";
  if (!isTaskClosed(task) && days <= 3) return "bg-amber-50 text-amber-800";
  if (task.status === "doing") return "bg-blue-50 text-blue-800";
  if (task.status === "done") return "bg-forest-50 text-forest-800";
  if (task.status === "review") return "bg-purple-50 text-purple-800";
  return "bg-stone-100 text-stone-700";
}

function sourceLabel(task: Task, events: Event[]) {
  if (task.sourceType === "sticky") return text.sticky;
  if (task.sourceType === "template") return text.template;
  if (task.activityName) return task.activityName;
  const eventName = task.eventId ? events.find((event) => event.id === task.eventId)?.name : "";
  return eventName || text.manual;
}

function priorityClass(priority: Task["priority"]) {
  if (priority === "high") return "bg-amber-100 text-amber-900";
  if (priority === "low") return "bg-stone-100 text-stone-600";
  return "bg-forest-50 text-forest-800";
}

export function TeacherWorkDashboard({
  teacher,
  teacherIds,
  currentUserId,
  tasks,
  notes,
  teachers,
  events,
  onStatusChange,
  onUpdateTask,
  onQuickComment,
  onNavigate
}: TeacherWorkDashboardProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [comment, setComment] = useState("");
  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>([]);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoNote, setTodoNote] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [editingTodoId, setEditingTodoId] = useState("");
  const [editTodoTitle, setEditTodoTitle] = useState("");
  const [editTodoNote, setEditTodoNote] = useState("");
  const [editTodoDueDate, setEditTodoDueDate] = useState("");
  const [ideaTopicTitle, setIdeaTopicTitle] = useState(defaultIdeaTopicTitle);
  const [todoSyncNotice, setTodoSyncNotice] = useState(
    isPersonalTodoCloudAvailable()
      ? "\u500b\u4eba\u4ee3\u8fa6\u5df2\u555f\u7528\u96f2\u7aef\u540c\u6b65\u3002"
      : "\u500b\u4eba\u4ee3\u8fa6\u76ee\u524d\u50c5\u4fdd\u7559\u5728\u9019\u53f0\u96fb\u8166\u3002"
  );

  const identityIds = teacherIds.length ? teacherIds : [teacher.id];
  const personalTodoOwnerId = identityIds[0] ?? teacher.id;
  const personalTodoStorageKey = `${personalTodoStoragePrefix}${personalTodoOwnerId}`;
  const myTasks = useMemo(
    () => tasks.filter((task) => isAssignedToTeacher(task, identityIds) && task.status !== "archived"),
    [identityIds, tasks]
  );
  const selectedTask = myTasks.find((task) => task.id === selectedTaskId);
  const todayTasks = myTasks.filter((task) => {
    const days = getDaysLeft(task.dueDate);
    return !isTaskClosed(task) && (days <= 0 || task.status === "doing");
  });
  const weekTasks = myTasks.filter((task) => {
    const days = getDaysLeft(task.dueDate);
    return task.status === "done" || (!isTaskClosed(task) && days >= 0 && days <= 7);
  });
  const doneCount = weekTasks.filter((task) => task.status === "done").length;
  const progressRate = weekTasks.length ? Math.round((doneCount / weekTasks.length) * 100) : 0;
  const completedTasks = myTasks
    .filter((task) => task.status === "done" || task.status === "review")
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const filteredTasks = myTasks.filter((task) => {
    if (filter === "todo") return task.status === "todo";
    if (filter === "doing") return task.status === "doing";
    if (filter === "done") return task.status === "done" || task.status === "review";
    if (filter === "overdue") return !isTaskClosed(task) && getDaysLeft(task.dueDate) < 0;
    return true;
  });
  const relatedNotes = notes.filter(
    (note) =>
      note.status !== "archived" &&
      (note.assigneeId === allRecipientId ||
        !note.assigneeId ||
        identityIds.includes(note.assigneeId) ||
        identityIds.includes(note.authorId))
  );
  const notices = [
    ...myTasks
      .filter((task) => !isTaskClosed(task) && getDaysLeft(task.dueDate) <= 3)
      .map((task) => ({
        id: `task-${task.id}`,
        title: `${task.title}`,
        detail: taskStatusTag(task),
        time: task.updatedAt,
        taskId: task.id
      })),
    ...relatedNotes.slice(0, 4).map((note) => ({
      id: `note-${note.id}`,
      title: note.title,
      detail: note.body.slice(0, 40),
      time: note.updatedAt,
      taskId: ""
    }))
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 8);
  const pendingTodos = personalTodos
    .filter((todo) => todo.status === "todo")
    .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));
  const doneTodos = personalTodos
    .filter((todo) => todo.status === "done")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  useEffect(() => {
    let isActive = true;
    const raw = window.localStorage.getItem(personalTodoStorageKey);
    const parsed = raw ? (JSON.parse(raw) as PersonalTodo[]) : [];
    const localTodos = Array.isArray(parsed)
      ? parsed.map((todo) => ({ ...todo, ownerId: todo.ownerId || personalTodoOwnerId }))
      : [];
    setPersonalTodos(localTodos);

    async function loadCloudTodos() {
      if (!isPersonalTodoCloudAvailable()) return;
      try {
        const cloudTodos = await loadPersonalTodosCloud(personalTodoOwnerId);
        if (!isActive || !cloudTodos) return;
        const mergedTodos = mergePersonalTodos(localTodos, cloudTodos, personalTodoOwnerId);
        setPersonalTodos(mergedTodos);
        window.localStorage.setItem(personalTodoStorageKey, JSON.stringify(mergedTodos));
        await syncPersonalTodosCloud(mergedTodos);
        setTodoSyncNotice("\u500b\u4eba\u4ee3\u8fa6\u5df2\u555f\u7528\u96f2\u7aef\u540c\u6b65\u3002");
      } catch {
        setTodoSyncNotice("\u96f2\u7aef\u4ee3\u8fa6\u66ab\u6642\u7121\u6cd5\u540c\u6b65\uff0c\u5df2\u5148\u4fdd\u7559\u5728\u672c\u6a5f\u3002");
      }
    }

    void loadCloudTodos();
    return () => {
      isActive = false;
    };
  }, [personalTodoOwnerId, personalTodoStorageKey]);
  useEffect(() => {
    function readIdeaTopic() {
      try {
        const raw = window.localStorage.getItem(ideaTopicStorageKey);
        if (!raw) return;
        const stored = JSON.parse(raw) as { title?: string };
        if (stored.title) setIdeaTopicTitle(stored.title);
      } catch {
        setIdeaTopicTitle(defaultIdeaTopicTitle);
      }
    }

    readIdeaTopic();
    window.addEventListener("storage", readIdeaTopic);
    window.addEventListener("idea-wall-topic-updated", readIdeaTopic);
    return () => {
      window.removeEventListener("storage", readIdeaTopic);
      window.removeEventListener("idea-wall-topic-updated", readIdeaTopic);
    };
  }, []);

  function savePersonalTodos(nextTodos: PersonalTodo[]) {
    const ownedTodos = nextTodos.map((todo) => ({ ...todo, ownerId: todo.ownerId || personalTodoOwnerId }));
    setPersonalTodos(ownedTodos);
    try {
      window.localStorage.setItem(personalTodoStorageKey, JSON.stringify(ownedTodos));
    } catch {
      // Personal todos still have local fallback. Ignore storage failures quietly.
    }
  }

  function saveChangedPersonalTodo(nextTodos: PersonalTodo[], changedTodo?: PersonalTodo) {
    savePersonalTodos(nextTodos);
    if (changedTodo) {
      void upsertPersonalTodoCloud({ ...changedTodo, ownerId: personalTodoOwnerId }).catch(() =>
        setTodoSyncNotice("\u96f2\u7aef\u4ee3\u8fa6\u66ab\u6642\u7121\u6cd5\u540c\u6b65\uff0c\u5df2\u5148\u4fdd\u7559\u5728\u672c\u6a5f\u3002")
      );
    }
  }

  function addPersonalTodo() {
    const title = todoTitle.trim();
    if (!title) return;
    const today = new Date().toLocaleDateString("sv-SE");
    const newTodo: PersonalTodo = {
      id: `personal-todo-${Date.now()}`,
      ownerId: personalTodoOwnerId,
      title,
      note: todoNote.trim(),
      dueDate: todoDueDate || undefined,
      status: "todo",
      createdAt: today,
      updatedAt: today
    };
    saveChangedPersonalTodo([newTodo, ...personalTodos], newTodo);
    setTodoTitle("");
    setTodoNote("");
    setTodoDueDate("");
  }

  function startEditTodo(todo: PersonalTodo) {
    setEditingTodoId(todo.id);
    setEditTodoTitle(todo.title);
    setEditTodoNote(todo.note);
    setEditTodoDueDate(todo.dueDate ?? "");
  }

  function saveTodoEdit(todoId: string) {
    const title = editTodoTitle.trim();
    if (!title) return;
    const today = new Date().toLocaleDateString("sv-SE");
    const nextTodos = personalTodos.map((todo) =>
        todo.id === todoId
          ? { ...todo, title, note: editTodoNote.trim(), dueDate: editTodoDueDate || undefined, updatedAt: today }
          : todo
    );
    saveChangedPersonalTodo(nextTodos, nextTodos.find((todo) => todo.id === todoId));
    setEditingTodoId("");
  }

  function toggleTodoDone(todoId: string) {
    const today = new Date().toLocaleDateString("sv-SE");
    const nextTodos: PersonalTodo[] = personalTodos.map((todo) =>
        todo.id === todoId
          ? { ...todo, status: todo.status === "done" ? "todo" : "done", updatedAt: today }
          : todo
    );
    saveChangedPersonalTodo(nextTodos, nextTodos.find((todo) => todo.id === todoId));
  }

  function deletePersonalTodo(todoId: string) {
    if (!window.confirm(todoText.confirmDelete)) return;
    savePersonalTodos(personalTodos.filter((todo) => todo.id !== todoId));
    void deletePersonalTodoCloud(todoId, personalTodoOwnerId).catch(() =>
      setTodoSyncNotice("\u96f2\u7aef\u4ee3\u8fa6\u66ab\u6642\u7121\u6cd5\u540c\u6b65\uff0c\u5df2\u5148\u4fdd\u7559\u5728\u672c\u6a5f\u3002")
    );
  }

  function openTask(task: Task) {
    setSelectedTaskId(task.id);
    setProgressNote(task.teacherProgressNote ?? "");
    setComment("");
  }

  function saveProgress() {
    if (!selectedTask) return;
    onUpdateTask(selectedTask.id, { teacherProgressNote: progressNote, needsSupport: selectedTask.needsSupport });
  }

  function toggleSupport() {
    if (!selectedTask) return;
    onUpdateTask(selectedTask.id, { needsSupport: !selectedTask.needsSupport });
  }

  function sendComment() {
    if (!selectedTask || !comment.trim()) return;
    onQuickComment(selectedTask.id, comment.trim());
    setComment("");
  }

  function renderTaskCard(task: Task) {
    return (
      <article key={task.id} className="rounded-lg border border-forest-100 bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-2xl font-black leading-snug text-ink">{task.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-md px-3 py-2 text-base font-black ${tagClass(task)}`}>{taskStatusTag(task)}</span>
              <span className={`rounded-md px-3 py-2 text-base font-black ${priorityClass(task.priority)}`}>
                {text.priority}: {getPriorityLabel(task.priority)}
              </span>
            </div>
          </div>
          <button className="rounded-md bg-forest-700 px-3 py-2 text-base font-black text-white" type="button" onClick={() => openTask(task)}>
            {text.openDetail}
          </button>
        </div>
        <div className="mt-3 grid gap-2 text-base font-bold text-stone-700 sm:grid-cols-2">
          <p>{text.dueDate}: {task.dueDate}</p>
          <p>{text.source}: {sourceLabel(task, events)}</p>
          <p>{text.directorNote}: {task.directorNote || task.comments[0]?.body || "-"}</p>
          <p>{text.assignee}: {teacher.name}</p>
        </div>
      </article>
    );
  }

  function renderPersonalTodo(todo: PersonalTodo) {
    const isEditing = editingTodoId === todo.id;

    return (
      <article key={todo.id} className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        {isEditing ? (
          <div className="grid gap-2">
            <input
              className="rounded-md border border-blue-100 bg-white px-3 py-2 text-base font-bold"
              value={editTodoTitle}
              onChange={(event) => setEditTodoTitle(event.target.value)}
            />
            <textarea
              className="min-h-20 rounded-md border border-blue-100 bg-white px-3 py-2 text-base font-bold"
              value={editTodoNote}
              onChange={(event) => setEditTodoNote(event.target.value)}
            />
            <input
              className="rounded-md border border-blue-100 bg-white px-3 py-2 text-base font-bold"
              type="date"
              value={editTodoDueDate}
              onChange={(event) => setEditTodoDueDate(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-blue-700 px-3 py-2 text-base font-black text-white" type="button" onClick={() => saveTodoEdit(todo.id)}>
                {todoText.save}
              </button>
              <button className="rounded-md bg-white px-3 py-2 text-base font-black text-ink" type="button" onClick={() => setEditingTodoId("")}>
                {todoText.cancel}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-black text-ink">{todo.title}</h4>
                  <span className={`rounded-md px-3 py-1 text-sm font-black ${todo.status === "done" ? "bg-stone-100 text-stone-600" : "bg-white text-blue-800"}`}>
                    {todo.status === "done" ? todoText.done : todoText.pending}
                  </span>
                </div>
                {todo.note && <p className="mt-2 text-base font-bold leading-relaxed text-stone-700">{todo.note}</p>}
                <p className="mt-2 text-sm font-bold text-stone-600">
                  {todo.dueDate ? `${todoText.dueDate}: ${todo.dueDate}` : todoText.dueDate}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button className="rounded-md bg-white px-3 py-2 text-sm font-black text-blue-800" type="button" onClick={() => toggleTodoDone(todo.id)}>
                  {todo.status === "done" ? todoText.reopen : todoText.complete}
                </button>
                <button className="rounded-md bg-white px-3 py-2 text-sm font-black text-ink" type="button" onClick={() => startEditTodo(todo)}>
                  {todoText.edit}
                </button>
                <button className="rounded-md bg-red-50 px-3 py-2 text-sm font-black text-red-700" type="button" onClick={() => deletePersonalTodo(todo.id)}>
                  {todoText.remove}
                </button>
              </div>
            </div>
          </>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-6" id="teacher-dashboard">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-xl font-bold text-forest-700">{text.kicker}</p>
        <div className="mt-2 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <h2 className="text-5xl font-black leading-tight text-ink">{text.title}</h2>
          <p className="rounded-lg bg-forest-50 px-4 py-3 text-xl font-black text-forest-800">{teacher.name}</p>
        </div>
        <button
          className="mt-4 w-full rounded-lg border border-blue-100 bg-blue-50 px-4 py-4 text-left text-xl font-black text-blue-900 hover:bg-blue-100"
          type="button"
          onClick={() => onNavigate?.("idea-wall")}
        >
          本週共創主題：{ideaTopicTitle}
          <span className="mt-1 block text-base font-bold text-blue-800">進入想法牆，和同仁一起貼點子、留言與支持。</span>
        </button>
      </section>

      <MyWorkWall ownerId={personalTodoOwnerId} ownerName={teacher.name} officialTasks={myTasks} />

      <section className="grid items-start gap-5 xl:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-3xl font-black text-ink">{text.todayTasks}</h3>
          <p className="mt-1 text-base font-bold text-stone-700">{text.todayHint}</p>
          <div className="mt-4 grid gap-3">
            {todayTasks.length ? todayTasks.slice(0, 3).map(renderTaskCard) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800">{text.noToday}</p>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-3xl font-black text-ink">{text.weekProgress}</h3>
          <div className="mt-4 rounded-lg bg-rice p-4">
            <div className="flex items-end justify-between">
              <p className="text-lg font-black text-forest-800">{text.completedPrefix} {doneCount} / {weekTasks.length}</p>
              <p className="text-4xl font-black text-forest-700">{progressRate}%</p>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-forest-700" style={{ width: `${progressRate}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-3xl font-black text-ink">{text.recentNotice}</h3>
          <div className="mt-4 space-y-2">
            {notices.length ? notices.slice(0, 4).map((notice) => (
              <button key={notice.id} className="w-full rounded-lg bg-rice p-3 text-left" type="button" onClick={() => notice.taskId && setSelectedTaskId(notice.taskId)}>
                <p className="text-lg font-black text-ink">{notice.title}</p>
                <p className="text-base font-bold text-stone-700">{notice.detail}</p>
              </button>
            )) : <p className="rounded-lg bg-rice p-4 text-lg font-black text-forest-800">{text.noNotice}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <h3 className="text-4xl font-black text-ink">{text.taskList}</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", text.all],
              ["todo", text.todo],
              ["doing", text.doing],
              ["done", text.done],
              ["overdue", text.overdue]
            ].map(([key, label]) => (
              <button
                key={key}
                className={`rounded-md px-4 py-2 text-base font-black ${filter === key ? "bg-forest-700 text-white" : "bg-rice text-ink"}`}
                type="button"
                onClick={() => setFilter(key as FilterKey)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {filteredTasks.length ? filteredTasks.map(renderTaskCard) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 xl:col-span-2">{text.noTasks}</p>}
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-4xl font-black text-ink">{text.doneRecord}</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {completedTasks.length ? completedTasks.map(renderTaskCard) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 lg:col-span-2">{text.noDone}</p>}
        </div>
      </section>

      {selectedTask && (
        <aside className="fixed inset-y-0 right-0 z-40 w-full overflow-y-auto border-l border-forest-100 bg-white p-5 shadow-2xl md:max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-forest-700">{text.detail}</p>
              <h3 className="mt-1 text-3xl font-black leading-tight text-ink">{selectedTask.title}</h3>
            </div>
            <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => setSelectedTaskId("")}>{text.close}</button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-lg bg-rice p-4">
              <p className="text-lg font-black text-forest-800">{text.description}</p>
              <p className="mt-2 text-lg font-bold leading-relaxed text-ink">{selectedTask.description || "-"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="rounded-lg bg-warm p-3 text-base font-black">{text.dueDate}: {selectedTask.dueDate}</p>
              <p className="rounded-lg bg-warm p-3 text-base font-black">{text.source}: {sourceLabel(selectedTask, events)}</p>
              <p className="rounded-lg bg-warm p-3 text-base font-black">{text.priority}: {getPriorityLabel(selectedTask.priority)}</p>
              <p className="rounded-lg bg-warm p-3 text-base font-black">{text.assignee}: {teacher.name}</p>
            </div>

            <div className="rounded-lg bg-rice p-4">
              <p className="text-lg font-black text-forest-800">{text.directorNote}</p>
              <p className="mt-2 text-base font-bold text-stone-700">{selectedTask.directorNote || selectedTask.comments[0]?.body || "-"}</p>
            </div>

            <div className="rounded-lg bg-rice p-4">
              <p className="text-lg font-black text-forest-800">{text.attachments}</p>
              <p className="mt-2 text-base font-bold text-stone-700">
                {selectedTask.attachments.length ? selectedTask.attachments.map((item) => item.name).join(", ") : text.noAttachments}
              </p>
            </div>

            <div className="grid gap-2">
              <button className="rounded-md bg-stone-100 px-4 py-3 text-lg font-black text-stone-800" type="button" onClick={() => onStatusChange(selectedTask.id, "todo")}>{text.todo}</button>
              <button className="rounded-md bg-blue-100 px-4 py-3 text-lg font-black text-blue-900" type="button" onClick={() => onStatusChange(selectedTask.id, "doing")}>{text.startWork}</button>
              <button className="rounded-md bg-yellow-100 px-4 py-3 text-lg font-black text-yellow-900" type="button" onClick={() => onStatusChange(selectedTask.id, "waiting")}>{text.waiting}</button>
              <button className="rounded-md bg-purple-100 px-4 py-3 text-lg font-black text-purple-900" type="button" onClick={() => onStatusChange(selectedTask.id, "review")}>{text.sendReview}</button>
            </div>

            <div className="rounded-lg border border-forest-100 bg-warm p-4">
              <label className="text-lg font-black text-forest-800" htmlFor="teacher-progress-note">{text.progressNote}</label>
              <textarea
                id="teacher-progress-note"
                className="mt-2 min-h-28 w-full rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold"
                value={progressNote}
                onChange={(event) => setProgressNote(event.target.value)}
                placeholder={text.progressPlaceholder}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-md bg-forest-700 px-4 py-2 text-base font-black text-white" type="button" onClick={saveProgress}>{text.saveProgress}</button>
                <button className="rounded-md bg-amber-100 px-4 py-2 text-base font-black text-amber-900" type="button" onClick={toggleSupport}>
                  {selectedTask.needsSupport ? text.supportOn : text.supportOff}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-forest-100 bg-warm p-4">
              <p className="text-lg font-black text-forest-800">{text.comment}</p>
              <div className="mt-2 flex gap-2">
                <input className="min-w-0 flex-1 rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-bold" value={comment} onChange={(event) => setComment(event.target.value)} />
                <button className="rounded-md bg-forest-700 px-4 py-2 text-base font-black text-white" type="button" onClick={sendComment}>{text.comment}</button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
