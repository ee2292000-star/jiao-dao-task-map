"use client";

import { useEffect, useMemo, useState } from "react";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { ActivityDatabase } from "@/components/ActivityDatabase";
import { CommandBar } from "@/components/CommandBar";
import { Dashboard } from "@/components/Dashboard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { QuickCreatePanel } from "@/components/QuickCreatePanel";
import { StickyWall } from "@/components/StickyWall";
import { TeacherHome } from "@/components/TeacherHome";
import { TeacherPortal } from "@/components/TeacherPortal";
import { TemplatePanel } from "@/components/TemplatePanel";
import { Timeline } from "@/components/Timeline";
import { WorkloadPanel } from "@/components/WorkloadPanel";
import { events as initialEvents, initialTasks, stickyNotes, teachers } from "@/lib/mockData";
import { balanceTaskAssignments } from "@/lib/decisionSupport";
import { getDaysLeft } from "@/lib/reminders";
import { generateEventTemplateTasks, savedEventTemplates } from "@/lib/templates";
import { deleteCloudTask, isSupabaseConfigured, loadCloudData, saveCloudData } from "@/lib/supabaseClient";
import type { Event, StickyNote, Task } from "@/lib/types";
import type { Priority, StickyColor } from "@/lib/types";

const navItems = [
  ["工作總覽", "dashboard"],
  ["快速新增", "quick-create"],
  ["活動時間軸", "timeline"],
  ["任務看板", "kanban"],
  ["人員分工", "workload"],
  ["共筆便利貼", "sticky"],
  ["提醒中心", "dashboard"],
  ["活動模板", "templates"],
  ["教師端", "teacher"],
  ["活動資料庫", "archive"],
  ["系統設定", "archive"]
];

const TASKS_STORAGE_KEY = "jiao-dao-task-map:tasks:v1";
const NOTES_STORAGE_KEY = "jiao-dao-task-map:sticky-notes:v1";
const EVENTS_STORAGE_KEY = "jiao-dao-task-map:events:v1";

function readStoredArray<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredArray<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is a safety net only; cloud sync still runs separately.
  }
}

function getTodayString() {
  return new Date().toLocaleDateString("sv-SE");
}

function addDaysString(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("sv-SE");
}

function normalizeTask(task: Partial<Task>): Task {
  const ownerIds = task.ownerIds ?? task.assignees ?? [];
  const assignees = task.assignees ?? ownerIds;

  return {
    id: task.id ?? `task-${Date.now()}`,
    title: task.title ?? "未命名任務",
    description: task.description ?? "",
    assignees,
    ownerIds,
    eventId: task.eventId,
    status: task.status ?? "todo",
    priority: task.priority ?? "normal",
    isCritical: task.isCritical ?? task.isKeyTask ?? false,
    isBlocked: task.isBlocked ?? false,
    isKeyTask: task.isKeyTask ?? task.isCritical ?? false,
    dueDate: task.dueDate ?? addDaysString(6),
    startDate: task.startDate,
    createdAt: task.createdAt ?? getTodayString(),
    updatedAt: task.updatedAt ?? getTodayString(),
    comments: task.comments ?? [],
    attachments: task.attachments ?? []
  };
}

function mergeStoredTasks(storedTasks: Task[] | null) {
  if (!storedTasks) return initialTasks;
  return storedTasks.map(normalizeTask);
}

function normalizeEvent(event: Partial<Event>): Event {
  return {
    id: event.id ?? `event-${Date.now()}`,
    name: event.name ?? "未命名活動",
    month: event.month ?? "未設定",
    startDate: event.startDate ?? getTodayString(),
    endDate: event.endDate ?? "2026-06-30",
    taskIds: event.taskIds ?? [],
    templateId: event.templateId,
    reviewNotes: event.reviewNotes ?? []
  };
}

function mergeStoredEvents(storedEvents: Event[] | null) {
  if (!storedEvents) return initialEvents;
  return storedEvents.map(normalizeEvent);
}

function mergeUniqueById<T extends { id: string }>(primary: T[], secondary: T[]) {
  const seen = new Set(primary.map((item) => item.id));
  return [...primary, ...secondary.filter((item) => !seen.has(item.id))];
}

function filterTasks(tasks: Task[], filter: string) {
  if (filter === "week") {
    return tasks.filter((task) => {
      const days = getDaysLeft(task.dueDate);
      return days >= 0 && days <= 7 && task.status !== "done";
    });
  }
  if (filter === "done") return tasks.filter((task) => task.status === "done");
  if (filter === "doing") return tasks.filter((task) => task.status === "doing");
  if (filter === "overdue") {
    return tasks.filter((task) => getDaysLeft(task.dueDate) < 0 && task.status !== "done");
  }
  if (filter === "unassigned") return tasks.filter((task) => task.ownerIds.length === 0);
  if (filter === "comments") {
    return tasks.filter((task) => task.comments.length > 0 && task.status !== "done");
  }
  if (filter === "confirm") {
    return tasks.filter((task) => task.status === "todo" && task.priority === "high");
  }
  if (filter.startsWith("teacher:")) {
    const teacherId = filter.replace("teacher:", "");
    return tasks.filter((task) => task.ownerIds.includes(teacherId));
  }
  if (filter.startsWith("event:")) {
    const eventId = filter.replace("event:", "");
    return tasks.filter((task) => task.eventId === eventId);
  }
  return tasks;
}

function taskMatchesFilter(task: Task, filter: string) {
  return filterTasks([task], filter).length > 0;
}

function getFilterLabel(filter: string) {
  if (filter === "all") return "全部任務";
  if (filter === "week") return "本週到期";
  if (filter === "done") return "已完成";
  if (filter === "doing") return "進行中";
  if (filter === "overdue") return "逾期任務";
  if (filter === "unassigned") return "未指派任務";
  if (filter === "comments") return "未回覆留言";
  if (filter === "confirm") return "未確認事項";
  if (filter.startsWith("teacher:")) return "教師任務篩選";
  if (filter.startsWith("event:")) return "活動任務篩選";
  return "目前篩選條件";
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<StickyNote[]>(stickyNotes);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentMode, setCurrentMode] = useState<"director" | "teacher">("director");
  const [activeTeacherId, setActiveTeacherId] = useState("t3");
  const [filter, setFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0]?.id ?? "");
  const [actionMessage, setActionMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<"cloud" | "local">("local");

  const activeTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === activeTeacherId) ?? teachers[0],
    [activeTeacherId]
  );
  const visibleTasks = filterTasks(tasks, filter);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  useEffect(() => {
    async function hydrateData() {
      const storedTasks = readStoredArray<Task>(TASKS_STORAGE_KEY);
      const storedNotes = readStoredArray<StickyNote>(NOTES_STORAGE_KEY);
      const storedEvents = readStoredArray<Event>(EVENTS_STORAGE_KEY);
      const localTasks = mergeStoredTasks(storedTasks);
      const localEvents = mergeStoredEvents(storedEvents);
      const localNotes = storedNotes ?? stickyNotes;
      const hasLocalData = Boolean(storedTasks || storedNotes || storedEvents);

      if (isSupabaseConfigured) {
        try {
          const cloudData = await loadCloudData();
          if (cloudData) {
            const hasCloudData = Boolean(
              cloudData.tasks.length || cloudData.events.length || cloudData.notes.length
            );
            const cloudTasks = hasCloudData ? cloudData.tasks : initialTasks;
            const cloudEvents = hasCloudData ? cloudData.events : initialEvents;
            const cloudNotes = hasCloudData ? cloudData.notes : stickyNotes;
            const nextTasks = hasLocalData ? mergeUniqueById(localTasks, cloudTasks) : cloudTasks;
            const nextEvents = hasLocalData ? mergeUniqueById(localEvents, cloudEvents) : cloudEvents;
            const nextNotes = hasLocalData ? mergeUniqueById(localNotes, cloudNotes) : cloudNotes;

            setTasks(nextTasks);
            setEvents(nextEvents);
            setNotes(nextNotes);
            setSelectedTaskId(nextTasks[0]?.id ?? "");
            setDataSource("cloud");
            setActionMessage("已連上 Supabase 雲端資料庫。");
            setIsHydrated(true);

            await saveCloudData({
              events: nextEvents,
              tasks: nextTasks,
              notes: nextNotes
            });
            setActionMessage(
              hasLocalData ? "已連上 Supabase，並同步本機暫存資料。" : "已連上 Supabase 雲端資料庫。"
            );
            return;
          }
        } catch {
          setActionMessage("雲端資料庫暫時無法讀取，已改用本機保存。");
        }
      }

      setTasks(localTasks);
      setEvents(localEvents);
      setNotes(localNotes);
      setSelectedTaskId(localTasks[0]?.id ?? "");
      setDataSource("local");
      setIsHydrated(true);
      if (hasLocalData) setActionMessage("已載入本機保存資料。");
    }

    void hydrateData();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [isHydrated, tasks]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }, [isHydrated, notes]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [isHydrated, events]);

  useEffect(() => {
    if (!isHydrated || dataSource !== "cloud") return;

    const timeout = window.setTimeout(() => {
      void saveCloudData({ events, tasks, notes }).catch(() => {
        setActionMessage("雲端保存暫時失敗，資料仍保存在本機瀏覽器。");
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [dataSource, events, isHydrated, notes, tasks]);

  function handleStatusChange(taskId: string, status: Task["status"]) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status, updatedAt: getTodayString() } : task
      )
    );
  }

  function handlePriorityChange(taskId: string, priority: Task["priority"]) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, priority, updatedAt: getTodayString() } : task
      )
    );
  }

  function handleAssign(taskId: string, ownerId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assignees: ownerId ? [ownerId] : [],
              ownerIds: ownerId ? [ownerId] : [],
              updatedAt: getTodayString()
            }
          : task
      )
    );
    setActionMessage(ownerId ? "已完成改派，任務負責人已更新。" : "已清除負責人。");
  }

  function handleDueDateChange(taskId: string, dueDate: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, dueDate, updatedAt: getTodayString() } : task
      )
    );
    setActionMessage("截止日已更新。");
  }

  function handleUpdateTask(taskId: string, changes: Partial<Task>) {
    setTasks((current) => {
      const nextTasks = current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...changes,
              assignees: changes.assignees ?? changes.ownerIds ?? task.assignees,
              ownerIds: changes.ownerIds ?? changes.assignees ?? task.ownerIds,
              updatedAt: getTodayString()
            }
          : task
      );
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      if (dataSource === "cloud") {
        void saveCloudData({ events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端保存暫時失敗，資料仍保存在本機瀏覽器。");
        });
      }
      return nextTasks;
    });
    setSelectedTaskId(taskId);
    setActionMessage("任務已更新，並同步到看板、摘要與教師端。");
  }

  function handleDeleteTask(taskId: string) {
    setTasks((current) => {
      const nextTasks = current.filter((task) => task.id !== taskId);
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      setSelectedTaskId((currentSelectedId) =>
        currentSelectedId === taskId ? nextTasks[0]?.id ?? "" : currentSelectedId
      );
      if (dataSource === "cloud") {
        void deleteCloudTask(taskId).catch(() => {
          setActionMessage("雲端刪除暫時失敗，已先從本機畫面移除。");
        });
      }
      return nextTasks;
    });
    setEvents((current) => {
      const nextEvents = current.map((event) => ({
        ...event,
        taskIds: event.taskIds.filter((id) => id !== taskId)
      }));
      writeStoredArray(EVENTS_STORAGE_KEY, nextEvents);
      return nextEvents;
    });
    setActionMessage("任務已刪除，並同步更新看板與摘要。");
  }

  function handleQuickComment(taskId: string, body: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updatedAt: getTodayString(),
              comments: [
                ...task.comments,
                {
                  id: `comment-${Date.now()}`,
                  authorId: "t1",
                  body,
                  createdAt: getTodayString()
                }
              ]
            }
          : task
      )
    );
    setActionMessage("已新增快速留言。");
  }

  function handleRemind(message: string) {
    setActionMessage(message);
  }

  function handleDeferTask(taskId: string) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const nextDate = new Date(`${task.dueDate}T00:00:00`);
        nextDate.setDate(nextDate.getDate() + 2);
        return { ...task, dueDate: nextDate.toISOString().slice(0, 10), updatedAt: getTodayString() };
      })
    );
    setActionMessage("已延後 2 天，提醒暫時降壓。");
  }

  function handleBalanceTasks() {
    setTasks((current) => balanceTaskAssignments(current, teachers));
    setActionMessage("已依目前負荷平均分配非關鍵任務。");
  }

  function handleStickyToggle(noteId: string) {
    setNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, done: !note.done } : note))
    );
    setActionMessage("便利貼狀態已保存。");
  }

  function handleStickyAssign(noteId: string, teacherId: string) {
    setNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, assigneeId: teacherId } : note))
    );
    setActionMessage("便利貼已改派。");
  }

  function handleConvertSticky(noteId: string) {
    const note = notes.find((item) => item.id === noteId);
    if (!note || note.convertedTaskId) return;

    const taskId = `task-from-${note.id}`;
    const newTask: Task = {
      id: taskId,
      title: `便利貼轉任務：${note.body}`,
      description: "由共筆便利貼轉為正式任務，後續可進看板追蹤。",
      assignees: note.assigneeId ? [note.assigneeId] : [],
      ownerIds: note.assigneeId ? [note.assigneeId] : [],
      eventId: note.eventId,
      status: "todo",
      priority: "normal",
      isCritical: false,
      isBlocked: false,
      dueDate: note.dueDate ?? addDaysString(6),
      createdAt: getTodayString(),
      updatedAt: getTodayString(),
      comments: [],
      attachments: []
    };

    setTasks((current) => [newTask, ...current]);
    setNotes((current) =>
      current.map((item) => (item.id === noteId ? { ...item, convertedTaskId: taskId } : item))
    );
    setSelectedTaskId(taskId);
    setActionMessage("便利貼已轉為正式任務。");
  }

  function handleCreateTask(input: {
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority: Priority;
    isCritical: boolean;
  }) {
    const taskId = `task-${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      title: input.title,
      description: input.description || "快速新增任務，可再補充說明與留言。",
      assignees: input.assigneeId ? [input.assigneeId] : [],
      ownerIds: input.assigneeId ? [input.assigneeId] : [],
      status: "todo",
      priority: input.priority,
      isCritical: input.isCritical,
      isBlocked: false,
      isKeyTask: input.isCritical,
      dueDate: input.dueDate,
      createdAt: getTodayString(),
      updatedAt: getTodayString(),
      comments: [],
      attachments: []
    };

    setTasks((current) => {
      const nextTasks = [newTask, ...current];
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      if (dataSource === "cloud") {
        void saveCloudData({ events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端保存暫時失敗，資料仍保存在本機瀏覽器。");
        });
      }
      return nextTasks;
    });
    setSelectedTaskId(taskId);
    setActionMessage(
      taskMatchesFilter(newTask, filter)
        ? "已新增任務，並同步到任務看板、今日重點與教師端。"
        : `任務已新增，但目前篩選條件「${getFilterLabel(filter)}」未顯示此任務。`
    );
  }

  function handleCreateNote(input: {
    body: string;
    assigneeId: string;
    dueDate: string;
    color: StickyColor;
  }) {
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      eventId: "event-graduation",
      authorId: "t1",
      color: input.color,
      body: input.body,
      assigneeId: input.assigneeId || undefined,
      dueDate: input.dueDate,
      done: false,
      createdAt: getTodayString()
    };

    setNotes((current) => {
      const nextNotes = [newNote, ...current];
      writeStoredArray(NOTES_STORAGE_KEY, nextNotes);
      if (dataSource === "cloud") {
        void saveCloudData({ events, tasks, notes: nextNotes }).catch(() => {
          setActionMessage("雲端保存暫時失敗，資料仍保存在本機瀏覽器。");
        });
      }
      return nextNotes;
    });
    setActionMessage("已新增便利貼，之後可直接轉正式任務。");
  }

  function handleCreateEvent(input: {
    name: string;
    endDate: string;
    templateId: string;
  }) {
    const template =
      savedEventTemplates.find((item) => item.id === input.templateId) ?? savedEventTemplates[0];
    const eventId = `event-${Date.now()}`;
    const endDate = new Date(`${input.endDate}T00:00:00`);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 42);
    const month = `${endDate.getMonth() + 1}月`;
    const newTasks = generateEventTemplateTasks({
      eventId,
      eventName: input.name,
      ownerIds: [],
      eventDate: input.endDate,
      template
    }).map((task) => ({
      ...task,
      status: "todo" as const,
      createdAt: getTodayString(),
      updatedAt: getTodayString()
    }));
    const newEvent: Event = {
      id: eventId,
      name: input.name,
      month,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: input.endDate,
      taskIds: newTasks.map((task) => task.id),
      templateId: template.id,
      reviewNotes: []
    };

    setEvents((current) => {
      const nextEvents = [...current, newEvent];
      writeStoredArray(EVENTS_STORAGE_KEY, nextEvents);
      if (dataSource === "cloud") {
        void saveCloudData({ events: nextEvents, tasks: [...newTasks, ...tasks], notes }).catch(() => {
          setActionMessage("雲端保存暫時失敗，資料仍保存在本機瀏覽器。");
        });
      }
      return nextEvents;
    });
    setTasks((current) => {
      const nextTasks = [...newTasks, ...current];
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      return nextTasks;
    });
    setFilter(`event:${eventId}`);
    setSelectedTaskId(newTasks[0]?.id ?? selectedTaskId);
    setActionMessage(`已新增活動「${input.name}」，並產生 ${newTasks.length} 個子任務。`);
  }

  function handleAddReviewNote(eventId: string, note: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, reviewNotes: [...event.reviewNotes, note] } : event
      )
    );
    setActionMessage("已新增活動檢討紀錄。");
  }

  function handleDuplicateEvent(eventId: string) {
    const sourceEvent = events.find((event) => event.id === eventId);
    if (!sourceEvent) return;

    const sourceTasks = tasks.filter((task) => task.eventId === sourceEvent.id);
    const nextEventId = `event-copy-${Date.now()}`;
    const sourceEnd = new Date(`${sourceEvent.endDate}T00:00:00`);
    const nextEnd = new Date(sourceEnd);
    nextEnd.setFullYear(sourceEnd.getFullYear() + 1);
    const nextStart = new Date(`${sourceEvent.startDate}T00:00:00`);
    nextStart.setFullYear(nextStart.getFullYear() + 1);
    const nextName = `${sourceEvent.name}（複製）`;
    const nextTasks = sourceTasks.map((task, index) => {
      const nextDue = new Date(`${task.dueDate}T00:00:00`);
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      return {
        ...task,
        id: `${nextEventId}-task-${index + 1}`,
        title: task.title.replace(sourceEvent.name, nextName),
        eventId: nextEventId,
        status: "todo" as const,
        assignees: [],
        ownerIds: [],
        isBlocked: false,
        dueDate: nextDue.toISOString().slice(0, 10),
        createdAt: getTodayString(),
        updatedAt: getTodayString(),
        comments: [],
        attachments: []
      };
    });
    const nextEvent: Event = {
      ...sourceEvent,
      id: nextEventId,
      name: nextName,
      month: `${nextEnd.getMonth() + 1}月`,
      startDate: nextStart.toISOString().slice(0, 10),
      endDate: nextEnd.toISOString().slice(0, 10),
      taskIds: nextTasks.map((task) => task.id),
      reviewNotes: [`由「${sourceEvent.name}」複製，請依今年狀況調整分工與時程。`]
    };

    setEvents((current) => [...current, nextEvent]);
    setTasks((current) => [...nextTasks, ...current]);
    setFilter(`event:${nextEventId}`);
    setSelectedTaskId(nextTasks[0]?.id ?? selectedTaskId);
    setActionMessage(`已複製「${sourceEvent.name}」成新活動，並產生 ${nextTasks.length} 個待辦任務。`);
  }

  function handleResetLocalData() {
    window.localStorage.removeItem(TASKS_STORAGE_KEY);
    window.localStorage.removeItem(NOTES_STORAGE_KEY);
    window.localStorage.removeItem(EVENTS_STORAGE_KEY);
    setTasks(initialTasks);
    setNotes(stickyNotes);
    setEvents(initialEvents);
    setFilter("all");
    setSelectedTaskId(initialTasks[0]?.id ?? "");
    setActionMessage("已重置本機資料，回到範例初始狀態。");
  }

  return (
    <main className="min-h-screen bg-rice">
      <div className="grid min-h-screen lg:grid-cols-[290px_1fr]">
        <aside className="border-r border-forest-100 bg-forest-900 p-5 text-white">
          <div className="rounded-lg bg-forest-700 p-4">
            <p className="text-lg font-bold text-forest-100">學校教導處</p>
            <h1 className="mt-2 text-4xl font-black leading-tight">教導處任務地圖 v2</h1>
          </div>
          <div className="mt-5 rounded-lg bg-rice p-4 text-ink">
            <p className="text-lg font-black text-forest-800">目前模式</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className={`rounded-md px-3 py-3 text-lg font-black ${
                  currentMode === "director" ? "bg-forest-700 text-white" : "bg-white text-ink"
                }`}
                onClick={() => setCurrentMode("director")}
              >
                主任端
              </button>
              <button
                className={`rounded-md px-3 py-3 text-lg font-black ${
                  currentMode === "teacher" ? "bg-forest-700 text-white" : "bg-white text-ink"
                }`}
                onClick={() => setCurrentMode("teacher")}
              >
                教師端
              </button>
            </div>
            {currentMode === "teacher" && (
              <select
                className="mt-3 w-full rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-black"
                value={activeTeacherId}
                onChange={(event) => setActiveTeacherId(event.target.value)}
                aria-label="選擇教師端示範教師"
              >
                {teachers
                  .filter((teacher) => teacher.role !== "主任")
                  .map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
          <nav className="mt-6 space-y-2">
            {(currentMode === "director" ? navItems : [["我的任務", "teacher-portal"]]).map(([label, target]) => (
              <a
                key={label}
                href={`#${target}`}
                className="block rounded-md px-4 py-3 text-xl font-bold text-forest-50 hover:bg-forest-700"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-6 rounded-lg bg-rice p-4 text-ink">
            <p className="text-lg font-bold">示範教師端</p>
            <p className="mt-1 text-2xl font-black">{activeTeacher.name}</p>
          </div>
          <div className="mt-4 rounded-lg bg-forest-700 p-4">
            <p className="text-lg font-bold text-forest-50">本機資料</p>
            <p className="mt-1 text-base font-bold text-forest-100">
              {dataSource === "cloud"
                ? "目前已連接 Supabase，資料會同步到雲端。"
                : "操作會自動保存在這台電腦的瀏覽器。"}
            </p>
            <button
              className="mt-3 w-full rounded-md bg-rice px-4 py-2 text-base font-black text-ink"
              onClick={handleResetLocalData}
            >
              重置本機資料
            </button>
          </div>
        </aside>

        <div className="p-5 lg:p-8">
          <header className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-warm p-5 shadow-soft xl:flex-row xl:items-center">
            <div>
              <p className="text-xl font-bold text-forest-700">
                {currentMode === "director" ? "優先順序 · 畫面決策 · 教師減壓" : "只看自己的任務 · 少壓力 · 好更新"}
              </p>
              <h2 className="mt-2 text-5xl font-black leading-tight text-ink">
                {currentMode === "director"
                  ? "教導處運作中心（Action First Dashboard）"
                  : "我的任務"}
              </h2>
            </div>
            <div className="grid gap-3 xl:min-w-[540px]">
              <CommandBar
                tasks={tasks}
                teachers={teachers}
                onOpenTask={setSelectedTaskId}
                onFilterTeacher={(teacherId) => setFilter(`teacher:${teacherId}`)}
                onAssignMode={() => setFilter("unassigned")}
              />
              <div className="rounded-lg bg-white px-5 py-3 text-right">
                <p className="text-lg font-bold text-stone-600">今日</p>
                <p className="text-3xl font-black text-forest-700">
                  {getTodayString().replaceAll("-", "/")}
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-6">
            {currentMode === "teacher" ? (
              <TeacherPortal
                teacher={activeTeacher}
                tasks={tasks}
                notes={notes}
                teachers={teachers}
                onStatusChange={handleStatusChange}
                onQuickComment={handleQuickComment}
                onToggleNote={handleStickyToggle}
              />
            ) : (
              <>
                <Dashboard
                  tasks={tasks}
                  teachers={teachers}
                  events={events}
                  notes={notes}
                  filter={filter}
                  actionMessage={actionMessage}
                  onFilterChange={setFilter}
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                  onAssign={handleAssign}
                  onOpenTask={setSelectedTaskId}
                  onRemind={handleRemind}
                  onBalanceTasks={handleBalanceTasks}
                  onDeferTask={handleDeferTask}
                />

                <QuickCreatePanel
                  teachers={teachers}
                  templates={savedEventTemplates}
                  onCreateTask={handleCreateTask}
                  onCreateNote={handleCreateNote}
                  onCreateEvent={handleCreateEvent}
                />

                {selectedTask && (
                  <section className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
                    <p className="text-xl font-bold text-forest-700">目前開啟的任務卡</p>
                    <h2 className="text-3xl font-black">{selectedTask.title}</h2>
                    <p className="mt-2 text-lg font-bold text-stone-700">{selectedTask.description}</p>
                  </section>
                )}

                <Timeline events={events} tasks={tasks} />
                <KanbanBoard
                  tasks={visibleTasks}
                  teachers={teachers}
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                  onAssign={handleAssign}
                  onDueDateChange={handleDueDateChange}
                  onQuickComment={handleQuickComment}
                  onRemind={handleRemind}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onOpenTask={setSelectedTaskId}
                />
                <WorkloadPanel teachers={teachers} tasks={tasks} />
                <StickyWall
                  notes={notes}
                  teachers={teachers}
                  onToggle={handleStickyToggle}
                  onConvert={handleConvertSticky}
                  onAssign={handleStickyAssign}
                />
                <TemplatePanel />
                <TeacherHome
                  teacher={activeTeacher}
                  tasks={tasks}
                  teachers={teachers}
                  onStatusChange={handleStatusChange}
                />
                <ActivityDatabase
                  events={events}
                  tasks={tasks}
                  teachers={teachers}
                  onAddReviewNote={handleAddReviewNote}
                  onDuplicateEvent={handleDuplicateEvent}
                  onFilterEvent={(eventId) => setFilter(`event:${eventId}`)}
                />
                <ArchitecturePanel />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
