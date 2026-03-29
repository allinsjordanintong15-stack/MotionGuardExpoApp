import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { db } from "../config/firebase";
import { ThemeContext } from "../config/ThemeContext";

interface SettingsData {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  darkMode: boolean;
  deviceName: string;
  firmwareVersion: string;
  appVersion: string;
}

export default function Settings() {
  const theme = useContext(ThemeContext);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "main"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SettingsData;
        setSettings(data);
        setDeviceName(data.deviceName);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateSetting = async (field: string, value: any) => {
    await updateDoc(doc(db, "settings", "main"), { [field]: value });
  };

  const updateDeviceName = async () => {
    await updateSetting("deviceName", deviceName);
  };

  if (loading || !settings) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      {/* Notifications */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Notifications
        </Text>
        <View style={styles.row}>
          <Text style={{ color: theme.text }}>Enable Alerts</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(v) => updateSetting("notificationsEnabled", v)}
          />
        </View>
        <View style={styles.row}>
          <Text style={{ color: theme.text }}>Notification Sound</Text>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => updateSetting("soundEnabled", v)}
          />
        </View>
      </View>

      {/* Appearance */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Appearance
        </Text>
        <View style={styles.row}>
          <Text style={{ color: theme.text }}>Dark Mode</Text>
          <Switch
            value={settings.darkMode}
            onValueChange={(v) => updateSetting("darkMode", v)}
          />
        </View>
      </View>

      {/* Device */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Device</Text>
        <Text style={{ color: theme.text }}>Device Name</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: theme.border, color: theme.text },
          ]}
          value={deviceName}
          onChangeText={setDeviceName}
          onEndEditing={updateDeviceName}
        />
        <Text style={{ color: theme.subText }}>
          Firmware Version: {settings.firmwareVersion}
        </Text>
      </View>

      {/* App Info */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          App Info
        </Text>
        <Text style={{ color: theme.subText }}>
          App Version: {settings.appVersion}
        </Text>
        <Text style={{ color: theme.subText }}>
          MotionGuard Security System
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  card: { padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
  sectionTitle: { fontWeight: "bold", marginBottom: 15, fontSize: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginTop: 10 },
});
