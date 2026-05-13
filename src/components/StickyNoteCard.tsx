"use client";

import type { ReactNode } from "react";

type StickyNoteTone = "yellow" | "pink" | "blue" | "green" | "purple" | "red";

type StickyNoteCardProps = {
  body?: string;
  category: string;
  className?: string;
  contentClassName?: string;
  editLabel?: string;
  footer?: ReactNode;
  onClick?: () => void;
  onEdit?: () => void;
  rotation?: number;
  tone?: StickyNoteTone;
  title: string;
};

const toneClasses: Record<StickyNoteTone, string> = {
  yellow: "border-yellow-200 bg-yellow-100",
  pink: "border-pink-200 bg-pink-100",
  blue: "border-blue-200 bg-blue-100",
  green: "border-green-200 bg-green-100",
  purple: "border-purple-200 bg-purple-100",
  red: "border-red-200 bg-red-100"
};

const categoryClasses: Record<StickyNoteTone, string> = {
  yellow: "bg-yellow-50 text-amber-900",
  pink: "bg-pink-50 text-pink-900",
  blue: "bg-blue-50 text-blue-900",
  green: "bg-green-50 text-green-900",
  purple: "bg-purple-50 text-purple-900",
  red: "bg-red-50 text-red-800"
};

export function StickyNoteCard({
  body,
  category,
  className = "",
  contentClassName = "",
  editLabel = "編輯",
  footer,
  onClick,
  onEdit,
  rotation = 0,
  tone = "yellow",
  title
}: StickyNoteCardProps) {
  return (
    <div
      className={`group relative w-64 cursor-pointer rounded-[3px] border p-4 text-left shadow-[0_10px_24px_rgba(61,49,28,0.18)] transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_16px_32px_rgba(61,49,28,0.24)] ${toneClasses[tone]} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center"
      }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
    >
      <div className="pointer-events-none absolute inset-x-3 top-0 h-2 rounded-b-full bg-white/25" />
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded px-2 py-1 text-xs font-black ${categoryClasses[tone]}`}>{category}</span>
        {onEdit && (
          <button
            className="pointer-events-auto rounded-md bg-white/85 px-2 py-1 text-xs font-black text-forest-800 opacity-45 shadow-sm transition group-hover:opacity-100"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            {editLabel}
          </button>
        )}
      </div>

      <h3 className={`mt-3 line-clamp-3 text-2xl font-black leading-tight text-ink ${contentClassName}`}>{title}</h3>
      {body && <p className="mt-2 line-clamp-5 whitespace-pre-wrap break-words text-base font-bold leading-relaxed text-stone-800">{body}</p>}
      {footer && <div className="mt-4 text-xs font-black text-stone-600">{footer}</div>}
    </div>
  );
}
