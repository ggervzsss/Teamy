import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNotificationSocketTicket, getNotificationSocketUrl, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/api";
import type { NotificationSocketEvent, TeamyNotification } from "@/features/notifications/api";
import { Skeleton } from "@/shared/components/Skeleton";
import { parseApiDateTime } from "@/shared/dateTime";
import { NotificationRow } from "../components/NotificationRow";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<TeamyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const notificationsRef = useRef<TeamyNotification[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    let isMounted = true;
    listNotifications(100)
      .then((data) => {
        if (isMounted) {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load notifications.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: number | null = null;

    function upsertNotification(notification: TeamyNotification) {
      setNotifications((currentNotifications) => {
        const nextNotifications = [notification, ...currentNotifications.filter((currentNotification) => currentNotification.id !== notification.id)];
        return nextNotifications.sort((a, b) => parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at));
      });
    }

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
            setNotifications((currentNotifications) => currentNotifications.map((notification) => (notification.id === data.notification.id ? data.notification : notification)));
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

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/projects");
  }

  async function openNotification(notification: TeamyNotification) {
    if (!notification.read_at) {
      try {
        const updated = await markNotificationRead(notification.id);
        const wasUnread = notificationsRef.current.some((currentNotification) => currentNotification.id === updated.id && !currentNotification.read_at);
        setNotifications((currentNotifications) => currentNotifications.map((currentNotification) => (currentNotification.id === updated.id ? updated : currentNotification)));
        if (wasUnread && updated.read_at) {
          setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
        }
      } catch {
        // Keep navigation responsive even if read state fails.
      }
    }
    if (notification.target_path) {
      navigate(notification.target_path, { state: { from: location.pathname } });
    }
  }

  async function markAllRead() {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((currentNotifications) => currentNotifications.map((notification) => ({ ...notification, read_at: notification.read_at ?? now })));
      setUnreadCount(0);
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3">
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              onClick={goBack}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={18} />
              Back
            </button>
          </div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Notifications</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">Account activity from every Teamy workspace.</p>
        </div>
        <button
          className={`${labelFont} inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white uppercase hover:bg-white/10 disabled:opacity-60`}
          disabled={unreadCount === 0 || isMarkingAll}
          onClick={() => void markAllRead()}
          type="button"
        >
          {isMarkingAll ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <CheckCircle2 aria-hidden="true" size={16} />}
          Mark All Read
        </button>
      </header>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      <section className="gpu-panel overflow-hidden rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/10 bg-black/30 px-5 py-3">
          <h2 className={`${labelFont} m-0 text-[#8e9192] uppercase`}>All Notifications</h2>
        </div>
        {isLoading ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4].map((i) => (
              <div className="flex w-full gap-4 border-b border-white/5 px-5 py-4 last:border-b-0" key={i}>
                <Skeleton className="mt-1 size-10 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center text-[#8e9192]">No notifications yet.</div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={openNotification} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default NotificationsPage;
