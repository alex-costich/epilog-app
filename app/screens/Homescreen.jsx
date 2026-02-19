import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseConfig";

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function HomeScreen() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingGroup, setCheckingGroup] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/screens/Authscreen");
        return;
      }
      setUser(firebaseUser);
      checkExistingGroup(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const checkExistingGroup = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.groupId) {
          router.replace("/screens/Groupscreen");
          return;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingGroup(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const groupId = doc(collection(db, "groups")).id;
      const code = generateCode();

      await setDoc(doc(db, "groups", groupId), {
        hostId: user.uid,
        hostName: user.displayName,
        members: { [user.uid]: user.displayName },
        inviteCode: code,
        createdAt: new Date(),
        activeAlert: null,
      });

      await updateDoc(doc(db, "users", user.uid), {
        groupId,
        isHost: true,
      });

      router.replace("/screens/Groupscreen");
    } catch (e) {
      Alert.alert("Error", "Could not create group. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user) return;
    if (!inviteCode.trim()) {
      Alert.alert("Missing code", "Please enter an invite code.");
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "groups"),
        where("inviteCode", "==", inviteCode.trim().toUpperCase()),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("Invalid code", "No group found with that invite code.");
        setLoading(false);
        return;
      }

      const groupDoc = snapshot.docs[0];
      const groupId = groupDoc.id;

      await updateDoc(doc(db, "groups", groupId), {
        [`members.${user.uid}`]: user.displayName,
      });

      await updateDoc(doc(db, "users", user.uid), {
        groupId,
        isHost: false,
      });

      router.replace("/screens/Groupscreen");
    } catch (e) {
      Alert.alert("Error", "Could not join group. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/screens/Authscreen");
  };

  if (checkingGroup) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#7B6FF0" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.displayName || "User"}</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.accentLine} />
        <Text style={styles.sectionTitle}>No group yet</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Create a new group or join an existing one with an invite code.
      </Text>

      {/* Create Group */}
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>⊕</Text>
        </View>
        <Text style={styles.cardTitle}>Create a Group</Text>
        <Text style={styles.cardDesc}>
          Start a new group. You'll be the host and can send alerts to members.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Join Group */}
      <View style={styles.card}>
        <View style={[styles.cardIcon, styles.cardIconAlt]}>
          <Text style={styles.cardIconText}>→</Text>
        </View>
        <Text style={styles.cardTitle}>Join a Group</Text>
        <Text style={styles.cardDesc}>
          Enter an invite code shared by your group host.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code (e.g. ABC123)"
          placeholderTextColor="#555"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.secondaryBtn, loading && styles.btnDisabled]}
          onPress={handleJoinGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#7B6FF0" />
          ) : (
            <Text style={styles.secondaryBtnText}>Join Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 48,
  },
  greeting: {
    color: "#555",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  userName: { color: "#f0f0f0", fontSize: 22, fontWeight: "700", marginTop: 2 },
  signOutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  signOutText: { color: "#555", fontSize: 13, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  accentLine: {
    width: 3,
    height: 20,
    backgroundColor: "#7B6FF0",
    borderRadius: 2,
  },
  sectionTitle: { color: "#f0f0f0", fontSize: 20, fontWeight: "700" },
  sectionSubtitle: {
    color: "#555",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#7B6FF020",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconAlt: { backgroundColor: "#ffffff10" },
  cardIconText: { fontSize: 20, color: "#7B6FF0" },
  cardTitle: {
    color: "#f0f0f0",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardDesc: { color: "#555", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  input: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f0f0f0",
    fontSize: 15,
    marginBottom: 16,
    letterSpacing: 2,
  },
  primaryBtn: {
    backgroundColor: "#7B6FF0",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#7B6FF0",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#7B6FF0", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#222" },
  dividerText: { color: "#444", fontSize: 13, fontWeight: "600" },
});
