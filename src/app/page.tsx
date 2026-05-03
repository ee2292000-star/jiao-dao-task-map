"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { ActivityDatabase } from "@/components/ActivityDatabase";
import { CommandBar } from "@/components/CommandBar";
import { Dashboard } from "@/components/Dashboard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { QuickCreatePanel } from "@/components/QuickCreatePanel";
import { StickyWall } from "@/components/StickyWall";
import { TeacherHome } from "@/components/TeacherHome";
import { TeacherManagement } from "@/components/TeacherManagement";
import { TeacherPortal } from "@/components/TeacherPortal";
import { TemplatePanel } from "@/components/TemplatePanel";
import { Timeline } from "@/components/Timeline";
import { WorkloadPanel } from "@/components/WorkloadPanel";
import { events as initialEvents, initialTasks, stickyNotes, teachers as initialTeachers } from "@/lib/initialData";
import { balanceTaskAssignments } from "@/lib/decisionSupport";
import { getDaysLeft } from "@/lib/reminders";
import { generateEventTemplateTasks, savedEventTemplates } from "@/lib/templates";
import { deleteCloudTask, deleteCloudTeacher, isSupabaseConfigured, loadCloudData, saveCloudData } from "@/lib/supabaseClient";
import type { Event, StickyNote, Task, Teacher, TeacherAccount } from "@/lib/types";
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
  ["教師端預覽", "teacher"],
  ["活動資料庫", "archive"],
  ["系統設定", "settings"]
];

const TASKS_STORAGE_KEY = "jiao-dao-task-map:tasks:v1";
const NOTES_STORAGE_KEY = "jiao-dao-task-map:sticky-notes:v1";
const EVENTS_STORAGE_KEY = "jiao-dao-task-map:events:v1";
const TEACHERS_STORAGE_KEY = "jiao-dao-task-map:teachers:v1";

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

function teacherAvatar(name: string) {
  return name.trim().slice(0, 1) || "師";
}

function normalizeTeacher(teacher: Partial<Teacher>): Teacher {
  const name = teacher.name ?? "未命名教師";
  return {
    id: teacher.id ?? `teacher-${Date.now()}`,
    name,
    role: teacher.role ?? "教師",
    avatar: teacher.avatar ?? teacherAvatar(name),
    teachingScope: teacher.teachingScope ?? "",
    enabled: teacher.enabled ?? true
  };
}

function teacherFromAccount(account: TeacherAccount): Teacher | null {
  if (account.role !== "teacher" || !account.enabled) return null;
  const name = account.name || "未命名教師";
  return normalizeTeacher({
    id: account.teacherId || `teacher-${account.id}`,
    name,
    role: "教師",
    avatar: teacherAvatar(name),
    enabled: account.enabled
  });
}

function isLegacySeededTeacher(teacher: Partial<Teacher>) {
  return ["t1", "t2", "t3", "t4", "t5"].includes(teacher.id ?? "");
}

function isLegacySeededTask(task: Partial<Task>) {
  return (
    task.id?.startsWith("task-weekly-") ||
    task.id?.startsWith("event-graduation-task-") ||
    task.eventId === "event-graduation" ||
    task.eventId === "event-anniversary" ||
    task.eventId === "event-exhibition"
  );
}

function isLegacySeededEvent(event: Partial<Event>) {
  return ["event-graduation", "event-anniversary", "event-exhibition"].includes(event.id ?? "");
}

function isLegacySeededNote(note: Partial<StickyNote>) {
  return note.id?.startsWith("note-") || note.eventId === "event-graduation";
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
    assignedTo: task.assignedTo ?? ownerIds[0] ?? assignees[0],
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
  return storedTasks.filter((task) => !isLegacySeededTask(task)).map(normalizeTask);
}

function mergeStoredTeachers(storedTeachers: Teacher[] | null) {
  if (!storedTeachers) return initialTeachers;
  return storedTeachers.filter((teacher) => !isLegacySeededTeacher(teacher)).map(normalizeTeacher);
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
  return storedEvents.filter((event) => !isLegacySeededEvent(event)).map(normalizeEvent);
}

function mergeUniqueById<T extends { id: string }>(primary: T[], secondary: T[]) {
  const seen = new Set(primary.map((item) => item.id));
  return [...primary, ...secondary.filter((item) => !seen.has(item.id))];
}

function getTeacherMergeKey(teacher: Partial<Teacher>) {
  return (teacher.name ?? "").trim().toLocaleLowerCase() || teacher.id || "";
}

function getTeacherIdMap(teachers: Teacher[]) {
  const keyToCanonicalId = new Map<string, string>();
  const idMap = new Map<string, string>();

  teachers.forEach((teacher) => {
    const key = getTeacherMergeKey(teacher);
    if (!keyToCanonicalId.has(key)) keyToCanonicalId.set(key, teacher.id);
    idMap.set(teacher.id, keyToCanonicalId.get(key) ?? teacher.id);
  });

  return idMap;
}

function dedupeTeachersByName(teachers: Teacher[]) {
  const byName = new Map<string, Teacher>();

  teachers.forEach((teacher) => {
    const normalizedTeacher = normalizeTeacher(teacher);
    const key = getTeacherMergeKey(normalizedTeacher);
    const existing = byName.get(key);

    if (!existing) {
      byName.set(key, normalizedTeacher);
      return;
    }

    byName.set(key, {
      ...existing,
      role: existing.role || normalizedTeacher.role,
      avatar: existing.avatar || normalizedTeacher.avatar,
      teachingScope: existing.teachingScope || normalizedTeacher.teachingScope,
      enabled: existing.enabled !== false || normalizedTeacher.enabled !== false
    });
  });

  return Array.from(byName.values());
}

function remapTaskTeacherIds(tasks: Task[], teacherIdMap: Map<string, string>) {
  return tasks.map((task) => {
    const ownerIds = Array.from(new Set(task.ownerIds.map((id) => teacherIdMap.get(id) ?? id)));
    const assignees = Array.from(new Set(task.assignees.map((id) => teacherIdMap.get(id) ?? id)));
    const assignedTo = task.assignedTo ? teacherIdMap.get(task.assignedTo) ?? task.assignedTo : ownerIds[0];

    return {
      ...task,
      ownerIds,
      assignees,
      assignedTo
    };
  });
}

function compactRosterData(teachers: Teacher[], tasks: Task[]) {
  const teacherIdMap = getTeacherIdMap(teachers);
  return {
    teachers: dedupeTeachersByName(teachers),
    tasks: remapTaskTeacherIds(tasks, teacherIdMap)
  };
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
  if (filter === "unassigned") return "尚未指派";
  if (filter === "comments") return "有留言";
  if (filter === "confirm") return "待確認";
  if (filter.startsWith("teacher:")) return "教師任務篩選";
  if (filter.startsWith("event:")) return "活動任務篩選";
  return "自訂篩選";
}

function getAssignedTeacherId(task: Task) {
  return task.assignedTo ?? task.ownerIds[0] ?? task.assignees[0] ?? "";
}

function taskBelongsToTeacher(task: Task, teacherIds: string[]) {
  return teacherIds.some(
    (teacherId) =>
      task.assignedTo === teacherId ||
      task.ownerIds.includes(teacherId) ||
      task.assignees.includes(teacherId)
  );
}

function getTeacherIdentityIds(userId: string, userName: string, teachers: Teacher[]) {
  const ids = new Set([userId]);
  teachers
    .filter((teacher) => teacher.name === userName)
    .forEach((teacher) => ids.add(teacher.id));
  return Array.from(ids);
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<StickyNote[]>(stickyNotes);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [currentMode, setCurrentMode] = useState<"director" | "teacher">("director");
  const [activeTeacherId, setActiveTeacherId] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0]?.id ?? "");
  const [actionMessage, setActionMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<"cloud" | "local">("local");
  const { data: session, status: sessionStatus } = useSession();
  const currentUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? session.user.email ?? "使用者",
        username: session.user.email ?? "",
        role: session.user.role
      }
    : null;
  const isAuthChecked = sessionStatus !== "loading";
  const visibleTeachers = useMemo(() => dedupeTeachersByName(teachers), [teachers]);

  const activeTeacher = useMemo(
    () => {
      const found = visibleTeachers.find(
        (teacher) =>
          teacher.enabled !== false &&
          (teacher.id === activeTeacherId ||
            (currentUser?.role === "teacher" && teacher.name === currentUser.name))
      );
      if (found) return found;
      if (currentUser?.role === "teacher") {
        return {
          id: currentUser.id,
          name: currentUser.name,
          role: "教師",
          avatar: teacherAvatar(currentUser.name),
          enabled: true
        };
      }
      return undefined;
    },
    [activeTeacherId, currentUser, visibleTeachers]
  );
  const currentTeacherIds = useMemo(
    () =>
      currentUser?.role === "teacher"
        ? getTeacherIdentityIds(currentUser.id, currentUser.name, visibleTeachers)
        : [],
    [currentUser, visibleTeachers]
  );
  const permittedTasks =
    currentUser?.role === "teacher"
      ? tasks.filter((task) => taskBelongsToTeacher(task, currentTeacherIds))
      : tasks;
  const effectiveMode = currentUser?.role === "teacher" ? "teacher" : currentMode;
  const visibleTasks = filterTasks(permittedTasks, filter);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      window.location.href = "/login";
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (currentUser?.role !== "teacher") return;
    setCurrentMode("teacher");
    setActiveTeacherId(currentUser.id);
    setFilter("all");
  }, [currentUser]);

  useEffect(() => {
    async function hydrateData() {
      const storedTasks = readStoredArray<Task>(TASKS_STORAGE_KEY);
      const storedNotes = readStoredArray<StickyNote>(NOTES_STORAGE_KEY);
      const storedEvents = readStoredArray<Event>(EVENTS_STORAGE_KEY);
      const storedTeachers = readStoredArray<Teacher>(TEACHERS_STORAGE_KEY);
      const localTasks = mergeStoredTasks(storedTasks);
      const localEvents = mergeStoredEvents(storedEvents);
      const localNotes = storedNotes ? storedNotes.filter((note) => !isLegacySeededNote(note)) : stickyNotes;
      const localTeachers = mergeStoredTeachers(storedTeachers);
      const hasLocalData = Boolean(storedTasks || storedNotes || storedEvents || storedTeachers);

      if (isSupabaseConfigured) {
        try {
          const cloudData = await loadCloudData();
          if (cloudData) {
            const hasCloudData = Boolean(
              cloudData.teachers.length || cloudData.tasks.length || cloudData.events.length || cloudData.notes.length
            );
            const cloudTeachers = hasCloudData
              ? cloudData.teachers.filter((teacher) => !isLegacySeededTeacher(teacher))
              : initialTeachers;
            const cloudTasks = hasCloudData
              ? cloudData.tasks.filter((task) => !isLegacySeededTask(task))
              : initialTasks;
            const cloudEvents = hasCloudData
              ? cloudData.events.filter((event) => !isLegacySeededEvent(event))
              : initialEvents;
            const cloudNotes = hasCloudData
              ? cloudData.notes.filter((note) => !isLegacySeededNote(note))
              : stickyNotes;
            const mergedTeachers = hasLocalData ? mergeUniqueById(localTeachers, cloudTeachers) : cloudTeachers;
            const mergedTasks = hasLocalData ? mergeUniqueById(localTasks, cloudTasks) : cloudTasks;
            const { teachers: nextTeachers, tasks: nextTasks } = compactRosterData(mergedTeachers, mergedTasks);
            const nextEvents = hasLocalData ? mergeUniqueById(localEvents, cloudEvents) : cloudEvents;
            const nextNotes = hasLocalData ? mergeUniqueById(localNotes, cloudNotes) : cloudNotes;

            setTeachers(nextTeachers);
            setTasks(nextTasks);
            setEvents(nextEvents);
            setNotes(nextNotes);
            setSelectedTaskId(nextTasks[0]?.id ?? "");
            setActiveTeacherId((current) =>
              currentUser?.role === "teacher"
                ? currentUser.id
                : current || (nextTeachers.find((teacher) => teacher.enabled !== false)?.id ?? "")
            );
            setDataSource("cloud");
            setActionMessage("已連線 Supabase，資料同步完成。");
            setIsHydrated(true);

            await saveCloudData({
              teachers: nextTeachers,
              events: nextEvents,
              tasks: nextTasks,
              notes: nextNotes
            });
            setActionMessage(
              hasLocalData ? "已連線 Supabase，並同步本機資料。" : "已連線 Supabase，資料同步完成。"
            );
            return;
          }
        } catch {
          setActionMessage("雲端資料暫時無法同步，已改用本機資料。");
        }
      }

      const { teachers: nextLocalTeachers, tasks: nextLocalTasks } = compactRosterData(localTeachers, localTasks);
      setTasks(nextLocalTasks);
      setEvents(localEvents);
      setNotes(localNotes);
      setTeachers(nextLocalTeachers);
      setSelectedTaskId(nextLocalTasks[0]?.id ?? "");
      setActiveTeacherId((current) =>
        currentUser?.role === "teacher"
          ? currentUser.id
          : current || (nextLocalTeachers.find((teacher) => teacher.enabled !== false)?.id ?? "")
      );
      setDataSource("local");
      setIsHydrated(true);
      if (hasLocalData) setActionMessage("已載入本機資料。");
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
    if (!isHydrated) return;
    window.localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
  }, [isHydrated, teachers]);

  useEffect(() => {
    if (!isHydrated || currentUser?.role !== "admin") return;

    async function syncTeacherAccountsToRoster() {
      try {
        const response = await fetch("/api/teacher-accounts");
        const result = await response.json();
        if (!response.ok) return;

        const accountTeachers = ((result.accounts ?? []) as TeacherAccount[])
          .map(teacherFromAccount)
          .filter(Boolean) as Teacher[];

        if (!accountTeachers.length) return;

        setTeachers((current) => {
          const nextTeachers = dedupeTeachersByName(mergeUniqueById(current, accountTeachers));
          if (nextTeachers.length === current.length) return current;
          writeStoredArray(TEACHERS_STORAGE_KEY, nextTeachers);
          if (dataSource === "cloud") {
            void saveCloudData({ teachers: nextTeachers, events, tasks, notes }).catch(() => {
              setActionMessage("雲端同步暫時失敗，已保留本機資料。");
            });
          }
          return nextTeachers;
        });
      } catch {
        // The roster still works from local/cloud teachers; account sync is only a convenience bridge.
      }
    }

    void syncTeacherAccountsToRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, isHydrated]);

  useEffect(() => {
    if (!isHydrated || dataSource !== "cloud") return;

    const timeout = window.setTimeout(() => {
      void saveCloudData({ teachers, events, tasks, notes }).catch(() => {
        setActionMessage("雲端同步暫時失敗，已保留本機資料。");
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [dataSource, events, isHydrated, notes, tasks, teachers]);

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
              assignedTo: ownerId || undefined,
              updatedAt: getTodayString()
            }
          : task
      )
    );
    setActionMessage(ownerId ? "已更新任務負責人。" : "已改為尚未指派。");
  }

  function handleDueDateChange(taskId: string, dueDate: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, dueDate, updatedAt: getTodayString() } : task
      )
    );
    setActionMessage("截止日期已更新。");
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
              assignedTo: changes.assignedTo ?? changes.ownerIds?.[0] ?? changes.assignees?.[0] ?? task.assignedTo,
              updatedAt: getTodayString()
            }
          : task
      );
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      if (dataSource === "cloud") {
        void saveCloudData({ teachers, events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTasks;
    });
    setSelectedTaskId(taskId);
    setActionMessage("任務已更新，相關區塊已同步。");
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
          setActionMessage("雲端刪除暫時失敗，已先更新本機資料。");
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
    setActionMessage("任務已刪除。");
  }

  function handleCreateTeacher(input: {
    id?: string;
    name: string;
    role: string;
    teachingScope: string;
    enabled: boolean;
    avatar?: string;
  }) {
    const newTeacher = normalizeTeacher({
      id: input.id ?? `teacher-${Date.now()}`,
      name: input.name,
      role: input.role,
      teachingScope: input.teachingScope,
      enabled: input.enabled,
      avatar: input.avatar ?? teacherAvatar(input.name)
    });
    setTeachers((current) => {
      const existing = current.find(
        (teacher) => getTeacherMergeKey(teacher) === getTeacherMergeKey(newTeacher)
      );
      const nextTeachers = existing
        ? current.map((teacher) =>
            teacher.id === existing.id
              ? {
                  ...teacher,
                  ...newTeacher,
                  id: teacher.id,
                  teachingScope: newTeacher.teachingScope || teacher.teachingScope
                }
              : teacher
          )
        : [newTeacher, ...current];
      writeStoredArray(TEACHERS_STORAGE_KEY, nextTeachers);
      if (dataSource === "cloud") {
        void saveCloudData({ teachers: nextTeachers, events, tasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTeachers;
    });
    if (!activeTeacherId && newTeacher.enabled !== false) setActiveTeacherId(newTeacher.id);
    setActionMessage("已新增教師，任務指派選單已同步。");
  }

  function handleUpdateTeacher(
    teacherId: string,
    input: { name: string; role: string; teachingScope: string; enabled: boolean }
  ) {
    setTeachers((current) => {
      const nextTeachers = current.map((teacher) =>
        teacher.id === teacherId
          ? normalizeTeacher({
              ...teacher,
              name: input.name,
              role: input.role,
              teachingScope: input.teachingScope,
              enabled: input.enabled,
              avatar: teacherAvatar(input.name)
            })
          : teacher
      );
      writeStoredArray(TEACHERS_STORAGE_KEY, nextTeachers);
      if (dataSource === "cloud") {
        void saveCloudData({ teachers: nextTeachers, events, tasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTeachers;
    });
    if (!input.enabled && activeTeacherId === teacherId) {
      setActiveTeacherId(teachers.find((teacher) => teacher.id !== teacherId && teacher.enabled !== false)?.id ?? "");
    }
    setActionMessage("教師資料已更新。");
  }

  function handleDeleteTeacher(teacherId: string) {
    if (!window.confirm("確定要刪除此教師資料嗎？原本指派給他的任務會改為尚未指派。")) return;

    setTeachers((current) => {
      const nextTeachers = current.filter((teacher) => teacher.id !== teacherId);
      writeStoredArray(TEACHERS_STORAGE_KEY, nextTeachers);
      if (dataSource === "cloud") {
        void deleteCloudTeacher(teacherId).catch(() => {
          setActionMessage("雲端刪除教師暫時失敗，已先更新本機資料。");
        });
      }
      return nextTeachers;
    });
    setTasks((current) => {
      const nextTasks = current.map((task) => {
        if (!task.ownerIds.includes(teacherId) && !task.assignees.includes(teacherId)) return task;
        const ownerIds = task.ownerIds.filter((id) => id !== teacherId);
        const assignees = task.assignees.filter((id) => id !== teacherId);
        return {
          ...task,
          ownerIds,
          assignees,
          assignedTo: task.assignedTo === teacherId ? ownerIds[0] : task.assignedTo,
          updatedAt: getTodayString()
        };
      });
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      return nextTasks;
    });
    setNotes((current) => {
      const nextNotes = current.map((note) =>
        note.assigneeId === teacherId ? { ...note, assigneeId: undefined } : note
      );
      writeStoredArray(NOTES_STORAGE_KEY, nextNotes);
      return nextNotes;
    });
    if (activeTeacherId === teacherId) {
      setActiveTeacherId(teachers.find((teacher) => teacher.id !== teacherId && teacher.enabled !== false)?.id ?? "");
    }
    setActionMessage("教師已刪除，相關任務已改為尚未指派。");
  }

  function handleQuickComment(taskId: string, body: string) {
    const authorId = currentUser?.role === "teacher" ? activeTeacher?.id ?? currentUser.id : currentUser?.id ?? "";
    setTasks((current) => {
      const nextTasks = current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updatedAt: getTodayString(),
              comments: [
                ...task.comments,
                {
                  id: `comment-${Date.now()}`,
                  authorId,
                  body,
                  createdAt: getTodayString()
                }
              ]
            }
          : task
      );
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      if (dataSource === "cloud") {
        void saveCloudData({ teachers, events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTasks;
    });
    setActionMessage("已新增留言。");
  }

  function handleUpdateComment(taskId: string, commentId: string, body: string) {
    const nextBody = body.trim();
    if (!nextBody) return;

    setTasks((current) => {
      const nextTasks = current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updatedAt: getTodayString(),
              comments: task.comments.map((comment) =>
                comment.id === commentId ? { ...comment, body: nextBody } : comment
              )
            }
          : task
      );
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      if (dataSource === "cloud") {
        void saveCloudData({ teachers, events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTasks;
    });
    setActionMessage("留言已更新。");
  }

  function handleDeleteComment(taskId: string, commentId: string) {
    setTasks((current) => {
      const nextTasks = current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updatedAt: getTodayString(),
              comments: task.comments.filter((comment) => comment.id !== commentId)
            }
          : task
      );
      writeStoredArray(TASKS_STORAGE_KEY, nextTasks);
      if (dataSource === "cloud") {
        void saveCloudData({ teachers, events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTasks;
    });
    setActionMessage("留言已刪除。");
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
    setActionMessage("已將截止日延後 2 天。");
  }

  function handleBalanceTasks() {
    setTasks((current) => balanceTaskAssignments(current, visibleTeachers));
    setActionMessage("已依目前負荷重新平均分配任務。");
  }

  function handleStickyToggle(noteId: string) {
    setNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, done: !note.done } : note))
    );
    setActionMessage("便利貼狀態已更新。");
  }

  function handleStickyAssign(noteId: string, teacherId: string) {
    setNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, assigneeId: teacherId } : note))
    );
    setActionMessage("便利貼已更新指派對象。");
  }

  function handleConvertSticky(noteId: string) {
    const note = notes.find((item) => item.id === noteId);
    if (!note || note.convertedTaskId) return;

    const taskId = `task-from-${note.id}`;
    const newTask: Task = {
      id: taskId,
      title: `便利貼任務：${note.body}`,
      description: "由共筆便利貼轉為正式任務，可再補充說明與留言。",
      assignees: note.assigneeId ? [note.assigneeId] : [],
      ownerIds: note.assigneeId ? [note.assigneeId] : [],
      assignedTo: note.assigneeId,
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
      description: input.description || "快速新增任務，可稍後補充說明與留言。",
      assignees: input.assigneeId ? [input.assigneeId] : [],
      ownerIds: input.assigneeId ? [input.assigneeId] : [],
      assignedTo: input.assigneeId || undefined,
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
        void saveCloudData({ teachers, events, tasks: nextTasks, notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextTasks;
    });
    setSelectedTaskId(taskId);
    setActionMessage(
      taskMatchesFilter(newTask, filter)
        ? "任務已新增，並同步到任務看板。"
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
        void saveCloudData({ teachers, events, tasks, notes: nextNotes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
        });
      }
      return nextNotes;
    });
    setActionMessage("已新增便利貼，必要時可轉為正式任務。");
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
        void saveCloudData({ teachers, events: nextEvents, tasks: [...newTasks, ...tasks], notes }).catch(() => {
          setActionMessage("雲端同步暫時失敗，已保留本機資料。");
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
    setActionMessage(`已新增活動「${input.name}」，並產生 ${newTasks.length} 筆任務。`);
  }

  function handleAddReviewNote(eventId: string, note: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, reviewNotes: [...event.reviewNotes, note] } : event
      )
    );
    setActionMessage("已新增檢討紀錄。");
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
        assignedTo: undefined,
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
      reviewNotes: [`由「${sourceEvent.name}」複製建立，可作為下一次活動參考。`]
    };

    setEvents((current) => [...current, nextEvent]);
    setTasks((current) => [...nextTasks, ...current]);
    setFilter(`event:${nextEventId}`);
    setSelectedTaskId(nextTasks[0]?.id ?? selectedTaskId);
    setActionMessage(`已複製「${sourceEvent.name}」，並建立 ${nextTasks.length} 筆任務。`);
  }

  function handleResetLocalData() {
    if (!window.confirm("確定要清空所有教師、任務與活動資料嗎？此動作無法復原。")) return;
    window.localStorage.removeItem(TASKS_STORAGE_KEY);
    window.localStorage.removeItem(NOTES_STORAGE_KEY);
    window.localStorage.removeItem(EVENTS_STORAGE_KEY);
    window.localStorage.removeItem(TEACHERS_STORAGE_KEY);
    setTasks([]);
    setNotes([]);
    setEvents([]);
    setTeachers([]);
    setFilter("all");
    setSelectedTaskId("");
    setActiveTeacherId("");
    setActionMessage("本機資料已清空。");
  }

  function handleLogout() {
    void signOut({ callbackUrl: "/login" });
  }

  if (!isAuthChecked || !currentUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-rice p-6 text-ink">
        <div className="rounded-lg bg-white p-6 text-2xl font-black text-forest-800 shadow-soft">
          正在確認登入狀態...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-rice">
      <div className="grid min-h-screen lg:grid-cols-[290px_1fr]">
        <aside className="border-r border-forest-100 bg-forest-900 p-5 text-white">
          <div className="rounded-lg bg-forest-700 p-4">
            <p className="text-lg font-bold text-forest-100">學校教導處</p>
            <h1 className="mt-2 text-4xl font-black leading-tight">教導處任務地圖</h1>
          </div>
          <div className="mt-5 rounded-lg bg-rice p-4 text-ink">
            <p className="text-lg font-black text-forest-800">目前模式</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className={`rounded-md px-3 py-3 text-lg font-black ${
                  effectiveMode === "director" ? "bg-forest-700 text-white" : "bg-white text-ink"
                }`}
                onClick={() => setCurrentMode("director")}
              >
                主任端
              </button>
              <button
                className={`rounded-md px-3 py-3 text-lg font-black ${
                  effectiveMode === "teacher" ? "bg-forest-700 text-white" : "bg-white text-ink"
                }`}
                onClick={() => setCurrentMode("teacher")}
              >
                教師端
              </button>
            </div>
            {effectiveMode === "teacher" && currentUser.role === "admin" && (
              visibleTeachers.filter((teacher) => teacher.enabled !== false).length ? (
                <select
                  className="mt-3 w-full rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-black"
                  value={activeTeacherId}
                  onChange={(event) => setActiveTeacherId(event.target.value)}
                  aria-label="選擇教師端預覽身分"
                >
                  {visibleTeachers
                    .filter((teacher) => teacher.enabled !== false)
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                </select>
              ) : (
                <p className="mt-3 rounded-md bg-rice px-3 py-3 text-base font-black text-ink">
                  尚未建立教師資料
                </p>
              )
            )}
          </div>
          <nav className="mt-6 space-y-2">
            {(effectiveMode === "director" ? navItems : [["我的任務", "teacher-portal"]]).map(([label, target]) => (
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
            <p className="text-lg font-bold">目前登入身分</p>
            <p className="mt-1 text-2xl font-black">{currentUser.name}</p>
            <p className="mt-1 text-base font-black text-forest-800">
              {currentUser.role === "admin" ? "主任" : "教師"}
            </p>
            <button
              className="mt-3 w-full rounded-md bg-forest-700 px-4 py-2 text-base font-black text-white"
              onClick={handleLogout}
            >
              登出
            </button>
          </div>
          <div className="mt-4 rounded-lg bg-forest-700 p-4">
            <p className="text-lg font-bold text-forest-50">資料狀態</p>
            <p className="mt-1 text-base font-bold text-forest-100">
              {dataSource === "cloud"
                ? "目前已連線 Supabase，資料會同步保存。"
                : "目前使用本機資料，適合單機測試。"}
            </p>
            <button
              className="mt-3 w-full rounded-md bg-rice px-4 py-2 text-base font-black text-ink"
              onClick={handleResetLocalData}
            >
              清空本機資料
            </button>
          </div>
        </aside>

        <div className="p-5 lg:p-8">
          <header className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-warm p-5 shadow-soft xl:flex-row xl:items-center">
            <div>
              <p className="text-xl font-bold text-forest-700">
                {effectiveMode === "director" ? "優先順序、決策支援、協作留痕" : "我的任務、低壓提醒、狀態回報"}
              </p>
              <h2 className="mt-2 text-5xl font-black leading-tight text-ink">
                {effectiveMode === "director"
                  ? "教導處運作中心"
                  : "我的任務"}
              </h2>
            </div>
            <div className="grid gap-3 xl:min-w-[540px]">
              {currentUser.role === "admin" && (
                <CommandBar
                  tasks={permittedTasks}
                  teachers={visibleTeachers}
                  onOpenTask={setSelectedTaskId}
                  onFilterTeacher={(teacherId) => setFilter(`teacher:${teacherId}`)}
                  onAssignMode={() => setFilter("unassigned")}
                />
              )}
              <div className="rounded-lg bg-white px-5 py-3 text-right">
                <p className="text-lg font-bold text-stone-600">今日</p>
                <p className="text-3xl font-black text-forest-700">
                  {getTodayString().replaceAll("-", "/")}
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-6">
            {effectiveMode === "teacher" ? (
              activeTeacher ? (
                <TeacherPortal
                  teacher={activeTeacher}
                  teacherIds={currentUser.role === "teacher" ? currentTeacherIds : [activeTeacher.id]}
                  currentUserId={currentUser.role === "teacher" ? activeTeacher.id : currentUser.id}
                  tasks={permittedTasks}
                  notes={notes}
                  teachers={visibleTeachers}
                  onStatusChange={handleStatusChange}
                  onQuickComment={handleQuickComment}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onToggleNote={handleStickyToggle}
                />
              ) : (
                <section className="rounded-lg bg-white p-5 shadow-soft">
                  <p className="text-xl font-black text-forest-700">教師端預覽</p>
                  <h2 className="mt-1 text-4xl font-black text-ink">尚未建立教師資料</h2>
                  <p className="mt-2 text-lg font-bold text-stone-700">
                    請先到系統設定新增教師，之後就能預覽該教師的我的任務。
                  </p>
                </section>
              )
            ) : (
              <>
                <Dashboard
                  tasks={tasks}
                  teachers={visibleTeachers}
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
                  teachers={visibleTeachers}
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
                  teachers={visibleTeachers}
                  currentUserId={currentUser.id}
                  canManageComments={currentUser.role === "admin"}
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                  onAssign={handleAssign}
                  onDueDateChange={handleDueDateChange}
                  onQuickComment={handleQuickComment}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onRemind={handleRemind}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onOpenTask={setSelectedTaskId}
                />
                <WorkloadPanel teachers={visibleTeachers} tasks={tasks} />
                <StickyWall
                  notes={notes}
                  teachers={visibleTeachers}
                  onToggle={handleStickyToggle}
                  onConvert={handleConvertSticky}
                  onAssign={handleStickyAssign}
                />
                <TemplatePanel />
                {activeTeacher && (
                  <TeacherHome
                    teacher={activeTeacher}
                    tasks={tasks}
                    teachers={visibleTeachers}
                    onStatusChange={handleStatusChange}
                  />
                )}
                <ActivityDatabase
                  events={events}
                  tasks={tasks}
                  teachers={visibleTeachers}
                  onAddReviewNote={handleAddReviewNote}
                  onDuplicateEvent={handleDuplicateEvent}
                  onFilterEvent={(eventId) => setFilter(`event:${eventId}`)}
                />
                <TeacherManagement
                  teachers={visibleTeachers}
                  tasks={tasks}
                  onCreateTeacher={handleCreateTeacher}
                  onUpdateTeacher={handleUpdateTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
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

