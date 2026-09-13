import { useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { AuthUser } from "@/features/auth";
import { getUserDisplayName } from "@/shared/userDisplay";

type AvatarUser = Pick<AuthUser, "avatar_url" | "email" | "full_name" | "username">;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 0 ? parts : ["Teamy"])
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type UserAvatarImageProps = {
  avatarUrl?: string | null;
  children?: ReactNode;
  className: string;
  style?: CSSProperties;
  title?: string;
  user: AvatarUser;
} & Omit<HTMLAttributes<HTMLSpanElement>, "className" | "style" | "title">;

function UserAvatarImage({ avatarUrl, children, className, style, title, user, ...spanProps }: UserAvatarImageProps) {
  const resolvedAvatarUrl = avatarUrl ?? user.avatar_url;
  const displayName = getUserDisplayName(user);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const shouldShowImage = Boolean(resolvedAvatarUrl && failedAvatarUrl !== resolvedAvatarUrl);

  return (
    <span {...spanProps} className={`relative ${className}`} style={style} title={title ?? displayName}>
      {shouldShowImage ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedAvatarUrl(resolvedAvatarUrl ?? null)}
          referrerPolicy="no-referrer"
          src={resolvedAvatarUrl ?? undefined}
        />
      ) : (
        <span aria-hidden="true">{getInitials(displayName)}</span>
      )}
      {children}
    </span>
  );
}

export default UserAvatarImage;
