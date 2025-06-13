"use client";

import {
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Music,
  Settings,
  Sparkles,
  CreditCard,
  FolderOpen,
  Globe,
  Video,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { IoPinOutline } from "react-icons/io5";
import { NavUser } from "~/components/client/nav-user";

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isMobile || isPinned || isHovered;

  const session = useSession({
    required: false,
  });
  const user = session.data?.user;

  return (
    <div
      className={`${isExpanded ? "w-64" : "w-16"} flex h-full flex-col border-r border-border bg-background px-3 py-4 transition-all duration-300`}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <div className="flex items-center justify-between rounded-lg bg-muted p-2">
        <div className={`flex gap-2 ${!isExpanded && "hidden"}`}>
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-foreground">
              Craetive AI
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user?.subscriptionTier}
            </span>
          </div>
        </div>
        {!isMobile && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-muted"
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center transition-all ${isPinned ? "rounded-lg bg-muted-foreground/10" : "text-muted-foreground"}`}
            >
              {isExpanded ? (
                <IoPinOutline className="h-5 w-5" />
              ) : (
                <div className="flex h-fit w-fit items-center justify-center rounded-lg bg-background px-2 py-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </div>
                </div>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-8 flex flex-1 flex-col">
        <SectionHeader isExpanded={isExpanded}>Dashboard</SectionHeader>
        <SidebarButton
          icon={<LayoutDashboard />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/dashboard")}
          href="/app/dashboard"
        >
          Dashboard
        </SidebarButton>
        <SidebarButton
          icon={<FolderOpen />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/media-library")}
          href="/app/media-library"
        >
          Media Library
        </SidebarButton>
        <SidebarButton
          icon={<Globe />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/explore")}
          href="/app/explore"
        >
          Explore
        </SidebarButton>
        <SectionHeader isExpanded={isExpanded}>Playground</SectionHeader>
        <SidebarButton
          icon={<MessageSquare />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/speech-synthesis/text-to-speech")}
          href="/app/speech-synthesis/text-to-speech"
        >
          Text to Speech
        </SidebarButton>
        <SidebarButton
          icon={<Mic />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/speech-synthesis/speech-to-speech")}
          href="/app/speech-synthesis/speech-to-speech"
        >
          Voice Changer
        </SidebarButton>
        <SidebarButton
          icon={<Music />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/sound-effects")}
          href="/app/sound-effects/generate"
        >
          Sound Effects
        </SidebarButton>
        <SidebarButton
          icon={<ImageIcon />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/generate-image")}
          href="/app/generate-image"
        >
          Text to Image
        </SidebarButton>
        <SidebarButton
          icon={<Video />}
          isExpanded={isExpanded}
          isActive={pathname.includes("/app/generate-video")}
          href="/app/generate-video"
        >
          Text & Image to Video
        </SidebarButton>
        <SectionHeader isExpanded={isExpanded}>Settings</SectionHeader>
        <SidebarButton
          icon={<CreditCard />}
          isExpanded={isExpanded}
          isActive={pathname === "/app/settings/billing"}
          href="/app/settings/billing"
        >
          Billing
        </SidebarButton>
        <SidebarButton
          icon={<Settings />}
          isExpanded={isExpanded}
          isActive={pathname === "/app/settings/account-settings"}
          href="/app/settings/account-settings"
        >
          Settings
        </SidebarButton>
      </nav>

      {/* Bottom Section */}
      <div className="relative mt-auto">
        <NavUser />
      </div>
    </div>
  );
}

function SectionHeader({
  children,
  isExpanded,
}: {
  children: ReactNode;
  isExpanded: boolean;
}) {
  return (
    <div className="mb-2 mt-4 h-6 pl-4">
      <span
        className={`text-sm text-muted-foreground transition-opacity duration-200 ${isExpanded ? "opacity-100" : "opacity-0"}`}
      >
        {children}
      </span>
    </div>
  );
}

function SidebarButton({
  icon,
  children,
  isExpanded,
  isActive,
  href,
}: {
  icon: ReactNode;
  children: ReactNode;
  isExpanded: boolean;
  isActive: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
    >
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {icon}
      </div>
      <div
        className={`ml-3 overflow-hidden transition-all duration-300 ${isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"}`}
        style={{ whiteSpace: "nowrap" }}
      >
        {children}
      </div>
    </Link>
  );
}
