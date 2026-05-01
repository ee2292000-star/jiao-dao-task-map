import type { EventTemplate, Task } from "./types";

export const savedEventTemplates: EventTemplate[] = [
  {
    id: "template-large-event",
    name: "大型活動模板",
    savedAt: new Date().toLocaleDateString("sv-SE"),
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
  const today = new Date().toLocaleDateString("sv-SE");

  return template.items.map((item, index) => {
    const due = new Date(eventDate);
    due.setDate(eventDate.getDate() - item.daysBeforeEvent);
    const ownerId = params.ownerIds[index % Math.max(params.ownerIds.length, 1)];

    return {
      id: `${params.eventId}-task-${index + 1}`,
      title: `${params.eventName} - ${item.title}`,
      description: `請完成「${item.title}」相關準備，並在需要時補充說明或留言。`,
      assignees: ownerId ? [ownerId] : [],
      ownerIds: ownerId ? [ownerId] : [],
      assignedTo: ownerId || undefined,
      eventId: params.eventId,
      status: "todo",
      priority: item.priority,
      isCritical: item.isKeyTask,
      isBlocked: false,
      isKeyTask: item.isKeyTask,
      dueDate: due.toISOString().slice(0, 10),
      createdAt: today,
      updatedAt: today,
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
    savedAt: new Date().toLocaleDateString("sv-SE"),
    items: template.items.map((item) => ({ ...item }))
  };
}
