import { StyleSheet } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { colors } from "@/constants/colors";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium" style={styles.title}>
          حدث خطأ
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
        {onRetry ? (
          <Button mode="contained" onPress={onRetry} style={styles.button}>
            إعادة المحاولة
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  content: {
    gap: 8,
    alignItems: "flex-end"
  },
  title: {
    color: colors.error,
    fontWeight: "700"
  },
  message: {
    color: colors.text,
    textAlign: "right"
  },
  button: {
    marginTop: 8,
    alignSelf: "stretch",
    backgroundColor: colors.error
  }
});
