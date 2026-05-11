import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export type PersonalTodo = {
  id: string;
  ownerId: string;
  title: string;
  note: string;
  content?: string;
  dueDate?: string;
  status: "todo" | "doing" | "done" | "archived";
  color?: "yellow" | "pink" | "blue" | "green" | "purple";
  x?: number;
  y?: number;
  rotation?: number;
  completedAt?: string;
  isPrivate?: boolean;
  createdAt: string;
  updatedAt: string;
};

type PersonalTodoRow = {
  id: string;
  owner_id: string;
  title: string;
  note: string | null;
  content?: string | null;
  due_date: string | null;
  status: PersonalTodo["status"];
  color?: PersonalTodo["color"] | null;
  x?: number | null;
  y?: number | null;
  rotation?: number | null;
  completed_at?: string | null;
  is_private?: boolean | null;
  created_at: string;
  updated_at: string;
};

export const personalTodoStoragePrefix = "jiao-dao-task-map:personal-todos:v1:";

export function isPersonalTodoCloudAvailable() {
  return isSupabaseConfigured;
}

function fromRow(row: PersonalTodoRow): PersonalTodo {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    note: row.note ?? "",
    content: row.content ?? row.note ?? "",
    dueDate: row.due_date ?? undefined,
    status: row.status ?? "todo",
    color: row.color ?? "yellow",
    x: typeof row.x === "number" ? row.x : 80,
    y: typeof row.y === "number" ? row.y : 80,
    rotation: typeof row.rotation === "number" ? row.rotation : 0,
    completedAt: row.completed_at ?? undefined,
    isPrivate: row.is_private ?? true,
    createdAt: row.created_at?.slice(0, 10),
    updatedAt: row.updated_at?.slice(0, 10)
  };
}

function toRow(todo: PersonalTodo): PersonalTodoRow {
  return {
    id: todo.id,
    owner_id: todo.ownerId,
    title: todo.title,
    note: todo.note || null,
    content: todo.content ?? todo.note ?? null,
    due_date: todo.dueDate ?? null,
    status: todo.status,
    color: todo.color ?? "yellow",
    x: todo.x ?? 80,
    y: todo.y ?? 80,
    rotation: todo.rotation ?? 0,
    completed_at: todo.completedAt ?? null,
    is_private: todo.isPrivate ?? true,
    created_at: todo.createdAt,
    updated_at: todo.updatedAt
  };
}

export async function loadPersonalTodosCloud(ownerId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("personal_todos")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as PersonalTodoRow[]).map(fromRow);
}

export async function syncPersonalTodosCloud(todos: PersonalTodo[]) {
  if (!supabase || !todos.length) return;

  const { error } = await supabase.from("personal_todos").upsert(todos.map(toRow), { onConflict: "id" });
  if (error) throw error;
}

export async function upsertPersonalTodoCloud(todo: PersonalTodo) {
  if (!supabase) return;

  const { error } = await supabase.from("personal_todos").upsert(toRow(todo), { onConflict: "id" });
  if (error) throw error;
}

export async function deletePersonalTodoCloud(todoId: string, ownerId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("personal_todos").delete().eq("id", todoId).eq("owner_id", ownerId);
  if (error) throw error;
}

export function mergePersonalTodos(localTodos: PersonalTodo[], cloudTodos: PersonalTodo[], ownerId: string) {
  const byId = new Map<string, PersonalTodo>();
  [...cloudTodos, ...localTodos].forEach((todo) => {
    const normalized = {
      ...todo,
      ownerId: todo.ownerId || ownerId,
      content: todo.content ?? todo.note ?? "",
      color: todo.color ?? "yellow",
      x: todo.x ?? 80,
      y: todo.y ?? 80,
      rotation: todo.rotation ?? 0,
      isPrivate: todo.isPrivate ?? true
    };
    const existing = byId.get(normalized.id);
    if (!existing || normalized.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      byId.set(normalized.id, normalized);
    }
  });
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
