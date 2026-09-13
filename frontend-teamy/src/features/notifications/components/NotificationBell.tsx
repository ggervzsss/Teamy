import { Bell, Loader2, Mail } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNotificationSocketTicket, getNotificationSocketUrl, listNotifications, markNotificationRead } from "@/features/notifications/api";
import type { NotificationSocketEvent, TeamyNotification } from "@/features/notifications/api";
import { formatRelativeTime, parseApiDateTime } from "@/shared/dateTime";
import { getRichTextPlainText } from "@/shared/richText";

const iconButton =
  "relative inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-1 text-[#8e9192] transition-colors duration-200 ease-out hover:bg-white/5 hover:text-white";
const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function formatNotificationTime(value: string) {
  return formatRelativeTime(value, { includeYesterday: false, dateFormat: { month: "short", day: "numeric" } });
}

function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<TeamyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const notificationsRef = useRef<TeamyNotification[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  function upsertNotification(notification: TeamyNotification) {
    setNotifications((currentNotifications) => {
      const nextNotifications = [notification, ...currentNotifications.filter((currentNotification) => currentNotification.id !== notification.id)];
      return nextNotifications.sort((a, b) => parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at)).slice(0, 8);
    });
  }

  async function refreshNotifications(limit = 8) {
    setIsLoading(true);
    setError("");
    try {
      const data = await listNotifications(limit);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => {
      void refreshNotifications(8);
    }, 0);
    return () => window.clearTimeout(initialRefreshId);
  }, []);

  useEffect(() => {
    let isActive = true;
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: number | null = null;

    function scheduleReconnect() {
      if (!isActive) {
        return;
      }
      reconnectTimeoutId = window.setTimeout(() => {
        void connect();
      }, 5000);
    }

    async function connect() {
      try {
        const ticket = await getNotificationSocketTicket();
        if (!isActive) {
          return;
        }
        socket = new WebSocket(getNotificationSocketUrl(ticket));
        socket.addEventListener("message", (event) => {
          const data = JSON.parse(event.data as string) as NotificationSocketEvent;
          if (data.event === "notification.created") {
            upsertNotification(data.notification);
            if (!data.notification.read_at) {
              setUnreadCount((currentCount) => currentCount + 1);
            }
            setError("");
          }
          if (data.event === "notification.read") {
            const wasUnread = notificationsRef.current.some((notification) => notification.id === data.notification.id && !notification.read_at);
            setNotifications((currentNotifications) => {
              return currentNotifications.map((notification) => (notification.id === data.notification.id ? data.notification : notification));
            });
            if (wasUnread && data.notification.read_at) {
              setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
            }
          }
          if (data.event === "notification.read_all") {
            const now = new Date().toISOString();
            setNotifications((currentNotifications) => currentNotifications.map((notification) => ({ ...notification, read_at: notification.read_at ?? now })));
            setUnreadCount(0);
          }
        });
        socket.addEventListener("close", scheduleReconnect);
        socket.addEventListener("error", () => {
          socket?.close();
        });
      } catch {
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      isActive = false;
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function openNotification(notification: TeamyNotification) {
    if (!notification.read_at) {
      try {
        const updated = await markNotificationRead(notification.id);
        const wasUnread = notificationsRef.current.some((currentNotification) => currentNotification.id === notification.id && !currentNotification.read_at);
        setNotifications((currentNotifications) => currentNotifications.map((currentNotification) => (currentNotification.id === notification.id ? updated : currentNotification)));
        if (wasUnread && updated.read_at) {
          setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
        }
      } catch {
        // Opening the destination matters more than the read marker.
      }
    }
    setIsOpen(false);
    if (notification.target_path) {
      navigate(notification.target_path);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={iconButton}
        aria-label="Notifications"
        title="Notifications"
        onClick={() => {
          setIsOpen((current) => !current);
          void refreshNotifications(8);
        }}
      >
        <Bell aria-hidden="true" size={21} />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-[#ffb4ab] px-1 text-center text-[10px] leading-4 font-bold text-[#3b0906]">{unreadCount > 9 ? "9+" : unreadCount}</span>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 z-100 mt-3 w-92 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-white/10 bg-[#1e1e21]/95 shadow-2xl backdrop-blur-xl max-[640px]:fixed max-[640px]:top-20 max-[640px]:right-3 max-[640px]:left-3 max-[640px]:w-auto"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
              <div>
                <h2 className="m-0 text-sm font-bold text-white">Notifications</h2>
                <p className={`${labelFont} m-0 mt-1 text-[#8e9192] uppercase`}>{unreadCount} unread</p>
              </div>
              <button
                className={`${labelFont} rounded border border-white/10 bg-white/5 px-3 py-2 text-white uppercase hover:bg-white/10`}
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notifications", { state: { from: location.pathname } });
                }}
                type="button"
              >
                View All
              </button>
            </div>
            <div className="custom-scrollbar max-h-96 overflow-y-auto max-[640px]:max-h-[60vh]">
              {isLoading && notifications.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-5 text-[#8e9192]">
                  <Loader2 aria-hidden="true" className="animate-spin" size={18} />
                  Loading...
                </div>
              ) : error ? (
                <div className="px-4 py-5 text-sm text-[#ffb4ab]">{error}</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-5 text-sm text-[#8e9192]">No notifications yet.</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    className={`flex w-full cursor-pointer gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-white/5 ${notification.read_at ? "" : "bg-white/3"}`}
                    key={notification.id}
                    onClick={() => void openNotification(notification)}
                    type="button"
                  >
                    <span
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border ${notification.is_email_backed ? "border-[#ffdad6]/30 bg-[#ffdad6]/10 text-[#ffdad6]" : "border-white/10 bg-white/5 text-[#c4c7c8]"}`}
                    >
                      <Mail aria-hidden="true" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {!notification.read_at ? <span className="size-2 shrink-0 rounded-full bg-[#ffb4ab]" /> : null}
                        <span className="truncate text-sm font-semibold text-white">{notification.title}</span>
                      </span>
                      {notification.body ? <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#8e9192]">{getRichTextPlainText(notification.body)}</span> : null}
                      <span className={`${labelFont} mt-2 block text-[#8e9192] uppercase`}>{formatNotificationTime(notification.created_at)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
