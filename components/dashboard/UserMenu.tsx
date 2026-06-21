"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { signOutUser } from "@/lib/firebase-client";

export default function UserMenu() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await signOutUser();
    router.push("/login");
  }

  if (!user) return null;

  const displayName = user.displayName || user.email?.split("@")[0] || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 transition hover:border-[var(--accent)]"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={displayName}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-medium text-white">
            {initial}
          </div>
        )}
        <span className="text-sm text-[var(--text-primary)]">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-1.5 shadow-xl">
          <div className="border-b border-[var(--border)] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {displayName}
            </p>
            {user.email && (
              <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-alt)]"
          >
            <span>Appearance</span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm text-red-400 hover:bg-[var(--bg-card-alt)]"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}