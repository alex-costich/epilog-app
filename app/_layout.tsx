import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments.join("/").includes("Authscreen");

    if (!user && !inAuthScreen) {
      router.replace("/screens/Authscreen");
    } else if (user && inAuthScreen) {
      router.replace("/screens/Homescreen");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="screens/Authscreen" />
      <Stack.Screen name="screens/Homescreen" />
      <Stack.Screen name="screens/Groupscreen" />
    </Stack>
  );
}
