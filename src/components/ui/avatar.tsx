"use client";
import * as React from "react";
import { cn, avatarGradient, initials } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  id: string;
  size?: number;
}

export function Avatar({ name, id, size = 40, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-black/80 ring-1 ring-white/10", className)}
      style={{ width: size, height: size, background: avatarGradient(id), fontSize: size * 0.36 }}
      aria-label={name}
      {...props}
    >
      {initials(name)}
    </div>
  );
}
