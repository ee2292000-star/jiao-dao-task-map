import type { EventTemplate, Task } from "./types";

export const savedEventTemplates: EventTemplate[] = [
  {
    id: "template-graduation",
    name: "畢業典禮模板",
    savedAt: "2026-04-30",
    items: [
      { title: "邀請卡", daysBeforeEvent: 36, isKeyTask: false, priority: "normal" },
      { title: "流程表", daysBeforeEvent: 30, isKeyTask: true, priority: "high" },
      { title: "主持稿", daysBeforeEvent: 24, isKeyTask: true, priority: "high" },
      { title: "場地布置", daysBeforeEvent: 18, isKeyTask: false, priority: "normal" },
      { title: "音響", daysBeforeEvent: 14, isKeyTask: true, priority: "high" },
      { title: "攝影", daysBeforeEvent: 10, isKeyTask: false, priority: "normal" },
      { title: "海報", daysBeforeEvent: 8, isKeyTask: false, priority: "normal" },
      { title: "頒獎名單", daysBeforeEvent: 5, isKeyTask: true, priority: "high" }
    ]
  }
];

export function generateEventTemplateTasks(params: {
  eventId: string;
  eventName: string;
  ownerIds: string[];
  eventDate: string;
  template?: EventTemplate;
}): Task[] {
  const template = params.template ?? savedEventTemplates[0];
  const eventDate = new Date(`${params.eventDate}T00:00:00`);

  return template.items.map((item, index) => {
    const due = new Date(eventDate);
    due.setDate(eventDate.getDate() - item.daysBeforeEvent);
    const ownerId = params.ownerIds[index % Math.max(params.ownerIds.length, 1)];

    return {
      id: `${params.eventId}-task-${index + 1}`,
      title: `${params.eventName} - ${item.title}`,
      description: `請完成「${item.title}」準備，並在任務卡留下進度、留言與附件。`,
      assignees: ownerId ? [ownerId] : [],
      ownerIds: ownerId ? [ownerId] : [],
      eventId: params.eventId,
      status: index < 2 ? "done" : index < 5 ? "doing" : "todo",
      priority: item.priority,
      isCritical: item.isKeyTask,
      isBlocked: item.isKeyTask && index >= 5,
      isKeyTask: item.isKeyTask,
      dueDate: due.toISOString().slice(0, 10),
      createdAt: "2026-04-20",
      updatedAt: "2026-04-30",
      comments: [],
      attachments: []
    };
  });
}

export function duplicateTemplate(template: EventTemplate, nextName: string): EventTemplate {
  return {
    ...template,
    id: `${template.id}-${Date.now()}`,
    name: nextName,
    savedAt: new Date().toISOString().slice(0, 10),
    items: template.items.map((item) => ({ ...item }))
  };
}
