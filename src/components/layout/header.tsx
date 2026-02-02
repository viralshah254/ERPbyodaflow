"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useCopilotStore } from "@/stores/copilot-store";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bell, Search, Settings, LogOut, User, Sparkles } from "lucide-react";

export function Header() {
  const { user, currentBranch, logout } = useAuthStore();
  const openDrawer = useCopilotStore((s) => s.openDrawer);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  const userInitials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4">
      {/* Command palette trigger / Search */}
      <div className="flex-1 max-w-md">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1">Search or run...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-background px-1.5 font-mono text-xs">⌘K</kbd>
        </button>
      </div>

      {/* Branch Selector */}
      {currentBranch && (
        <div className="text-sm text-muted-foreground">
          {currentBranch.name}
        </div>
      )}

      {/* Copilot */}
      <Button variant="ghost" size="icon" onClick={openDrawer} title="Open Copilot">
        <Sparkles className="h-5 w-5" />
      </Button>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatarUrl} alt={user?.email} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

