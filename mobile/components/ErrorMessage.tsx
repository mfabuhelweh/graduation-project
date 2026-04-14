import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppPreferences } from "@/hooks/useAppPreferences";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { colors, language } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.error} />
      </View>
      <Text style={styles.title}>{language === "ar" ? "حدث خطأ" : "Something went wrong"}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry} style={styles.retryButton} labelStyle={styles.retryLabel}>
          {language === "ar" ? "إعادة المحاولة" : "Try again"}
        </Button>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"]) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.error + "40",
      borderRadius: 16,
      padding: 20,
      alignItems: "flex-end",
      gap: 10
    },
    iconWrapper: {
      alignSelf: "center",
      marginBottom: 4
    },
    title: {
      color: colors.error,
      fontWeight: "700",
      fontSize: 16,
      textAlign: "right"
    },
    message: {
      color: colors.textSoft,
      textAlign: "right",
      lineHeight: 22,
      fontSize: 14,
      width: "100%"
    },
    retryButton: {
      marginTop: 4,
      backgroundColor: colors.error,
      alignSelf: "stretch"
    },
    retryLabel: {
      color: "#fff"
    }
  });
}
