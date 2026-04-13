import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = "inbox-outline",
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons color={colors.primary} name={icon} size={28} />
        </View>
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          {description}
        </Text>
        {actionLabel && onAction ? (
          <Button mode="contained-tonal" onPress={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  content: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dff4f1"
  },
  title: {
    fontWeight: "700",
    color: colors.text,
    textAlign: "center"
  },
  description: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22
  }
});
