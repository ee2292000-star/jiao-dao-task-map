import type { AuthUser } from "./types";

export const AUTH_STORAGE_KEY = "jiao-dao-task-map:current-user:v1";

export const testUsers: AuthUser[] = [
  {
    id: "admin",
    name: "主任",
    username: "admin",
    password: "1234",
    role: "admin"
  },
  {
    id: "teacher1",
    name: "王老師",
    username: "teacher1",
    password: "1234",
    role: "teacher"
  }
];

export function findUser(username: string, password: string) {
  return testUsers.find(
    (user) => user.username === username.trim() && user.password === password
  );
}

export function publicUser(user: AuthUser) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}
