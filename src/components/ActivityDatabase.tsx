"use client";

import { useState } from "react";
import type { Event, Task, Teacher } from "@/lib/types";
import { getEventProgress } from "@/lib/decisionSupport";
import { ActionButton } from "./ActionBar";

type ActivityDatabaseProps = {
  events: Event[];
  tasks: Task[];
  teachers: Teacher[];
  onAddReviewNote: (eventId: string, note: string) => void;
  onDuplicateEvent: (eventId: string) => void;
  onFilterEvent: (eventId: string) => void;
};

function ownerNames(task: Task, teachers: Teacher[]) {
  const names = teachers
    .filter((teacher) => task.ownerIds.includes(teacher.id))
    .map((teacher) => teacher.name);
  return names.length ? names.join("、") : "尚未指派";
}

export function ActivityDatabase({
  events,
  tasks,
  teachers,
  onAddReviewNote,
  onDuplicateEvent,
  onFilterEvent
}: ActivityDatabaseProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function submitReview(eventId: string) {
    const note = drafts[eventId]?.trim();
    if (!note) return;
    onAddReviewNote(eventId, note);
    setDrafts((current) => ({ ...current, [eventId]: "" }));
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="archive">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">活動資料庫</p>
          <h2 className="text-4xl font-black">檢討紀錄與下次複製</h2>
        </div>
        <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-black text-forest-800">
          保存任務、分工、留言、附件與檢討
        </p>
      </div>

      <div className="mt-5 grid gap-5">
        {events.length ? events.map((event) => {
          const eventTasks = tasks.filter((task) => task.eventId === event.id);
          const commentsCount = eventTasks.reduce((total, task) => total + task.comments.length, 0);
          const attachmentsCount = eventTasks.reduce(
            (total, task) => total + task.attachments.length,
            0
          );
          const progress = getEventProgress(event, tasks);

          return (
            <article key={event.id} className="rounded-lg border border-forest-100 bg-warm p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-3xl font-black text-ink">{event.name}</h3>
                    <span className="rounded-md bg-white px-3 py-1 text-lg font-black text-forest-700">
                      {progress}%
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-stone-700">
                    {event.startDate} 至 {event.endDate}｜任務 {eventTasks.length} 件｜留言{" "}
                    {commentsCount} 則｜附件 {attachmentsCount} 份
                  </p>
                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                    {eventTasks.slice(0, 6).map((task) => (
                      <div key={task.id} className="rounded-md bg-white p-3">
                        <p className="text-lg font-black">{task.title.replace(`${event.name} - `, "")}</p>
                        <p className="mt-1 text-base font-bold text-stone-600">
                          {ownerNames(task, teachers)}｜{task.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-white p-4">
                  <h4 className="text-2xl font-black text-forest-700">檢討紀錄</h4>
                  <div className="mt-3 space-y-2">
                    {event.reviewNotes.length ? (
                      event.reviewNotes.map((note, index) => (
                        <p key={`${event.id}-${index}`} className="rounded-md bg-rice p-3 text-base font-bold">
                          {note}
                        </p>
                      ))
                    ) : (
                      <p className="rounded-md bg-rice p-3 text-base font-bold text-stone-600">
                        尚未新增檢討紀錄。
                      </p>
                    )}
                  </div>
                  <textarea
                    className="mt-3 min-h-24 w-full rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-bold"
                    value={drafts[event.id] ?? ""}
                    onChange={(inputEvent) =>
                      setDrafts((current) => ({
                        ...current,
                        [event.id]: inputEvent.target.value
                      }))
                    }
                    placeholder="新增檢討，例如：家長動線下次需提前公告"
                    aria-label="新增活動檢討"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton tone="primary" onClick={() => submitReview(event.id)}>
                      新增檢討
                    </ActionButton>
                    <ActionButton tone="quiet" onClick={() => onFilterEvent(event.id)}>
                      查看任務
                    </ActionButton>
                    <ActionButton tone="warm" onClick={() => onDuplicateEvent(event.id)}>
                      複製成新活動
                    </ActionButton>
                  </div>
                </div>
              </div>
            </article>
          );
        }) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
            尚未建立活動
          </p>
        )}
      </div>
    </section>
  );
}
