import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hashPassword } from "@/lib/password";
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabaseAdmin";

type AccountRole = "admin" | "teacher";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeRole(role?: string): AccountRole {
  return role === "admin" ? "admin" : "teacher";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

function unavailable() {
  return NextResponse.json(
    { error: "尚未設定 SUPABASE_SERVICE_ROLE_KEY，無法管理教師帳號。" },
    { status: 503 }
  );
}

function toAccount(data: Record<string, unknown>) {
  return {
    id: data.id,
    teacherId: data.teacher_id ?? undefined,
    name: data.name,
    email: data.email,
    role: normalizeRole(String(data.role ?? "teacher")),
    enabled: data.enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

const selectColumns = "id, teacher_id, name, email, role, enabled, created_at, updated_at";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const { data, error } = await supabaseAdmin
    .from("teacher_accounts")
    .select(selectColumns)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ accounts: (data ?? []).map(toAccount) });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");
  const teacherId = String(body.teacherId ?? "").trim() || null;
  const role = normalizeRole(body.role);
  const enabled = body.enabled !== false;

  if (!name || !email || password.length < 4) {
    return NextResponse.json({ error: "請輸入姓名、Email，密碼至少 4 碼。" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("teacher_accounts")
    .insert({
      name,
      email,
      role,
      teacher_id: teacherId,
      password_hash: hashPassword(password),
      enabled
    })
    .select(selectColumns)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ account: toAccount(data) });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const body = await request.json();
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");
  const teacherId = String(body.teacherId ?? "").trim() || null;
  const role = normalizeRole(body.role);

  if (!id || !name || !email) {
    return NextResponse.json({ error: "請輸入姓名與 Email。" }, { status: 400 });
  }

  const changes: Record<string, string | boolean | null> = {
    name,
    email,
    role,
    teacher_id: teacherId,
    enabled: body.enabled !== false,
    updated_at: new Date().toISOString()
  };

  if (password) {
    if (password.length < 4) {
      return NextResponse.json({ error: "密碼至少 4 碼。" }, { status: 400 });
    }
    changes.password_hash = hashPassword(password);
  }

  const { data, error } = await supabaseAdmin
    .from("teacher_accounts")
    .update(changes)
    .eq("id", id)
    .select(selectColumns)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ account: toAccount(data) });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少帳號 id。" }, { status: 400 });

  const { error } = await supabaseAdmin.from("teacher_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
