import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, Platform, PermissionsAndroid, StatusBar,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import { atob, btoa } from 'react-native-quick-base64';

// CONNECTS TO FIRST DEVICE, BUT ONCE I UNBIND THE CONNECTION AND SCAN AND CONNECT AGAIN, IT DOES NOT WORK
// IT LOSES CONNECTION FOR SOME REASON ONCE CONNECTED AFTER ~15-20s

const { width } = Dimensions.get('window');

const MOCK_MODE = false;

const MOCK = {
  connected: true,
  devName:   'Arduino XIAO',
  battery:   72,
  emgActive: true,
  emgMsg:    'EMG activo -> 90,90',
  log: [
    { msg: 'Suscripciones activas',   type: 'success', time: '12:00:05' },
    { msg: 'Batería: 72%',            type: 'success', time: '12:00:04' },
    { msg: 'Conectado: Arduino XIAO', type: 'success', time: '12:00:03' },
    { msg: 'Encontrado: Arduino XIAO',type: 'info',    time: '12:00:02' },
    { msg: 'Bluetooth listo',         type: 'success', time: '12:00:00' },
  ],
};

const BATTERY_SVC  = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_CHAR = '00002a19-0000-1000-8000-00805f9b34fb';
const EMG_SVC      = '0000180f-0000-1000-8000-00805f9b34fb';
const EMG_CHAR     = '19b10001-e8f2-537e-4f6c-d104768a1214';

const TARGET_NAME  = 'MyoCapsule';

const C = {
  bg:        '#080810',
  surface:   '#0F0F1A',
  card:      '#141420',
  border:    '#22223A',
  accent:    '#00FFB2',
  accentDim: '#00FFB215',
  danger:    '#FF4466',
  dangerDim: '#FF446615',
  warn:      '#FFB800',
  text:      '#E8E8F4',
  textMuted: '#5A5A7A',
  textDim:   '#2A2A4A',
};

const manager = MOCK_MODE ? null : new BleManager();
function decodeB64(b64) { try { return atob(b64); } catch { return ''; } }
function parseBat(b64)  { try { return atob(b64).charCodeAt(0); } catch { return null; } }

function usePulse(active) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (active) {
      Animated.loop(Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    } else {
      a.stopAnimation();
      Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [active]);
  return a;
}

function SignalWave({ active }) {
  const bars  = [0.3, 0.6, 0.9, 0.5, 1.0, 0.7, 0.4, 0.8, 0.5, 0.3, 0.9, 0.6];
  const anims = useRef(bars.map(() => new Animated.Value(0.1))).current;
  useEffect(() => {
    if (active) {
      Animated.parallel(anims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 55),
          Animated.timing(a, { toValue: bars[i], duration: 280 + i * 25, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(a, { toValue: 0.1,     duration: 280 + i * 25, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]))
      )).start();
    } else {
      anims.forEach(a => { a.stopAnimation(); Animated.timing(a, { toValue: 0.1, duration: 300, useNativeDriver: false }).start(); });
    }
  }, [active]);
  return (
    <View style={ss.wave}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[ss.waveBar, {
          height: a.interpolate({ inputRange: [0, 1], outputRange: [3, 36] }),
          backgroundColor: active ? C.accent : C.textDim,
        }]} />
      ))}
    </View>
  );
}

function BatteryBar({ pct }) {
  const color = pct > 50 ? C.accent : pct > 20 ? C.warn : C.danger;
  const anim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct / 100, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={ss.batOuter}>
      <Animated.View style={[ss.batFill, {
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: color,
      }]} />
    </View>
  );
}

function LogEntry({ entry }) {
  const color = entry.type === 'error' ? C.danger : entry.type === 'success' ? C.accent : C.textMuted;
  return (
    <View style={ss.logRow}>
      <Text style={ss.logTime}>{entry.time}</Text>
      <View style={[ss.logDot, { backgroundColor: color }]} />
      <Text style={[ss.logMsg, { color }]} numberOfLines={1}>{entry.msg}</Text>
    </View>
  );
}

function MockBanner() {
  return (
    <View style={ss.mockBanner}>
      <Text style={ss.mockText}>⚠ MOCK MODE — datos simulados</Text>
    </View>
  );
}

export default function App() {
  const [bleReady,   setBleReady]   = useState(MOCK_MODE);
  const [connecting, setConnecting] = useState(false);
  const [connected,  setConnected]  = useState(MOCK_MODE ? MOCK.connected : false);
  const [connDev,    setConnDev]    = useState(MOCK_MODE ? { name: MOCK.devName } : null);
  const [battery,    setBattery]    = useState(MOCK_MODE ? MOCK.battery : null);
  const [emgActive,  setEmgActive]  = useState(MOCK_MODE ? MOCK.emgActive : false);
  const [emgMsg,     setEmgMsg]     = useState(MOCK_MODE ? MOCK.emgMsg : '—');
  const [log,        setLog]        = useState(MOCK_MODE ? MOCK.log : []);

  const devRef   = useRef(null);
  const subs     = useRef([]);
  const connAnim = usePulse(connected);

  const addLog = useCallback((msg, type = 'info') => {
    const n = new Date();
    const t = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
    setLog(p => [{ msg, type, time: t }, ...p].slice(0, 80));
  }, []);

  useEffect(() => {
    if (MOCK_MODE) return;
    const sub = manager.onStateChange(s => {
      if (s === State.PoweredOn) { setBleReady(true); addLog('Bluetooth listo', 'success'); }
      else addLog(`BT: ${s}`, 'error');
    }, true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (MOCK_MODE) return;
    return () => {
      subs.current.forEach(s => { try { s.remove(); } catch {} });
      if (devRef.current) devRef.current.cancelConnection();
    };
  }, []);

  const reqPerms = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const r = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(r).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
  }, []);

  const subscribe = useCallback(async (dev) => {
    try {
      try {
        const c = await dev.readCharacteristicForService(BATTERY_SVC, BATTERY_CHAR);
        const p = parseBat(c.value);
        if (p !== null) { setBattery(p); addLog(`Batería: ${p}%`, 'success'); }
      } catch {}
      subs.current.push(dev.monitorCharacteristicForService(BATTERY_SVC, BATTERY_CHAR, (e, c) => {
        if (!e && c) { const p = parseBat(c.value); if (p !== null) setBattery(p); }
      }));
      try {
        const c = await dev.readCharacteristicForService(EMG_SVC, EMG_CHAR);
        const m = decodeB64(c.value);
        if (m) { setEmgMsg(m); setEmgActive(m.toLowerCase().includes('activo')); }
      } catch {}
      subs.current.push(dev.monitorCharacteristicForService(EMG_SVC, EMG_CHAR, (e, c) => {
        if (!e && c) {
          const m = decodeB64(c.value);
          if (!m) return;
          setEmgMsg(m);
          const act = m.toLowerCase().includes('activo');
          setEmgActive(act);
          addLog(m, act ? 'success' : 'info');
        }
      }));
      addLog('Suscripciones activas', 'success');
    } catch (e) {
      addLog(`Error suscripción: ${e.message}`, 'error');
    }
  }, [addLog]);

  // ── Connect — scans until TARGET_NAME found, then connects immediately ────
  const connect = useCallback(async () => {
    if (!bleReady) { addLog('Bluetooth no disponible', 'error'); return; }
  
    const ok = await reqPerms();
    if (!ok) { addLog('Permisos denegados', 'error'); return; }
  
    setConnecting(true);
    addLog(`Buscando "${TARGET_NAME}"…`);
  
    manager.startDeviceScan(null, { allowDuplicates: false }, async (err, dev) => {
      if (err) { addLog(`Scan error: ${err.message}`, 'error'); setConnecting(false); return; }
  
      const name = dev?.name ?? dev?.localName ?? '';
      if (!name.includes(TARGET_NAME)) return;
  
      manager.stopDeviceScan();
      addLog(`Encontrado: ${name}`, 'info');
  
      try {
        const d = await dev.connect({ timeout: 10000 });
        await d.discoverAllServicesAndCharacteristics();
  
        devRef.current = d;
        setConnected(true);
        setConnDev({ name });
        setConnecting(false);
        addLog(`Conectado: ${name}`, 'success');
  
        d.onDisconnected(() => {
          setConnected(false);
          setConnDev(null);
          devRef.current = null;
          addLog('Desconectado', 'error');
        });
  
        await subscribe(d);
  
      } catch (e) {
        addLog(`Error: ${e.message}`, 'error');
        setConnecting(false);
      }
    });
  
    setTimeout(() => {
      if (!devRef.current) {
        manager.stopDeviceScan();
        setConnecting(false);
        addLog(`"${TARGET_NAME}" no encontrado (timeout)`, 'error');
      }
    }, 15000);
  }, [bleReady, reqPerms, addLog, subscribe]);

  const disconnect = useCallback(async () => {
    if (MOCK_MODE) {
      setConnected(false); setConnDev(null);
      setBattery(null); setEmgActive(false); setEmgMsg('—');
      addLog('Desconectado (mock)');
      return;
    }
    subs.current.forEach(s => { try { s.remove(); } catch {} });
    subs.current = [];
    if (devRef.current) { try { await devRef.current.cancelConnection(); } catch {} }
    setConnected(false); setConnDev(null); devRef.current = null;
    setBattery(null); setEmgActive(false); setEmgMsg('—');
    addLog('Desconectado manualmente');
  }, [addLog]);

  const recalibrate = useCallback(async () => {
    if (MOCK_MODE) { addLog('Recalibración enviada (mock)', 'success'); return; }
    if (!devRef.current) return;
    try {
      await devRef.current.writeCharacteristicWithResponseForService(EMG_SVC, EMG_CHAR, btoa('C'));
      addLog('Recalibración enviada', 'success');
    } catch (e) {
      addLog(`Error recalibrar: ${e.message}`, 'error');
    }
  }, [addLog]);

  const batColor = battery === null ? C.textDim : battery > 50 ? C.accent : battery > 20 ? C.warn : C.danger;

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {MOCK_MODE && <MockBanner />}

      <View style={ss.header}>
        <View>
          <Text style={ss.title}>e<Text style={{ color: C.accent }}>Redi</Text></Text>
          <Text style={ss.subtitle}>Prosthetic Monitor v1</Text>
        </View>
        <View style={[ss.pill, { borderColor: connected ? C.accent + '40' : C.border }]}>
          <Animated.View style={[ss.pillDot, {
            backgroundColor: connected ? C.accent : C.danger,
            opacity: connected ? connAnim.interpolate({ inputRange: [0,1], outputRange: [0.5, 1] }) : 1,
          }]} />
          <Text style={[ss.pillText, { color: connected ? C.accent : C.danger }]}>
            {connected ? (connDev?.name || 'ONLINE') : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView style={ss.scroll} contentContainerStyle={ss.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[ss.card, emgActive && { borderColor: C.accent + '50' }]}>
          <View style={ss.row}>
            <Text style={ss.label}>SEÑAL EMG</Text>
            <View style={[ss.badge, { backgroundColor: emgActive ? C.accentDim : C.dangerDim }]}>
              <Text style={[ss.badgeTxt, { color: emgActive ? C.accent : C.danger }]}>
                {emgActive ? 'ACTIVO' : 'REPOSO'}
              </Text>
            </View>
          </View>
          <SignalWave active={emgActive} />
          <Text style={ss.emgMsg}>{emgMsg}</Text>
        </View>

        <View style={ss.card}>
          <View style={ss.row}>
            <Text style={ss.label}>BATERÍA</Text>
            <Text style={[ss.batPct, { color: batColor }]}>{battery !== null ? `${battery}%` : '—'}</Text>
          </View>
          {battery !== null ? <BatteryBar pct={battery} /> : <Text style={ss.noData}>Sin datos</Text>}
        </View>

        <View style={ss.controlRow}>
          {!connected ? (
            <TouchableOpacity
              style={[ss.btn, ss.btnPrimary, (!bleReady || connecting) && ss.btnDisabled]}
              onPress={connect}
              activeOpacity={0.7}
              disabled={!bleReady || connecting}
            >
              {connecting
                ? <><ActivityIndicator size="small" color={C.bg} style={{ marginRight: 8 }} /><Text style={ss.btnTxt}>BUSCANDO…</Text></>
                : <Text style={ss.btnTxt}>CONECTAR</Text>
              }
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[ss.btn, ss.btnSecondary]} onPress={recalibrate} activeOpacity={0.7}>
                <Text style={[ss.btnTxt, { color: C.accent }]}>RECALIBRAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ss.btn, ss.btnDanger]} onPress={disconnect} activeOpacity={0.7}>
                <Text style={[ss.btnTxt, { color: C.danger }]}>DESCONECTAR</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={ss.logCard}>
          <View style={ss.row}>
            <Text style={ss.label}>LOG</Text>
            <Text style={ss.logCount}>{log.length} eventos</Text>
          </View>
          <ScrollView style={ss.logScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {log.length === 0
              ? <Text style={ss.noData}>Sin eventos</Text>
              : log.map((e, i) => <LogEntry key={i} entry={e} />)
            }
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  mockBanner:   { backgroundColor: '#2A1A00', paddingVertical: 6, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.warn + '40' },
  mockText:     { fontSize: 11, color: C.warn, fontWeight: '700', letterSpacing: 1 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title:        { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 3 },
  subtitle:     { fontSize: 11, color: C.textMuted, letterSpacing: 1, marginTop: 2 },
  pill:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6, borderWidth: 1 },
  pillDot:      { width: 7, height: 7, borderRadius: 4 },
  pillText:     { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, gap: 12, paddingBottom: 40 },
  card:         { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label:        { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 2 },
  badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:     { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  wave:         { flexDirection: 'row', alignItems: 'center', gap: 3, height: 44, marginBottom: 10 },
  waveBar:      { width: Math.floor((width - 80) / 14), borderRadius: 2 },
  emgMsg:       { fontSize: 12, color: C.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  batOuter:     { height: 8, backgroundColor: C.surface, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  batFill:      { height: '100%', borderRadius: 4 },
  batPct:       { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  noData:       { color: C.textDim, fontSize: 13 },
  controlRow:   { flexDirection: 'row', gap: 10 },
  btn:          { flex: 1, flexDirection: 'row', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimary:   { backgroundColor: C.accent },
  btnSecondary: { backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '40' },
  btnDanger:    { backgroundColor: C.dangerDim, borderWidth: 1, borderColor: C.danger + '40' },
  btnDisabled:  { opacity: 0.5 },
  btnTxt:       { fontSize: 13, fontWeight: '800', color: C.bg, letterSpacing: 1 },
  logCard:      { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  logScroll:    { height: 180, marginTop: 4 },
  logCount:     { fontSize: 11, color: C.textDim },
  logRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  logTime:      { fontSize: 11, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', width: 58 },
  logDot:       { width: 5, height: 5, borderRadius: 3 },
  logMsg:       { fontSize: 12, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
});