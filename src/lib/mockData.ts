import type { Event, StickyNote, Task, Teacher } from "./types";
import { generateEventTemplateTasks, savedEventTemplates } from "./templates";

export const teachers: Teacher[] = [
  { id: "t1", name: "林主任", role: "主任", avatar: "林" },
  { id: "t2", name: "陳老師", role: "組長", avatar: "陳" },
  { id: "t3", name: "黃老師", role: "導師", avatar: "黃" },
  { id: "t4", name: "吳老師", role: "科任", avatar: "吳" },
  { id: "t5", name: "張老師", role: "導師", avatar: "張" }
];

export const events: Event[] = [
  {
    id: "event-graduation",
    name: "畢業典禮",
    month: "六月",
    startDate: "2026-05-01",
    endDate: "2026-06-12",
    taskIds: [],
    templateId: "template-graduation",
    reviewNotes: ["去年家長動線需再清楚標示", "攝影檔案需集中留存"]
  },
  {
    id: "event-anniversary",
    name: "校慶",
    month: "十一月",
    startDate: "2026-10-01",
    endDate: "2026-11-14",
    taskIds: [],
    templateId: "template-graduation",
    reviewNotes: ["攤位電力需提前盤點"]
  },
  {
    id: "event-exhibition",
    name: "成果展",
    month: "十二月",
    startDate: "2026-11-20",
    endDate: "2026-12-18",
    taskIds: [],
    reviewNotes: []
  }
];

const graduationTasks = generateEventTemplateTasks({
  eventId: "event-graduation",
  eventName: "畢業典禮",
  ownerIds: ["t2", "t3", "t4", "t5"],
  eventDate: "2026-06-12",
  template: savedEventTemplates[0]
}).map((task) =>
  task.title.endsWith("攝影")
    ? { ...task, assignees: [], ownerIds: [], isBlocked: true }
    : task.title.endsWith("主持稿")
      ? { ...task, status: "doing" as const, dueDate: "2026-05-01", isBlocked: true }
      : task
);

export const initialTasks: Task[] = [
  {
    id: "task-weekly-1",
    title: "期末校務會議資料彙整",
    description: "彙整各學年提案、學生事務報告與獎懲統計，供主任會議決策使用。",
    assignees: ["t2", "t3"],
    ownerIds: ["t2", "t3"],
    status: "doing",
    priority: "high",
    isCritical: true,
    isBlocked: false,
    isKeyTask: true,
    dueDate: "2026-05-02",
    createdAt: "2026-04-25",
    updatedAt: "2026-04-30",
    comments: [
      {
        id: "c1",
        authorId: "t2",
        body: "已收到三年級資料，五年級明天補上。",
        createdAt: "2026-04-29"
      }
    ],
    attachments: []
  },
  {
    id: "task-weekly-2",
    title: "午餐教育宣導海報",
    description: "製作五月份宣導圖卡，提供導師班級宣導使用。",
    assignees: ["t4"],
    ownerIds: ["t4"],
    status: "todo",
    priority: "normal",
    isCritical: false,
    isBlocked: false,
    dueDate: "2026-04-29",
    createdAt: "2026-04-22",
    updatedAt: "2026-04-29",
    comments: [],
    attachments: []
  },
  {
    id: "task-weekly-3",
    title: "校外人士入校流程確認",
    description: "確認警衛室、總務處與教導處共同流程。",
    assignees: [],
    ownerIds: [],
    status: "todo",
    priority: "high",
    isCritical: true,
    isBlocked: true,
    dueDate: "2026-05-03",
    createdAt: "2026-04-28",
    updatedAt: "2026-04-30",
    comments: [],
    attachments: []
  },
  ...graduationTasks
];

events[0].taskIds = graduationTasks.map((task) => task.id);

export const stickyNotes: StickyNote[] = [
  {
    id: "note-1",
    eventId: "event-graduation",
    authorId: "t2",
    color: "yellow",
    body: "邀請卡需確認家長會長姓名。",
    assigneeId: "t2",
    dueDate: "2026-05-03",
    done: false,
    createdAt: "2026-04-28"
  },
  {
    id: "note-2",
    eventId: "event-graduation",
    authorId: "t3",
    color: "green",
    body: "畢業生進場音樂已確定。",
    assigneeId: "t3",
    dueDate: "2026-05-08",
    done: true,
    createdAt: "2026-04-29"
  },
  {
    id: "note-3",
    eventId: "event-graduation",
    authorId: "t5",
    color: "blue",
    body: "可在川堂加一面祝福留言牆。",
    assigneeId: "t5",
    dueDate: "2026-05-10",
    done: false,
    createdAt: "2026-04-30"
  }
];
