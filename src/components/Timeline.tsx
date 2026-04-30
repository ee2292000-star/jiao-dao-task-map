"use client";

import { useState } from "react";
import type { Event, Task } from "@/lib/types";
import { getDaysLeft } from "@/lib/reminders";

type TimelineProps = {
  events: Event[];
  tasks: Task[];
};

export function Timeline({ events, tasks }: TimelineProps) {
  const [openEventId, setOpenEventId] = useState(events[0]?.id ?? "");

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="timeline">
      <div>
        <p className="text-xl font-bold text-forest-700">點擊活動展開任務</p>
        <h2 className="text-4xl font-black">活動時間軸</h2>
      </div>
      <div className="mt-5 space-y-5">
        {events.map((event) => {
          const eventTasks = tasks.filter((task) => task.eventId === event.id);
          const isOpen = openEventId === event.id;
          return (
            <div key={event.id} className="grid gap-3 md:grid-cols-[150px_1fr]">
              <button className="text-left" onClick={() => setOpenEventId(isOpen ? "" : event.id)}>
                <p className="text-3xl font-black text-forest-700">{event.month}</p>
                <p className="text-xl font-black">{event.name}</p>
              </button>
              <div className="space-y-2">
                <div className="h-4 rounded-md bg-forest-50">
                  <div className="h-4 w-2/3 rounded-md bg-forest-500" />
                </div>
                {isOpen &&
                  eventTasks.map((task, index) => {
                    const days = getDaysLeft(task.dueDate);
                    return (
                      <div
                        key={task.id}
                        className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-lg font-black"
                        style={{
                          marginLeft: `${Math.min(index * 18, 90)}px`,
                          width: `calc(100% - ${Math.min(index * 18, 90)}px)`
                        }}
                      >
                        {task.title.replace(`${event.name} - `, "")} ·{" "}
                        <span className={days < 0 ? "text-red-700" : "text-forest-700"}>
                          {days < 0 ? `逾期 ${Math.abs(days)} 天` : `剩 ${days} 天`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
