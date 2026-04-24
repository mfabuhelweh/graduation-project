import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PublicTab = "help" | "login" | "stations";

interface SanadPublicShellProps {
  activeTab: PublicTab;
  language: "ar" | "en";
  onTabChange: (tab: PublicTab) => void;
  onToggleLanguage: () => void;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

const blue = "#1F5AA9";
const navy = "#171717";
const muted = "#66736B";
const gold = "#B88A2C";
const soutakLogo = require("@/assets/soutak-logo.png");
const soutakEmblem = require("@/assets/soutak-emblem.png");

export function SanadPublicShell({
  activeTab,
  language,
  onTabChange,
  onToggleLanguage,
  children,
  contentStyle
}: SanadPublicShellProps) {
  const insets = useSafeAreaInsets();
  const isArabic = language === "ar";

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor={navy} />
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View style={styles.goldGlow} />
        <View style={styles.blueGlow} />
        <View style={styles.petraArch} />
        <View style={styles.petraArchInner} />
        <View style={styles.tatreezBand}>
          <View style={styles.tatreezDiamond} />
          <View style={styles.tatreezDiamondAlt} />
          <View style={styles.tatreezDiamond} />
          <View style={styles.tatreezDiamondAlt} />
          <View style={styles.tatreezDiamond} />
        </View>
        <View style={[styles.patternLine, styles.patternOne]} />
        <View style={[styles.patternLine, styles.patternTwo]} />
      </View>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <SoutakMark size={34} />
          </View>
          <View>
            <Text style={styles.brandName}>
              {isArabic ? "صوتك" : "Soutak"}
            </Text>
            <Text style={styles.brandSub}>{isArabic ? "نظام الاقتراع الإلكتروني" : "Electronic voting system"}</Text>
          </View>
        </View>
        <Pressable style={styles.languageButton} onPress={onToggleLanguage}>
          <Text style={styles.languageText}>{isArabic ? "English" : "العربية"}</Text>
          <MaterialCommunityIcons name="web" size={19} color="#ffffff" />
        </Pressable>
      </View>
      <View
        style={[
          styles.content,
          {
            paddingTop: 92 + insets.top,
            paddingBottom: 112 + insets.bottom
          },
          contentStyle
        ]}
      >
        {children}
      </View>
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <NavItem
          active={activeTab === "help"}
          icon="help-circle-outline"
          label={isArabic ? "المساعدة" : "Help"}
          onPress={() => onTabChange("help")}
        />
        <NavItem
          active={activeTab === "login"}
          icon="login"
          label={isArabic ? "الدخول" : "Login"}
          onPress={() => onTabChange("login")}
        />
        <NavItem
          active={activeTab === "stations"}
          icon="map-marker-radius-outline"
          label={isArabic ? "المراكز" : "Centers"}
          onPress={() => onTabChange("stations")}
        />
      </View>
    </View>
  );
}

function NavItem({
  active,
  icon,
  label,
  onPress
}: {
  active: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
        <MaterialCommunityIcons name={icon} size={24} color={active ? "#ffffff" : muted} />
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function SanadLogo() {
  return (
    <View style={styles.logoBlock}>
      <SoutakMark size={88} />
    </View>
  );
}

export function SoutakFullLogo() {
  return (
    <View style={styles.logoBlock}>
      <Image source={soutakLogo} style={styles.logoImage} resizeMode="contain" />
    </View>
  );
}

export function SoutakMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={soutakEmblem}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

export const sanadPublicColors = {
  blue,
  gold,
  navy,
  muted,
  border: "#D8E0E6",
  soft: "#F8FAFC",
  text: "#162033"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8F7"
  },
  goldGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 132,
    backgroundColor: "rgba(23,23,23,0.08)"
  },
  blueGlow: {
    position: "absolute",
    bottom: 90,
    right: -24,
    width: 190,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(184,138,44,0.14)",
    backgroundColor: "rgba(31,90,169,0.055)"
  },
  petraArch: {
    position: "absolute",
    left: -38,
    top: 170,
    width: 132,
    height: 152,
    borderTopLeftRadius: 66,
    borderTopRightRadius: 66,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: "rgba(159,111,115,0.16)"
  },
  petraArchInner: {
    position: "absolute",
    left: -12,
    top: 202,
    width: 80,
    height: 108,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(184,138,44,0.18)"
  },
  tatreezBand: {
    position: "absolute",
    top: 118,
    left: 22,
    right: 22,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    opacity: 0.22
  },
  tatreezDiamond: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: "rgba(31,90,169,0.48)",
    transform: [{ rotate: "45deg" }]
  },
  tatreezDiamondAlt: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: "rgba(184,138,44,0.46)",
    transform: [{ rotate: "45deg" }]
  },
  patternLine: {
    position: "absolute",
    height: 1,
    left: -80,
    right: -80,
    backgroundColor: "rgba(184,138,44,0.10)",
    transform: [{ rotate: "-17deg" }]
  },
  patternOne: {
    top: 150
  },
  patternTwo: {
    bottom: 210
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    minHeight: 82,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: navy,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(184,138,44,0.42)"
  },
  brand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(184,138,44,0.34)",
    alignItems: "center",
    justifyContent: "center"
  },
  brandName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right"
  },
  brandSub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 2
  },
  languageButton: {
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)"
  },
  languageText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800"
  },
  content: {
    flex: 1,
    paddingHorizontal: 16
  },
  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(31,90,169,0.20)",
    borderRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12
  },
  navItem: {
    width: 86,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  navIconWrap: {
    minWidth: 58,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  navIconWrapActive: {
    backgroundColor: blue,
    borderWidth: 1,
    borderColor: blue
  },
  navLabel: {
    color: muted,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center"
  },
  navLabelActive: {
    color: blue,
    fontWeight: "700"
  },
  logoBlock: {
    alignItems: "center"
  },
  logoImage: {
    width: 210,
    height: 250
  },
  logoLatin: {
    marginTop: -4,
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.5
  }
});
