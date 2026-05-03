"use client";

import type { Task, Teacher } from "@/lib/types";
import { calculatePriorityScore, getPriorityReasons } from "@/lib/decisionSupport";
import { TaskCard } from "./TaskCard";

type KanbanBoardProps = {
  tasks: Task[];
  teachers: Teacher[];
  currentUserId?: string;
  canManageComments?: boolean;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onPriorityChange: (taskId: string, priority: Task["priority"]) => void;
  onAssign: (taskId: string, ownerId: string) => void;
  onDueDateChange?: (taskId: string, dueDate: string) => void;
  onQuickComment?: (taskId: string, body: string) => void;
  onUpdateComment?: (taskId: string, commentId: string, body: string) => void;
  onDeleteComment?: (taskId: string, commentId: string) => void;
  onRemind?: (message: string) => void;
  onUpdateTask?: (taskId: string, changes: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
};

const columns: { id: Task["status"]; title: string; tone: string }[] = [
  { id: "todo", title: "待辦", tone: "bg-stone-100" },
  { id: "doing", title: "進行中", tone: "bg-blue-50" },
  { id: "done", title: "已完成", tone: "bg-forest-50" }
];

export function KanbanBoard({
  tasks,
  teachers,
  currentUserId,
  canManageComments = false,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onDueDateChange,
  onQuickComment,
  onUpdateComment,
  onDeleteComment,
  onRemind,
  onUpdateTask,
  onDeleteTask,
  onOpenTask
}: KanbanBoardProps) {
  return (
    <section className="space-y-4" id="kanban">
      <div>
        <p className="text-xl font-bold text-forest-700">拖曳任務即可更新狀態，也可直接在卡片上處理。</p>
        <h2 className="text-4xl font-black text-ink">任務看板</h2>
      </div>

      {!tasks.length && (
        <p className="rounded-lg border border-forest-100 bg-white p-5 text-2xl font-black text-forest-800 shadow-soft">
          尚未建立任務，請先新增任務。
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.id);

          return (
            <div
              key={column.id}
              className={`min-h-[420px] rounded-lg border border-forest-100 ${column.tone} p-4`}
              onDragOver={(event) => {
                event.preventDefault();
                event.currentTarget.classList.add("drag-over");
              }}
              onDragLeave={(event) => event.currentTarget.classList.remove("drag-over")}
              onDrop={(event) => {
                event.currentTarget.classList.remove("drag-over");
                const taskId = event.dataTransfer.getData("taskId");
                if (taskId) onStatusChange(taskId, column.id);
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black text-ink">{column.title}</h2>
                <span className="rounded-md bg-white px-3 py-1 text-lg font-bold text-forest-700">
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-4">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    teachers={teachers}
                    compact
                    currentUserId={currentUserId}
                    canManageComments={canManageComments}
                    onStatusChange={onStatusChange}
                    onPriorityChange={onPriorityChange}
                    onAssign={onAssign}
                    onDueDateChange={onDueDateChange}
                    onQuickComment={onQuickComment}
                    onUpdateComment={onUpdateComment}
                    onDeleteComment={onDeleteComment}
                    onRemind={onRemind}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                    onOpen={onOpenTask}
                    priorityScore={calculatePriorityScore(task, { tasks, teachers, events: [] })}
                    priorityReasons={getPriorityReasons(task, { tasks, teachers, events: [] })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
