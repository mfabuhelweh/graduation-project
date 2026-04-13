import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications } from "@/services/api";
import {
  loadNotificationReadMap,
  persistNotificationReadMap
} from "@/services/storage";
import type { AppNotification } from "@/types";

export function useNotifications() {
  const queryClient = useQueryClient();
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadNotificationReadMap().then(setReadMap);
  }, []);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications
  });

  const notifications = useMemo(
    () =>
      (query.data || []).map((notification) => ({
        ...notification,
        read: readMap[notification.id] ?? notification.read ?? false
      })),
    [query.data, readMap]
  );

  const persistReadState = async (
    updater: (current: Record<string, boolean>) => Record<string, boolean>
  ) => {
    const next = updater(readMap);
    setReadMap(next);
    await persistNotificationReadMap(next);
  };

  const markAsRead = async (id: string) => {
    await persistReadState((current) => ({
      ...current,
      [id]: true
    }));

    queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );
  };

  const markAllAsRead = async () => {
    await persistReadState((current) => {
      const next = { ...current };
      for (const item of notifications) {
        next[item.id] = true;
      }
      return next;
    });
  };

  return {
    ...query,
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    markAsRead,
    markAllAsRead
  };
}
