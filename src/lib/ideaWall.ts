import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export type IdeaColor = "yellow" | "pink" | "blue" | "green" | "purple";
export type IdeaVisibility = "all" | "director" | "teachers";

export type IdeaComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type IdeaNote = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  color: IdeaColor;
  x: number;
  y: number;
  rotation: number;
  visibility: IdeaVisibility;
  targetTeacherIds: string[];
  supportUserIds: string[];
  comments: IdeaComment[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IdeaTopic = {
  title: string;
  archived: boolean;
};

type IdeaNoteRow = {
  id: string;
  title: string | null;
  body: string;
  author_id: string;
  author_name: string;
  color: IdeaColor;
  x: number | null;
  y: number | null;
  rotation: number | null;
  visibility: IdeaVisibility | null;
  target_teacher_ids: string[] | null;
  support_user_ids: string[] | null;
  comments: IdeaComment[] | null;
  pinned: boolean | null;
  archived: boolean | null;
  created_at: string;
  updated_at: string;
};

type IdeaTopicRow = {
  id: string;
  title: string;
  archived: boolean | null;
};

export const ideaWallStorageKey = "jiao-dao-task-map:idea-wall:v1";
export const ideaTopicStorageKey = "jiao-dao-task-map:idea-wall-topic:v1";
export const ideaTopicUpdatedEvent = "idea-wall-topic-updated";
export const defaultIdeaTopicTitle = "\u7562\u696d\u5178\u79ae\u4e3b\u984c\u52df\u96c6";

export const defaultIdeaTopic: IdeaTopic = {
  title: defaultIdeaTopicTitle,
  archived: false
};

export function isIdeaWallCloudAvailable() {
  return isSupabaseConfigured;
}

function fromIdeaRow(row: IdeaNoteRow): IdeaNote {
  return {
    id: row.id,
    title: row.title ?? "",
    body: row.body,
    authorId: row.author_id,
    authorName: row.author_name,
    color: row.color ?? "yellow",
    x: row.x ?? 80,
    y: row.y ?? 80,
    rotation: row.rotation ?? 0,
    visibility: row.visibility ?? "all",
    targetTeacherIds: row.target_teacher_ids ?? [],
    supportUserIds: row.support_user_ids ?? [],
    comments: row.comments ?? [],
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    createdAt: row.created_at?.slice(0, 10),
    updatedAt: row.updated_at?.slice(0, 10)
  };
}

function toIdeaRow(idea: IdeaNote): IdeaNoteRow {
  return {
    id: idea.id,
    title: idea.title || null,
    body: idea.body,
    author_id: idea.authorId,
    author_name: idea.authorName,
    color: idea.color,
    x: idea.x,
    y: idea.y,
    rotation: idea.rotation,
    visibility: idea.visibility,
    target_teacher_ids: idea.targetTeacherIds,
    support_user_ids: idea.supportUserIds,
    comments: idea.comments,
    pinned: idea.pinned,
    archived: idea.archived,
    created_at: idea.createdAt,
    updated_at: idea.updatedAt
  };
}

export async function loadIdeaWallCloudData() {
  if (!supabase) return null;

  const [topicResult, ideasResult] = await Promise.all([
    supabase.from("idea_wall_topics").select("*").eq("id", "default").maybeSingle(),
    supabase.from("idea_wall_notes").select("*").order("updated_at", { ascending: false })
  ]);

  if (topicResult.error || ideasResult.error) {
    throw topicResult.error ?? ideasResult.error;
  }

  const topicRow = topicResult.data as IdeaTopicRow | null;
  const topic: IdeaTopic = topicRow
    ? { title: topicRow.title, archived: Boolean(topicRow.archived) }
    : defaultIdeaTopic;
  const ideas = ((ideasResult.data ?? []) as IdeaNoteRow[]).map(fromIdeaRow);

  return { topic, ideas };
}

export async function saveIdeaTopicCloud(topic: IdeaTopic) {
  if (!supabase) return;

  const { error } = await supabase.from("idea_wall_topics").upsert(
    {
      id: "default",
      title: topic.title,
      archived: topic.archived,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function upsertIdeaCloud(idea: IdeaNote) {
  if (!supabase) return;

  const { error } = await supabase.from("idea_wall_notes").upsert(toIdeaRow(idea), { onConflict: "id" });
  if (error) throw error;
}

export async function syncIdeasCloud(ideas: IdeaNote[]) {
  if (!supabase || !ideas.length) return;

  const { error } = await supabase.from("idea_wall_notes").upsert(ideas.map(toIdeaRow), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteIdeaCloud(ideaId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("idea_wall_notes").delete().eq("id", ideaId);
  if (error) throw error;
}
