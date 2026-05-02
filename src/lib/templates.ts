import type { EventTemplate, Task } from "./types";

export const savedEventTemplates: EventTemplate[] = [
  {
    id: "template-ceremony",
    name: "典禮活動準備清單",
    savedAt: new Date().toLocaleDateString("sv-SE"),
    items: [
      { title: "邀請卡與貴賓名單", daysBeforeEvent: 36, isKeyTask: false, priority: "normal" },
      { title: "活動流程表", daysBeforeEvent: 30, isKeyTask: true, priority: "high" },
      { title: "主持稿", daysBeforeEvent: 24, isKeyTask: true, priority: "high" },
      { title: "場地布置", daysBeforeEvent: 18, isKeyTask: false, priority: "normal" },
      { title: "音響與設備確認", daysBeforeEvent: 14, isKeyTask: true, priority: "high" },
      { title: "攝影與紀錄", daysBeforeEvent: 10, isKeyTask: false, priority: "normal" },
      { title: "家長通知", daysBeforeEvent: 8, isKeyTask: false, priority: "normal" },
      { title: "頒獎名單", daysBeforeEvent: 5, isKeyTask: true, priority: "high" }
    ]
  },
  {
    id: "template-school-event",
    name: "校內大型活動準備清單",
    savedAt: new Date().toLocaleDateString("sv-SE"),
    items: [
      { title: "活動計畫草案", daysBeforeEvent: 45, isKeyTask: true, priority: "high" },
      { title: "工作分組與負責人", daysBeforeEvent: 35, isKeyTask: true, priority: "high" },
      { title: "場地與動線規劃", daysBeforeEvent: 28, isKeyTask: true, priority: "high" },
      { title: "器材與物品清單", daysBeforeEvent: 21, isKeyTask: false, priority: "normal" },
      { title: "宣導海報與公告", daysBeforeEvent: 14, isKeyTask: false, priority: "normal" },
      { title: "當日流程確認", daysBeforeEvent: 7, isKeyTask: true, priority: "high" }
    ]
  },
  {
    id: "template-showcase",
    name: "成果發表準備清單",
    savedAt: new Date().toLocaleDateString("sv-SE"),
    items: [
      { title: "作品與照片收件", daysBeforeEvent: 30, isKeyTask: true, priority: "high" },
      { title: "展區規劃", daysBeforeEvent: 24, isKeyTask: true, priority: "high" },
      { title: "海報與說明牌", daysBeforeEvent: 18, isKeyTask: false, priority: "normal" },
      { title: "家長與來賓通知", daysBeforeEvent: 14, isKeyTask: false, priority: "normal" },
      { title: "導覽或主持安排", daysBeforeEvent: 10, isKeyTask: false, priority: "normal" },
      { title: "撤展與資料留存", daysBeforeEvent: 3, isKeyTask: false, priority: "normal" }
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
      description: `請完成「${item.title}」準備工作，並在完成後更新狀態，方便活動資料留存。`,
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
