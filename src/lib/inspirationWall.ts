import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export type InspirationCategory = "teaching" | "admin" | "activity" | "class" | "exhibition" | "other";
export type InspirationTopicStatus = "open" | "archived";
export type InspirationNoteStatus = "active" | "archived";
export type InspirationColor = "yellow" | "pink" | "blue" | "green" | "purple";

export type InspirationTopic = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: InspirationCategory;
  status: InspirationTopicStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type InspirationStickyNote = {
  id: string;
  topicId: string;
  ownerId: string;
  title: string;
  content: string;
  color: InspirationColor;
  x: number;
  y: number;
  rotation: number;
  status: InspirationNoteStatus;
  createdAt: string;
  updatedAt: string;
};

type TopicRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: InspirationCategory | null;
  status: InspirationTopicStatus | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type NoteRow = {
  id: string;
  topic_id: string;
  owner_id: string;
  title: string | null;
  content: string;
  color: InspirationColor | null;
  x: number | null;
  y: number | null;
  rotation: number | null;
  status: InspirationNoteStatus | null;
  created_at: string;
  updated_at: string;
};

export const inspirationTopicsStoragePrefix = "jiao-dao-task-map:inspiration-topics:v1:";
export const inspirationNotesStoragePrefix = "jiao-dao-task-map:inspiration-notes:v1:";

export function isInspirationCloudAvailable() {
  return isSupabaseConfigured;
}

function fromTopicRow(row: TopicRow): InspirationTopic {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "other",
    status: row.status ?? "open",
    createdAt: row.created_at?.slice(0, 10),
    updatedAt: row.updated_at?.slice(0, 10),
    archivedAt: row.archived_at ?? undefined
  };
}

function toTopicRow(topic: InspirationTopic): TopicRow {
  return {
    id: topic.id,
    owner_id: topic.ownerId,
    title: topic.title,
    description: topic.description || null,
    category: topic.category,
    status: topic.status,
    created_at: topic.createdAt,
    updated_at: topic.updatedAt,
    archived_at: topic.archivedAt ?? null
  };
}

function fromNoteRow(row: NoteRow): InspirationStickyNote {
  return {
    id: row.id,
    topicId: row.topic_id,
    ownerId: row.owner_id,
    title: row.title ?? "",
    content: row.content,
    color: row.color ?? "yellow",
    x: row.x ?? 90,
    y: row.y ?? 90,
    rotation: row.rotation ?? 0,
    status: row.status ?? "active",
    createdAt: row.created_at?.slice(0, 10),
    updatedAt: row.updated_at?.slice(0, 10)
  };
}

function toNoteRow(note: InspirationStickyNote): NoteRow {
  return {
    id: note.id,
    topic_id: note.topicId,
    owner_id: note.ownerId,
    title: note.title || null,
    content: note.content,
    color: note.color,
    x: note.x,
    y: note.y,
    rotation: note.rotation,
    status: note.status,
    created_at: note.createdAt,
    updated_at: note.updatedAt
  };
}

export async function loadInspirationCloud(ownerId: string) {
  if (!supabase) return null;

  const [topicsResult, notesResult] = await Promise.all([
    supabase.from("inspiration_topics").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    supabase.from("inspiration_notes").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false })
  ]);

  if (topicsResult.error || notesResult.error) {
    throw topicsResult.error ?? notesResult.error;
  }

  return {
    topics: ((topicsResult.data ?? []) as TopicRow[]).map(fromTopicRow),
    notes: ((notesResult.data ?? []) as NoteRow[]).map(fromNoteRow)
  };
}

export async function upsertInspirationTopicCloud(topic: InspirationTopic) {
  if (!supabase) return;
  const { error } = await supabase.from("inspiration_topics").upsert(toTopicRow(topic), { onConflict: "id" });
  if (error) throw error;
}

export async function upsertInspirationNoteCloud(note: InspirationStickyNote) {
  if (!supabase) return;
  const { error } = await supabase.from("inspiration_notes").upsert(toNoteRow(note), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteInspirationTopicCloud(topicId: string, ownerId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("inspiration_topics").delete().eq("id", topicId).eq("owner_id", ownerId);
  if (error) throw error;
}

export async function deleteInspirationNoteCloud(noteId: string, ownerId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("inspiration_notes").delete().eq("id", noteId).eq("owner_id", ownerId);
  if (error) throw error;
}

export async function syncInspirationCloud(topics: InspirationTopic[], notes: InspirationStickyNote[]) {
  if (!supabase) return;
  const writes = [];
  if (topics.length) writes.push(supabase.from("inspiration_topics").upsert(topics.map(toTopicRow), { onConflict: "id" }));
  if (notes.length) writes.push(supabase.from("inspiration_notes").upsert(notes.map(toNoteRow), { onConflict: "id" }));
  const results = await Promise.all(writes);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
}

export function mergeInspirationTopics(localTopics: InspirationTopic[], cloudTopics: InspirationTopic[], ownerId: string) {
  const byId = new Map<string, InspirationTopic>();
  [...cloudTopics, ...localTopics].forEach((topic) => {
    const normalized = { ...topic, ownerId: topic.ownerId || ownerId };
    const existing = byId.get(normalized.id);
    if (!existing || normalized.updatedAt.localeCompare(existing.updatedAt) >= 0) byId.set(normalized.id, normalized);
  });
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function mergeInspirationNotes(localNotes: InspirationStickyNote[], cloudNotes: InspirationStickyNote[], ownerId: string) {
  const byId = new Map<string, InspirationStickyNote>();
  [...cloudNotes, ...localNotes].forEach((note) => {
    const normalized = { ...note, ownerId: note.ownerId || ownerId };
    const existing = byId.get(normalized.id);
    if (!existing || normalized.updatedAt.localeCompare(existing.updatedAt) >= 0) byId.set(normalized.id, normalized);
  });
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
