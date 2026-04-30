"use client";

type ActionBarProps = {
  children: React.ReactNode;
  subtle?: boolean;
};

export function ActionBar({ children, subtle = false }: ActionBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md ${
        subtle ? "bg-white/70" : "bg-rice"
      } p-2`}
    >
      {children}
    </div>
  );
}

type ActionButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "primary" | "quiet" | "danger" | "warm";
  disabled?: boolean;
};

export function ActionButton({
  children,
  onClick,
  tone = "quiet",
  disabled = false
}: ActionButtonProps) {
  const toneClass =
    tone === "primary"
      ? "bg-forest-700 text-white"
      : tone === "danger"
        ? "bg-red-700 text-white"
        : tone === "warm"
          ? "bg-amber-100 text-amber-900"
          : "bg-white text-ink";

  return (
    <button
      className={`rounded-md px-3 py-2 text-base font-black shadow-sm ${toneClass} disabled:cursor-not-allowed disabled:opacity-50`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
