import { createClient } from "@supabase/supabase-js";
import type { Event, StickyNote, Task, Teacher } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

function getTodayString() {
  return new Date().toLocaleDateString("sv-SE");
}

type StickyBodyPayload = {
  kind: "sticky-wall";
  title: string;
  body: string;
  status: StickyNote["status"];
};

function parseStickyBody(rawBody: string): StickyBodyPayload {
  try {
    const parsed = JSON.parse(rawBody) as Partial<StickyBodyPayload>;
    if (parsed.kind === "sticky-wall") {
      return {
        kind: "sticky-wall",
        title: parsed.title || "未命名便利貼",
        body: parsed.body || "",
        status: parsed.status === "replied" || parsed.status === "archived" ? parsed.status : "normal"
      };
    }
  } catch {
    // Existing notes are plain text. Keep them readable.
  }

  return {
    kind: "sticky-wall",
    title: rawBody.slice(0, 24) || "未命名便利貼",
    body: rawBody,
    status: "normal"
  };
}

function serializeStickyBody(note: StickyNote) {
  return JSON.stringify({
    kind: "sticky-wall",
    title: note.title || note.body.slice(0, 24) || "未命名便利貼",
    body: note.body,
    status: note.status ?? (note.done ? "archived" : "normal")
  } satisfies StickyBodyPayload);
}

type TaskRow = {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  owner_ids: string[];
  event_id: string | null;
  status: Task["status"];
  priority: Task["priority"];
  is_critical: boolean;
  is_blocked: boolean;
  is_key_task: boolean;
  due_date: string;
  start_date: string | null;
  created_at: string;
  updated_at: string;
  comments: Task["comments"];
  attachments: Task["attachments"];
};

type TeacherRow = {
  id: string;
  name: string;
  role: string;
  avatar: string;
};

type EventRow = {
  id: string;
  name: string;
  month: string;
  start_date: string;
  end_date: string;
  template_id: string | null;
  review_notes: string[];
};

type StickyNoteRow = {
  id: string;
  event_id: string | null;
  author_id: string | null;
  color: StickyNote["color"];
  body: string;
  assignee_id: string | null;
  due_date: string | null;
  done: boolean;
  converted_task_id: string | null;
  created_at: string;
  updated_at: string;
};

function fromTeacherRow(row: TeacherRow): Teacher {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    enabled: true
  };
}

function toTeacherRow(teacher: Teacher): TeacherRow {
  return {
    id: teacher.id,
    name: teacher.name,
    role: teacher.role,
    avatar: teacher.avatar
  };
}

function fromTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignees: row.assignees ?? [],
    ownerIds: row.owner_ids ?? [],
    assignedTo: row.owner_ids?.[0],
    eventId: row.event_id ?? undefined,
    status: row.status,
    priority: row.priority,
    isCritical: row.is_critical,
    isBlocked: row.is_blocked,
    isKeyTask: row.is_key_task,
    dueDate: row.due_date,
    startDate: row.start_date ?? undefined,
    createdAt: row.created_at?.slice(0, 10) ?? getTodayString(),
    updatedAt: row.updated_at?.slice(0, 10) ?? getTodayString(),
    comments: row.comments ?? [],
    attachments: row.attachments ?? []
  };
}

function toTaskRow(task: Task): TaskRow {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignees: task.assignees,
    owner_ids: task.ownerIds,
    event_id: task.eventId ?? null,
    status: task.status,
    priority: task.priority,
    is_critical: task.isCritical,
    is_blocked: task.isBlocked,
    is_key_task: task.isKeyTask ?? task.isCritical,
    due_date: task.dueDate,
    start_date: task.startDate ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    comments: task.comments,
    attachments: task.attachments
  };
}

function fromEventRow(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    month: row.month,
    startDate: row.start_date,
    endDate: row.end_date,
    taskIds: [],
    templateId: row.template_id ?? undefined,
    reviewNotes: row.review_notes ?? []
  };
}

function toEventRow(event: Event): EventRow {
  return {
    id: event.id,
    name: event.name,
    month: event.month,
    start_date: event.startDate,
    end_date: event.endDate,
    template_id: event.templateId ?? null,
    review_notes: event.reviewNotes
  };
}

function fromStickyNoteRow(row: StickyNoteRow): StickyNote {
  const parsedBody = parseStickyBody(row.body ?? "");
  return {
    id: row.id,
    eventId: row.event_id ?? "",
    authorId: row.author_id ?? "",
    title: parsedBody.title,
    color: row.color,
    body: parsedBody.body,
    assigneeId: row.assignee_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    status: row.done ? "archived" : parsedBody.status,
    done: row.done || parsedBody.status === "archived",
    convertedTaskId: row.converted_task_id ?? undefined,
    createdAt: row.created_at?.slice(0, 10) ?? getTodayString(),
    updatedAt: row.updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? getTodayString()
  };
}

function toStickyNoteRow(note: StickyNote): StickyNoteRow {
  return {
    id: note.id,
    event_id: note.eventId || null,
    author_id: note.authorId || null,
    color: note.color,
    body: serializeStickyBody(note),
    assignee_id: note.assigneeId ?? null,
    due_date: note.dueDate ?? null,
    done: note.status === "archived" || note.done,
    converted_task_id: note.convertedTaskId ?? null,
    created_at: note.createdAt,
    updated_at: note.updatedAt ?? getTodayString()
  };
}

export async function loadCloudData() {
  if (!supabase) return null;

  const [teachersResult, eventsResult, tasksResult, notesResult] = await Promise.all([
    supabase.from("teachers").select("*").order("name", { ascending: true }),
    supabase.from("events").select("*").order("end_date", { ascending: true }),
    supabase.from("tasks").select("*").order("due_date", { ascending: true }),
    supabase.from("sticky_notes").select("*").order("created_at", { ascending: false })
  ]);

  if (teachersResult.error || eventsResult.error || tasksResult.error || notesResult.error) {
    throw teachersResult.error ?? eventsResult.error ?? tasksResult.error ?? notesResult.error;
  }

  const teachers = ((teachersResult.data ?? []) as TeacherRow[]).map(fromTeacherRow);
  const tasks = ((tasksResult.data ?? []) as TaskRow[]).map(fromTaskRow);
  const events = ((eventsResult.data ?? []) as EventRow[]).map(fromEventRow).map((event) => ({
    ...event,
    taskIds: tasks.filter((task) => task.eventId === event.id).map((task) => task.id)
  }));
  const notes = ((notesResult.data ?? []) as StickyNoteRow[]).map(fromStickyNoteRow);

  return { teachers, events, tasks, notes };
}

export async function saveCloudData(params: {
  teachers?: Teacher[];
  events: Event[];
  tasks: Task[];
  notes: StickyNote[];
}) {
  if (!supabase) return;

  if (params.teachers) {
    if (params.teachers.length) {
      const { error: teachersError } = await supabase
        .from("teachers")
        .upsert(params.teachers.map(toTeacherRow), { onConflict: "id" });
      if (teachersError) throw teachersError;
    }
  }

  if (params.events.length) {
    const { error: eventsError } = await supabase
      .from("events")
      .upsert(params.events.map(toEventRow), { onConflict: "id" });
    if (eventsError) throw eventsError;
  }

  if (params.tasks.length) {
    const { error: tasksError } = await supabase
      .from("tasks")
      .upsert(params.tasks.map(toTaskRow), { onConflict: "id" });
    if (tasksError) throw tasksError;
  }

  if (params.notes.length) {
    const { error: notesError } = await supabase
      .from("sticky_notes")
      .upsert(params.notes.map(toStickyNoteRow), { onConflict: "id" });
    if (notesError) throw notesError;
  }
}

export async function deleteCloudTask(taskId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function deleteCloudTeacher(teacherId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("teachers").delete().eq("id", teacherId);
  if (error) throw error;
}

export async function deleteCloudStickyNote(noteId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("sticky_notes").delete().eq("id", noteId);
  if (error) throw error;
}
