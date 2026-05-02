export type Role = "director" | "teacher";

export type AuthRole = "admin" | "teacher";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
};

export type TeacherAccount = {
  id: string;
  teacherId?: string;
  name: string;
  email: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskStatus = "todo" | "doing" | "done";

export type Priority = "low" | "normal" | "high";

export type StickyColor = "yellow" | "pink" | "green" | "blue";

export type User = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  teachingScope?: string;
  enabled?: boolean;
};

export type Teacher = User;

export type Comment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  attachments?: Attachment[];
};

export type Attachment = {
  id: string;
  name: string;
  kind: "image" | "document";
  url: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  ownerIds: string[];
  assignedTo?: string;
  eventId?: string;
  status: TaskStatus;
  priority: Priority;
  isCritical: boolean;
  isBlocked: boolean;
  isKeyTask?: boolean;
  dueDate: string;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  attachments: Attachment[];
};

export type Event = {
  id: string;
  name: string;
  month: string;
  startDate: string;
  endDate: string;
  taskIds: string[];
  templateId?: string;
  reviewNotes: string[];
};

export type EventTemplate = {
  id: string;
  name: string;
  savedAt: string;
  items: {
    title: string;
    daysBeforeEvent: number;
    isKeyTask: boolean;
    priority: Priority;
  }[];
};

export type StickyNote = {
  id: string;
  eventId: string;
  authorId: string;
  color: StickyColor;
  body: string;
  assigneeId?: string;
  dueDate?: string;
  done: boolean;
  convertedTaskId?: string;
  createdAt: string;
};

export type Reminder = {
  id: string;
  type: "due-soon" | "overdue" | "assigned";
  taskId: string;
  message: string;
  level: "info" | "warning" | "danger";
};

export type ActivityArchive = {
  event: Event;
  tasks: Task[];
  stickyNotes: StickyNote[];
  comments: Comment[];
  attachments: Attachment[];
  reviewNotes: string[];
};
