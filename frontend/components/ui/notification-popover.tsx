"use client";

import * as React from "react";
import { Bell } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
};

interface NotificationItemProps {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
  dotColor?: string;
}

const NotificationItem = ({
  notification,
  index,
  onMarkAsRead,
  textColor = "text-white",
  dotColor = "bg-white",
  hoverBgColor = "hover:bg-[#ffffff37]",
}: NotificationItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    key={notification.id}
    className={cn(`p-4 ${hoverBgColor} cursor-pointer transition-colors`)}
    onClick={() => onMarkAsRead(notification.id)}
  >
    <div className="flex justify-between items-start gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {!notification.read && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
        <h4 className={cn("text-sm font-medium leading-snug", textColor)}>{notification.title}</h4>
      </div>
      <span className={cn("text-xs opacity-80 shrink-0", textColor)}>
        {formatNotificationTime(notification.timestamp)}
      </span>
    </div>
    <p className={cn("text-xs opacity-70 mt-1 leading-relaxed", textColor)}>{notification.description}</p>
  </motion.div>
);

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
  dividerColor?: string;
  emptyLabel?: string;
}

const NotificationList = ({
  notifications,
  onMarkAsRead,
  textColor,
  hoverBgColor,
  dividerColor = "divide-gray-200/40",
  emptyLabel = "No notifications yet.",
}: NotificationListProps) => {
  if (notifications.length === 0) {
    return <p className={cn("p-4 text-xs opacity-70", textColor)}>{emptyLabel}</p>;
  }

  return (
    <div className={cn("divide-y", dividerColor)}>
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          index={index}
          onMarkAsRead={onMarkAsRead}
          textColor={textColor}
          hoverBgColor={hoverBgColor}
        />
      ))}
    </div>
  );
};

export interface NotificationPopoverProps {
  notifications?: Notification[];
  onNotificationsChange?: (notifications: Notification[]) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  buttonClassName?: string;
  popoverClassName?: string;
  textColor?: string;
  hoverBgColor?: string;
  dividerColor?: string;
  headerBorderColor?: string;
  headerTitle?: string;
  markAllLabel?: string;
  emptyLabel?: string;
}

export function NotificationPopover({
  notifications: initialNotifications = [],
  onNotificationsChange,
  onMarkAsRead,
  onMarkAllAsRead,
  buttonClassName = "w-10 h-10 rounded-xl bg-[#11111198] hover:bg-[#111111d1] shadow-[0_0_20px_rgba(0,0,0,0.2)] border-0 p-0",
  popoverClassName = "bg-[#11111198] backdrop-blur-sm",
  textColor = "text-white",
  hoverBgColor = "hover:bg-[#ffffff37]",
  dividerColor = "divide-gray-200/40",
  headerBorderColor = "border-gray-200/50",
  headerTitle = "Notifications",
  markAllLabel = "Mark all as read",
  emptyLabel = "No notifications yet.",
}: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleOpen = () => setIsOpen((open) => !open);

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    onNotificationsChange?.(updatedNotifications);
    onMarkAllAsRead?.();
  };

  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updatedNotifications);
    onNotificationsChange?.(updatedNotifications);
    onMarkAsRead?.(id);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn("relative", textColor)}>
      <Button
        type="button"
        onClick={toggleOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className={cn("relative", buttonClassName)}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-black rounded-full flex items-center justify-center text-[10px] font-bold border border-gray-800 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl shadow-lg z-50",
              popoverClassName
            )}
            role="dialog"
            aria-label={headerTitle}
          >
            <div className={cn("p-4 border-b flex justify-between items-center gap-3", headerBorderColor)}>
              <h3 className="text-sm font-medium">{headerTitle}</h3>
              {unreadCount > 0 && (
                <Button
                  type="button"
                  onClick={markAllAsRead}
                  variant="ghost"
                  size="sm"
                  className={cn("text-xs h-auto py-1 px-2 border-0", hoverBgColor, "hover:text-white text-white/90")}
                >
                  {markAllLabel}
                </Button>
              )}
            </div>

            <NotificationList
              notifications={notifications}
              onMarkAsRead={markAsRead}
              textColor={textColor}
              hoverBgColor={hoverBgColor}
              dividerColor={dividerColor}
              emptyLabel={emptyLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatNotificationTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString();
}
