import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseConfig";

export default function GroupScreen() {
  const router = useRouter();
  const [groupData, setGroupData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [user, setUser] = useState(null);

  const alertAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (activeAlert) {
      Animated.spring(alertAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    } else {
      Animated.timing(alertAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [activeAlert]);

  useEffect(() => {
    let unsubGroup = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/screens/Authscreen");
        return;
      }

      setUser(firebaseUser);

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!userDoc.exists()) {
          router.replace("/screens/Authscreen");
          return;
        }

        const uData = userDoc.data();
        setUserData(uData);

        if (!uData?.groupId) {
          router.replace("/screens/Homescreen");
          return;
        }

        unsubGroup = onSnapshot(doc(db, "groups", uData.groupId), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setGroupData({ id: snap.id, ...data });

            if (!uData.isHost && data.activeAlert) {
              setActiveAlert(data.activeAlert);
            } else {
              setActiveAlert(null);
            }
          }
          setLoading(false);
        });
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubGroup) unsubGroup();
    };
  }, []);

  const handleShare = async () => {
    if (!groupData?.inviteCode) return;
    try {
      await Share.share({
        message: `Join my Epilog group! Use invite code: ${groupData.inviteCode}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendAlert = async () => {
    const user = auth.currentUser;
    if (!groupData || !user) return;
    setSendingAlert(true);
    try {
      await updateDoc(doc(db, "groups", groupData.id), {
        activeAlert: {
          triggeredBy: user.displayName,
          timestamp: serverTimestamp(),
        },
      });
    } catch (e) {
      Alert.alert("Error", "Could not send alert.");
      console.error(e);
    } finally {
      setSendingAlert(false);
    }
  };

  const handleClearAlert = async () => {
    if (!groupData) return;
    try {
      await updateDoc(doc(db, "groups", groupData.id), {
        activeAlert: deleteField(),
      });
      setActiveAlert(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveGroup = () => {
    const user = auth.currentUser;
    if (!user) return;
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              groupId: null,
              isHost: false,
            });
            router.replace("/screens/Homescreen");
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/screens/Authscreen");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#7B6FF0" size="large" />
      </View>
    );
  }

  const members = groupData?.members ? Object.entries(groupData.members) : [];
  const isHost = userData?.isHost;

  const alertTranslate = alertAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Alert Banner — non-hosts only */}
      {!isHost && activeAlert && (
        <Animated.View
          style={[
            styles.alertBanner,
            { transform: [{ translateY: alertTranslate }] },
          ]}
        >
          <View style={styles.alertContent}>
            <View style={styles.alertDot} />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>ASSISTANCE NEEDED</Text>
              <Text style={styles.alertMessage}>
                {activeAlert.triggeredBy} requires assistance!
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => setActiveAlert(null)}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.roleLabel}>
              {isHost ? "🟣 Host" : "Member"}
            </Text>
            <Text style={styles.groupName}>Your Group</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>INVITE CODE</Text>
          <Text style={styles.codeValue}>{groupData?.inviteCode}</Text>
          <Text style={styles.codeHint}>
            Share this with people you want to add
          </Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share Invite Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map(([uid, name]) => (
            <View key={uid} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <Text style={styles.memberName}>{name}</Text>
              {uid === groupData?.hostId && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {isHost && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Alert</Text>
            <Text style={styles.sectionSubtitle}>
              Notifies all group members that you need assistance.
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.alertBtn,
                  sendingAlert && styles.alertBtnDisabled,
                ]}
                onPress={handleSendAlert}
                disabled={sendingAlert}
              >
                {sendingAlert ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.alertBtnIcon}>⚠</Text>
                    <Text style={styles.alertBtnText}>Send Alert</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
            {groupData?.activeAlert && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAlert}
              >
                <Text style={styles.clearBtnText}>Clear Active Alert</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
          <Text style={styles.leaveBtnText}>Leave Group</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 },
  alertBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#7B6FF0",
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 24,
    shadowColor: "#7B6FF0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  alertDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    opacity: 0.9,
  },
  alertText: { flex: 1 },
  alertTitle: {
    color: "#ffffff99",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4,
  },
  alertMessage: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  dismissBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff20",
  },
  dismissText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  roleLabel: {
    color: "#555",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  groupName: { color: "#f0f0f0", fontSize: 24, fontWeight: "800" },
  signOutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  signOutText: { color: "#555", fontSize: 13, fontWeight: "600" },
  codeCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    marginBottom: 28,
  },
  codeLabel: {
    color: "#555",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 10,
  },
  codeValue: {
    color: "#7B6FF0",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 8,
    marginBottom: 8,
  },
  codeHint: { color: "#444", fontSize: 12, marginBottom: 16 },
  shareBtn: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 12,
    alignItems: "center",
  },
  shareBtnText: { color: "#aaa", fontWeight: "600", fontSize: 14 },
  section: { marginBottom: 32 },
  sectionTitle: {
    color: "#f0f0f0",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: "#555",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#141414",
    gap: 12,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1e1e1e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  memberAvatarText: { color: "#7B6FF0", fontWeight: "700", fontSize: 15 },
  memberName: { flex: 1, color: "#ccc", fontSize: 15, fontWeight: "500" },
  hostBadge: {
    backgroundColor: "#7B6FF020",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#7B6FF040",
  },
  hostBadgeText: { color: "#7B6FF0", fontSize: 11, fontWeight: "700" },
  alertBtn: {
    backgroundColor: "#7B6FF0",
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#7B6FF0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  alertBtnDisabled: { opacity: 0.5 },
  alertBtnIcon: { fontSize: 20, color: "#fff" },
  alertBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  clearBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  clearBtnText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  leaveBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  leaveBtnText: { color: "#444", fontSize: 14, fontWeight: "600" },
});
