import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDate } from "@/utils/helpers";

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    isRefetching,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تحميل الإشعارات..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader
        title="الإشعارات"
        subtitle={`غير المقروءة: ${unreadCount}`}
        action={
          unreadCount ? (
            <Button mode="text" onPress={() => markAllAsRead()}>
              تحديد الكل كمقروء
            </Button>
          ) : null
        }
      />

      {error ? <ErrorMessage message={error.message} onRetry={() => refetch()} /> : null}

      {notifications.length ? (
        notifications.map((notification) => (
          <Card
            key={notification.id}
            style={[
              styles.card,
              !notification.read ? styles.unreadCard : undefined
            ]}
            onPress={() => markAsRead(notification.id)}
          >
            <Card.Content style={styles.content}>
              <View style={styles.topRow}>
                <Text variant="bodySmall" style={styles.date}>
                  {formatDate(notification.createdAt)}
                </Text>
                <View style={styles.titleBlock}>
                  <Text variant="titleMedium" style={styles.title}>
                    {notification.title}
                  </Text>
                  {!notification.read ? (
                    <Text variant="labelSmall" style={styles.badge}>
                      جديد
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text variant="bodyMedium" style={styles.message}>
                {notification.message}
              </Text>
            </Card.Content>
          </Card>
        ))
      ) : (
        <EmptyState
          title="لا توجد إشعارات"
          description="سيعرض التطبيق التنبيهات القادمة من الخادم هنا."
          icon="bell-outline"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  unreadCard: {
    borderWidth: 1,
    borderColor: "#99f6e4"
  },
  content: {
    gap: 10
  },
  topRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  titleBlock: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4
  },
  title: {
    color: colors.text,
    textAlign: "right",
    fontWeight: "700"
  },
  badge: {
    color: colors.primary
  },
  date: {
    color: colors.textMuted
  },
  message: {
    color: colors.text,
    textAlign: "right",
    lineHeight: 22
  }
});
