import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import React from "react";
import { useTheme } from "react-native-paper";

import { AuthGate } from "@/components/AuthGate";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

const TAB_ICON_SIZE = 32;

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={TAB_ICON_SIZE} {...props} />;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGate>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarStyle: { height: 60 },
          headerShown: useClientOnlyValue(false, true),
          headerRight: () => <ThemeToggleButton />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="view-dashboard"
                size={TAB_ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="studios"
          options={{
            title: "Studios",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="palette"
                size={TAB_ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          }}
        />
      </Tabs>
    </AuthGate>
  );
}
