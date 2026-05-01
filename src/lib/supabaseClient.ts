import { createClient } from "@supabase/supabase-js";
import type { Event, StickyNote, Task } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

function getTodayString() {
  return new Date().toLocaleDateString("sv-SE");
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

function fromTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignees: row.assignees ?? [],
    ownerIds: row.owner_ids ?? [],
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
  return {
    id: row.id,
    eventId: row.event_id ?? "",
    authorId: row.author_id ?? "",
    color: row.color,
    body: row.body,
    assigneeId: row.assignee_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    done: row.done,
    convertedTaskId: row.converted_task_id ?? undefined,
    createdAt: row.created_at?.slice(0, 10) ?? getTodayString()
  };
}

function toStickyNoteRow(note: StickyNote): StickyNoteRow {
  return {
    id: note.id,
    event_id: note.eventId || null,
    author_id: note.authorId || null,
    color: note.color,
    body: note.body,
    assignee_id: note.assigneeId ?? null,
    due_date: note.dueDate ?? null,
    done: note.done,
    converted_task_id: note.convertedTaskId ?? null,
    created_at: note.createdAt,
    updated_at: getTodayString()
  };
}

export async function loadCloudData() {
  if (!supabase) return null;

  const [eventsResult, tasksResult, notesResult] = await Promise.all([
    supabase.from("events").select("*").order("end_date", { ascending: true }),
    supabase.from("tasks").select("*").order("due_date", { ascending: true }),
    supabase.from("sticky_notes").select("*").order("created_at", { ascending: false })
  ]);

  if (eventsResult.error || tasksResult.error || notesResult.error) {
    throw eventsResult.error ?? tasksResult.error ?? notesResult.error;
  }

  const tasks = ((tasksResult.data ?? []) as TaskRow[]).map(fromTaskRow);
  const events = ((eventsResult.data ?? []) as EventRow[]).map(fromEventRow).map((event) => ({
    ...event,
    taskIds: tasks.filter((task) => task.eventId === event.id).map((task) => task.id)
  }));
  const notes = ((notesResult.data ?? []) as StickyNoteRow[]).map(fromStickyNoteRow);

  return { events, tasks, notes };
}

export async function saveCloudData(params: {
  events: Event[];
  tasks: Task[];
  notes: StickyNote[];
}) {
  if (!supabase) return;

  const { error: eventsError } = await supabase
    .from("events")
    .upsert(params.events.map(toEventRow), { onConflict: "id" });
  if (eventsError) throw eventsError;

  const { error: tasksError } = await supabase
    .from("tasks")
    .upsert(params.tasks.map(toTaskRow), { onConflict: "id" });
  if (tasksError) throw tasksError;

  const { error: notesError } = await supabase
    .from("sticky_notes")
    .upsert(params.notes.map(toStickyNoteRow), { onConflict: "id" });
  if (notesError) throw notesError;
}
