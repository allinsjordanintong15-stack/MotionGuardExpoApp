// components/MotionLogsList.tsx
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

type MotionLog = {
  id: string;
  detected: boolean;
  location: string;
  timestamp: string;
};

type Props = {
  logs: MotionLog[];
};

export default function MotionLogsList({ logs }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Motions</Text>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <Text style={styles.location}>{item.location}</Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            <Text style={styles.detected}>
              {item.detected ? "Detected ✅" : "No Motion ❌"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  logCard: {
    backgroundColor: "#2c2c2c",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  location: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  timestamp: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
  detected: {
    fontSize: 14,
    color: "#4cd137",
    marginTop: 2,
  },
});
