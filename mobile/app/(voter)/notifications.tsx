import { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";

// ─── إشعارات محلية (مثل ملف Notifications.tsx في الويب) ─────────────────────
interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning" | "election";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "election",
    title: "باب التصويت مفتوح",
    message:
      "تم فتح باب التصويت للانتخابات النيابية 2024. يمكنك التصويت الآن من خلال صفحة التصويت الإلكتروني.",
    time: "منذ 5 دقائق",
    read: false
  },
  {
    id: "n2",
    type: "success",
    title: "تم التحقق من هويتك",
    message:
      "تم التحقق من بياناتك في سجل الناخبين بنجاح. أنت مؤهل للمشاركة في الانتخابات.",
    time: "منذ ساعة",
    read: false
  },
  {
    id: "n3",
    type: "info",
    title: "تحديث النظام",
    message:
      "تم تحديث نظام التصويت الإلكتروني إلى الإصدار الجديد. يُنصح بمسح ذاكرة التخزين المؤقت لتجربة أفضل.",
    time: "منذ 3 ساعات",
    read: true
  },
  {
    id: "n4",
    type: "warning",
    title: "تذكير: آخر موعد للتصويت",
    message:
      "تذكير: ينتهي التصويت في انتخابات الدائرة المحلية خلال 24 ساعة. لا تفوّت حقك الانتخابي.",
    time: "أمس",
    read: true
  },
  {
    id: "n5",
    type: "info",
    title: "نتائج مؤقتة",
    message:
      "ستُعلن نتائج القائمة العامة فور اكتمال فرز الأصوات وإغلاق صناديق الاقتراع الإلكترونية.",
    time: "منذ يومين",
    read: true
  },
  {
    id: "n6",
    type: "success",
    title: "تم تسجيل صوتك بنجاح",
    message:
      "صوتك مُقيَّد في البلوكشين ولا يمكن تعديله. رقم العملية: 0x8a11...9ae7. شكرًا لمشاركتك.",
    time: "منذ 3 أيام",
    read: true
  }
];

const typeConfig = {
  election: {
    icon: "vote" as const,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)"
  },
  success: {
    icon: "shield-check" as const,
    color: colors.success,
    bg: colors.successBg
  },
  info: {
    icon: "information" as const,
    color: colors.info,
    bg: colors.infoBg
  },
  warning: {
    icon: "alert" as const,
    color: colors.warning,
    bg: colors.warningBg
  }
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const displayed = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications,
    [notifications, filter]
  );

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <View style={styles.root}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bellBox}>
            <MaterialCommunityIcons name="bell" size={24} color="#6366f1" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>الإشعارات</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0
                ? `لديك ${unreadCount} إشعارات غير مقروءة`
                : "جميع الإشعارات مقروءة"}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <MaterialCommunityIcons
              name="check-all"
              size={14}
              color="#6366f1"
            />
            <Text style={styles.markAllText}>تحديد الكل كمقروء</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Filter Tabs ───────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterLabel,
              filter === "all" && styles.filterLabelActive
            ]}
          >
            الكل ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "unread" && styles.filterTabActive
          ]}
          onPress={() => setFilter("unread")}
        >
          <Text
            style={[
              styles.filterLabel,
              filter === "unread" && styles.filterLabelActive
            ]}
          >
            غير مقروء ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── List ──────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {displayed.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="bell-off-outline"
                size={40}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
            <Text style={styles.emptySub}>
              ستظهر هنا إشعارات الانتخابات والنظام
            </Text>
          </View>
        ) : (
          displayed.map((notif) => {
            const cfg =
              typeConfig[notif.type as keyof typeof typeConfig] ||
              typeConfig.info;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.card, !notif.read && styles.cardUnread]}
                onPress={() => markRead(notif.id)}
                activeOpacity={0.85}
              >
                {/* نقطة غير مقروء */}
                {!notif.read && <View style={styles.unreadDot} />}

                <View style={styles.cardRow}>
                  {/* أيقونة */}
                  <View
                    style={[styles.iconBox, { backgroundColor: cfg.bg }]}
                  >
                    <MaterialCommunityIcons
                      name={cfg.icon}
                      size={20}
                      color={cfg.color}
                    />
                  </View>

                  {/* النص */}
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.notifTime}>{notif.time}</Text>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                    </View>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                  </View>

                  {/* زر الحذف */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteNotification(notif.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            يتم تحديث الإشعارات تلقائياً عند وجود أي تغيير في حالة الانتخابات
            أو عمليات التصويت. تبقى الإشعارات لمدة 30 يوماً.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 52
  },

  // ─── Header ───────────────────────────────────────────────────────────
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12
  },
  bellBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(99,102,241,0.12)",
    justifyContent: "center",
    alignItems: "center"
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center"
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900"
  },
  headerText: {
    alignItems: "flex-end"
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  markAllBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)"
  },
  markAllText: {
    color: "#6366f1",
    fontSize: 12,
    fontWeight: "700"
  },

  // ─── Filters ──────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: "row-reverse",
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10
  },
  filterTabActive: {
    backgroundColor: colors.background
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  filterLabelActive: {
    color: colors.text,
    fontWeight: "800"
  },

  // ─── List ─────────────────────────────────────────────────────────────
  list: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10
  },

  // ─── Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardUnread: {
    borderColor: "rgba(99,102,241,0.3)",
    backgroundColor: colors.backgroundCard
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366f1"
  },
  cardRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  cardBody: {
    flex: 1,
    alignItems: "flex-end",
    gap: 5
  },
  cardTitleRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    gap: 8
  },
  notifTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
    flex: 1
  },
  notifTime: {
    color: colors.textMuted,
    fontSize: 11,
    flexShrink: 0,
    marginTop: 2
  },
  notifMessage: {
    color: colors.textSoft,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20
  },
  deleteBtn: {
    padding: 4,
    flexShrink: 0
  },

  // ─── Empty ────────────────────────────────────────────────────────────
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 20
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4
  },
  emptyTitle: {
    color: colors.textSoft,
    fontWeight: "700",
    fontSize: 16
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 220
  },

  // ─── Footer ───────────────────────────────────────────────────────────
  footer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18
  }
});
