import type { AuthUser } from "@/features/auth";

type UserIdentity = Pick<AuthUser, "email" | "full_name" | "username">;

export function getUserDisplayName(user: UserIdentity) {
  return user.username?.trim() || user.full_name || user.email;
}

export function getUserSecondaryName(user: UserIdentity) {
  return user.username?.trim() ? user.full_name || user.email : user.email;
}
