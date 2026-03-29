import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { router } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext, ThemeProvider } from "../config/ThemeContext";

function CustomDrawerContent(props: any) {
  const theme = useContext(ThemeContext);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        flex: 1,
        backgroundColor: theme.background,
      }}
    >
      {/* TOP */}
      <View>
        <DrawerItem
          label="Dashboard"
          labelStyle={{ color: theme.text }}
          onPress={() => router.push("/")}
        />
        <DrawerItem
          label="Motion Logs"
          labelStyle={{ color: theme.text }}
          onPress={() => router.push("/motion-logs")}
        />
        <DrawerItem
          label="Settings"
          labelStyle={{ color: theme.text }}
          onPress={() => router.push("/settings")}
        />

        <DrawerItem
          label="Add Sensor"
          labelStyle={{ color: theme.text }}
          onPress={() => router.push("/add-sensor")}
        />
      </View>

      {/* PROFILE */}
      <View style={styles.profileSection}>
        <View style={[styles.divider, { backgroundColor: theme.subText }]} />
        <DrawerItem
          label="Profile"
          labelStyle={{ color: theme.text }}
          onPress={() => router.push("/profile")}
        />
      </View>
    </DrawerContentScrollView>
  );
}

function DrawerLayout() {
  const theme = useContext(ThemeContext);

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.card },
        headerTitleStyle: { color: theme.text },
        drawerStyle: { backgroundColor: theme.background },
        drawerLabelStyle: { color: theme.text },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="index"
        options={{ drawerLabel: () => null, title: "Dashboard" }}
      />
      <Drawer.Screen
        name="motion-logs"
        options={{ drawerLabel: () => null, title: "Motion Logs" }}
      />
      <Drawer.Screen
        name="settings"
        options={{ drawerLabel: () => null, title: "Settings" }}
      />

      <Drawer.Screen
        name="add-sensor"
        options={{ drawerLabel: () => null, title: "Add Sensor" }}
      />

      <Drawer.Screen
        name="profile"
        options={{ drawerLabel: () => null, title: "Profile" }}
      />
    </Drawer>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <DrawerLayout />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  profileSection: { marginTop: "auto" },
  divider: { height: 1, marginVertical: 10 },
});
