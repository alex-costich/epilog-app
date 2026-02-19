import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebaseConfig";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !displayName)) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace("/screens/Homescreen");
      } else {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(userCred.user, { displayName });
        await setDoc(doc(db, "users", userCred.user.uid), {
          displayName,
          email,
          groupId: null,
          isHost: false,
        });
        router.replace("/screens/Homescreen");
      }
    } catch (error) {
      const messages = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/email-already-in-use": "This email is already registered.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Invalid email or password.",
      };
      Alert.alert("Error", messages[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.logoMark}>
          <View style={styles.pulse} />
          <Text style={styles.moon}>☽</Text>
        </View>
        <Text style={styles.appName}>epilog</Text>
        <Text style={styles.tagline}>Help is already close.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, isLogin && styles.toggleActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text
              style={[styles.toggleText, isLogin && styles.toggleTextActive]}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !isLogin && styles.toggleActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text
              style={[styles.toggleText, !isLogin && styles.toggleTextActive]}
            >
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="How others will see you"
              placeholderTextColor="#555"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.authBtn, loading && styles.authBtnDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.authBtnText}>
              {isLogin ? "Sign In" : "Create Account"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoMark: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  pulse: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#7B6FF0",
    opacity: 0.6,
  },
  moon: {
    fontSize: 28,
    paddingLeft: 5,
    color: "#a78bfa",
  },
  appName: {
    fontSize: 38,
    fontWeight: "800",
    color: "#f0f0f0",
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 13,
    color: "#555",
    marginTop: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#222",
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#0a0a0a",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "#7B6FF0",
  },
  toggleText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 14,
  },
  toggleTextActive: {
    color: "#fff",
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f0f0f0",
    fontSize: 15,
  },
  authBtn: {
    backgroundColor: "#7B6FF0",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  authBtnDisabled: {
    opacity: 0.6,
  },
  authBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
