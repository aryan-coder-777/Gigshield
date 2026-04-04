import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar, Platform, Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GCard, GBadge, GDivider } from '../../components/GCard';
import ZoneCoverageMap from '../../components/ZoneCoverageMap';
import { triggersAPI, type TriggerSimulatePayload } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { ZoneCenter } from '../../lib/geoUtils';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';

const TRIGGER_CONFIG: Record<string, { emoji: string; name: string; color: string }> = {
  RAIN: { emoji: '🌧️', name: 'Heavy Rainfall', color: Colors.indigo },
  EXTREME_HEAT: { emoji: '🌡️', name: 'Extreme Heat', color: Colors.danger },
  HAZARDOUS_AQI: { emoji: '🏭', name: 'Hazardous AQI', color: Colors.warning },
  FLOOD: { emoji: '🌊', name: 'Flood Alert', color: Colors.indigo },
  HUB_SHUTDOWN: { emoji: '🏢', name: 'Hub Shutdown', color: Colors.warning },
  CURFEW: { emoji: '🚫', name: 'Curfew / Strike', color: Colors.danger },
  ROAD_CLOSURE: { emoji: '🚧', name: 'Road Closure', color: Colors.orange },
};

export default function AlertsScreen({ navigation }: any) {
  const { worker } = useAuthStore();
  const toast = useToast();
  const [liveData, setLiveData] = useState<any>(null);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalData, setSuccessModalData] = useState({ title: '', message: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [simulateGpsSpoof, setSimulateGpsSpoof] = useState(false);
  const [simulateLowWeatherHistory, setSimulateLowWeatherHistory] = useState(false);
  const [zoneCatalog, setZoneCatalog] = useState<ZoneCenter[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'granted' | 'denied' | 'error'>('idle');
  const [attachRealGps, setAttachRealGps] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const [activeRes, checkRes] = await Promise.allSettled([
        triggersAPI.getActive(),
        triggersAPI.checkAll(),
      ]);
      if (activeRes.status === 'fulfilled') {
        setLiveData(activeRes.value.data);
        setDbEvents(activeRes.value.data.db_events || []);
      }
    } catch {}
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    triggersAPI
      .getZonesGeo()
      .then((r) => {
        if (!cancelled) setZoneCatalog(r.data.zones || []);
      })
      .catch(() => {
        if (!cancelled) setZoneCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocStatus('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserLat(pos.coords.latitude);
          setUserLon(pos.coords.longitude);
          setLocStatus('granted');
        }
      } catch {
        if (!cancelled) setLocStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const simulateTrigger = async (type: string) => {
    const zone = (worker?.zones || ['Tambaram'])[0];
    setSimulating(type);
    try {
      const payload: TriggerSimulatePayload = {
        trigger_type: type,
        zone,
        simulate_gps_spoof: simulateGpsSpoof,
        simulate_low_weather_history: simulateLowWeatherHistory,
      };
      if (attachRealGps && userLat != null && userLon != null) {
        payload.latitude = userLat;
        payload.longitude = userLon;
      }
      const res = await triggersAPI.simulate(payload);
      await fetchAlerts();
      const data = res.data;
      setSuccessModalData({
        title: '🔥 Trigger Fired!',
        message: `${TRIGGER_CONFIG[type]?.name} simulated in ${zone}.\n\n` +
        `✅ ${data.claims_generated} claim(s) auto-created\n` +
        `💰 ₹${data.total_payout_triggered} payout triggered\n\n` +
        `Full pipeline: Trigger → Fraud Check → Auto-Approved → Payout ✓` +
          (attachRealGps && userLat != null ? '\n\n📍 Device GPS was sent for zone validation.' : '')
      });
      setSuccessModalVisible(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Could not simulate trigger');
    } finally {
      setSimulating(null);
    }
  };

  const liveTriggers: any[] = liveData?.live_triggers || [];

  return (
    <LinearGradient colors={['#0A0E1A', '#0A0E1A']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Disruption Alerts</Text>
        <GBadge label={liveTriggers.length > 0 ? `${liveTriggers.length} ACTIVE` : 'ALL CLEAR'} 
          variant={liveTriggers.length > 0 ? 'danger' : 'success'} size="sm" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.indigo} />}
      >
        {/* Zone status */}
        <GCard style={styles.zoneCard}>
          <View style={styles.zoneRow}>
            <Ionicons name="location" size={18} color={Colors.indigo} />
            <Text style={styles.zoneText}>
              Monitoring: {(worker?.zones || ['Tambaram']).join(' · ')} · {worker?.city || 'Chennai'}
            </Text>
          </View>
          <Text style={styles.zoneUpdate}>Live — auto-checks every 15 minutes</Text>
        </GCard>

        {zoneCatalog.length > 0 && (
          <GCard style={styles.mapCard}>
            <Text style={styles.mapSectionTitle}>Coverage map</Text>
            <Text style={styles.mapHint}>
              Circles ≈ insured radius from zone center (server catalog). Green pin: your device when
              location is allowed.
            </Text>
            <ZoneCoverageMap
              catalog={zoneCatalog}
              highlightZoneNames={worker?.zones || ['Tambaram']}
              userLatitude={userLat}
              userLongitude={userLon}
            />
            <View style={styles.locRow}>
              <Ionicons
                name={locStatus === 'granted' ? 'navigate-circle' : 'location-outline'}
                size={18}
                color={locStatus === 'granted' ? Colors.successLight : Colors.textMuted}
              />
              <Text style={styles.locText}>
                {locStatus === 'granted' && userLat != null
                  ? `GPS fix acquired (${userLat.toFixed(4)}, ${userLon!.toFixed(4)})`
                  : locStatus === 'denied'
                    ? 'Location denied — enable to validate zone on simulate'
                    : locStatus === 'error'
                      ? 'Could not read GPS'
                      : 'Requesting location…'}
              </Text>
            </View>
            <View style={styles.gpsToggleRow}>
              <View style={styles.gpsToggleInfo}>
                <Text style={styles.attachGpsTitle}>Send real GPS with demo trigger</Text>
                <Text style={styles.attachGpsSub}>
                  Server checks you are inside the ~10 km zone; otherwise claims block as OUTSIDE_ZONE.
                </Text>
              </View>
              <Switch
                value={attachRealGps}
                onValueChange={setAttachRealGps}
                trackColor={{ false: Colors.border, true: Colors.success }}
                thumbColor={Colors.white}
              />
            </View>
          </GCard>
        )}

        {/* Live triggers */}
        {liveTriggers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Active Right Now</Text>
            {liveTriggers.map((alert: any, i: number) => {
              const conf = TRIGGER_CONFIG[alert.type] || { emoji: '⚠️', name: alert.type, color: Colors.warning };
              return (
                <GCard key={i} style={styles.liveCard}>
                  <View style={styles.liveHeader}>
                    <Text style={styles.liveEmoji}>{conf.emoji}</Text>
                    <View style={styles.liveInfo}>
                      <Text style={styles.liveName}>{conf.name}</Text>
                      <Text style={styles.liveZone}>📍 {alert.zone || worker?.zones?.[0]}</Text>
                    </View>
                    <GBadge label={alert.severity} variant={
                      alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'HIGH' ? 'warning' : 'indigo'
                    } size="sm" />
                  </View>
                  <Text style={styles.liveDesc}>{alert.description}</Text>
                  <View style={styles.liveMeasure}>
                    <Text style={[styles.liveMeasureVal, { color: conf.color }]}>
                      {alert.measured} {alert.unit}
                    </Text>
                    <Text style={styles.liveMeasureThresh}>
                      / threshold {alert.threshold} {alert.unit}
                    </Text>
                  </View>
                  <View style={styles.autoPayoutBadge}>
                    <Ionicons name="flash" size={12} color={Colors.success} />
                    <Text style={styles.autoPayoutText}>
                      Auto-payout initiated for active policy holders
                    </Text>
                  </View>
                </GCard>
              );
            })}
          </View>
        ) : (
          <GCard style={styles.clearCard}>
            <View style={styles.clearContent}>
              <Text style={styles.clearEmoji}>✅</Text>
              <Text style={styles.clearTitle}>All Clear</Text>
              <Text style={styles.clearSub}>
                No active disruptions in your zones right now. Coverage monitoring is active.
              </Text>
            </View>
          </GCard>
        )}

        {/* Recent DB events */}
        {dbEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Recent Events (24h)</Text>
            {dbEvents.slice(0, 5).map((event: any) => {
              const conf = TRIGGER_CONFIG[event.trigger_type] || { emoji: '⚠️', name: event.trigger_type, color: Colors.warning };
              return (
                <GCard key={event.id} style={styles.eventCard}>
                  <View style={styles.eventRow}>
                    <Text style={styles.eventEmoji}>{conf.emoji}</Text>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventType}>{conf.name}</Text>
                      <Text style={styles.eventZone}>{event.zone} · {event.severity}</Text>
                      <Text style={styles.eventDate}>
                        {new Date(event.detected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.eventStats}>
                      <Text style={styles.eventPayouts}>₹{event.total_payout_triggered}</Text>
                      <Text style={styles.eventClaims}>{event.claims_generated} claims</Text>
                    </View>
                  </View>
                </GCard>
              );
            })}
          </View>
        )}

        {/* DEMO PANEL */}
        <GCard style={styles.demoPanel}>
          <TouchableOpacity onPress={() => setShowDemo(!showDemo)} style={styles.demoToggle}>
            <View style={styles.demoHeader}>
              <Ionicons name="flask" size={20} color={Colors.orange} />
              <Text style={styles.demoTitle}>🚀 Demo: Simulate Trigger</Text>
            </View>
            <Ionicons name={showDemo ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {showDemo && (
            <>
              <Text style={styles.demoSub}>
                Fire a live trigger and watch the full pipeline: detection → fraud check → auto-claim → payout. For hackathon demo.
              </Text>
              
              <View style={styles.gpsToggleRow}>
                <View style={styles.gpsToggleInfo}>
                  <Text style={styles.gpsToggleTitle}>Simulate GPS Spoofing / Rooted Device</Text>
                  <Text style={styles.gpsToggleSub}>Location integrity fails — claims BLOCKED.</Text>
                </View>
                <Switch 
                  value={simulateGpsSpoof}
                  onValueChange={setSimulateGpsSpoof}
                  trackColor={{ false: Colors.border, true: Colors.danger }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={[styles.gpsToggleRow, styles.weatherToggleRow]}>
                <View style={styles.gpsToggleInfo}>
                  <Text style={styles.gpsToggleTitle}>Fake weather vs history (Phase 3)</Text>
                  <Text style={styles.gpsToggleSub}>
                    Forces low historical consistency so AI flags REVIEW / BLOCKED (Isolation Forest + rules).
                  </Text>
                </View>
                <Switch
                  value={simulateLowWeatherHistory}
                  onValueChange={setSimulateLowWeatherHistory}
                  trackColor={{ false: Colors.border, true: Colors.warning }}
                  thumbColor={Colors.white}
                />
              </View>

              <GDivider />
              <View style={styles.demoGrid}>
                {Object.entries(TRIGGER_CONFIG).map(([type, conf]) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => simulateTrigger(type)}
                    style={[styles.demoTriggerBtn, simulating === type && styles.demoTriggerBtnActive]}
                    disabled={!!simulating}
                  >
                    <Text style={styles.demoTriggerEmoji}>{conf.emoji}</Text>
                    <Text style={styles.demoTriggerName}>{conf.name}</Text>
                    {simulating === type && (
                      <Text style={styles.demoFiringText}>Firing...</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </GCard>
      </ScrollView>
      
      <ConfirmModal
        visible={successModalVisible}
        title={successModalData.title}
        message={successModalData.message}
        confirmText="View Claims"
        cancelText="OK"
        variant="success"
        icon="flash"
        onConfirm={() => {
          setSuccessModalVisible(false);
          navigation.navigate('Claims');
        }}
        onCancel={() => setSuccessModalVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : Platform.OS === 'web' ? 8 : 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  zoneCard: { marginBottom: 16 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', flex: 1 },
  zoneUpdate: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  mapCard: { marginBottom: 16 },
  mapSectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  mapHint: { fontSize: 11, color: Colors.textMuted, lineHeight: 16, marginBottom: 10 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 10 },
  locText: { flex: 1, fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
  attachGpsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  attachGpsSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2, lineHeight: 15 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  liveCard: { marginBottom: 10, borderColor: Colors.danger + '40' },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  liveEmoji: { fontSize: 28 },
  liveInfo: { flex: 1 },
  liveName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  liveZone: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  liveDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 8 },
  liveMeasure: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  liveMeasureVal: { fontSize: 20, fontWeight: '900' },
  liveMeasureThresh: { fontSize: 12, color: Colors.textMuted },
  autoPayoutBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successGlow, borderRadius: 6, padding: 8,
  },
  autoPayoutText: { fontSize: 11, color: Colors.successLight, fontWeight: '600' },
  clearCard: { marginBottom: 20, alignItems: 'center', padding: 40 },
  clearContent: { alignItems: 'center', gap: 10 },
  clearEmoji: { fontSize: 52 },
  clearTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  clearSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  eventCard: { marginBottom: 8, padding: 14 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventEmoji: { fontSize: 22 },
  eventInfo: { flex: 1 },
  eventType: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  eventZone: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  eventDate: { fontSize: 10, color: Colors.textDisabled, marginTop: 2 },
  eventStats: { alignItems: 'flex-end' },
  eventPayouts: { fontSize: 14, fontWeight: '800', color: Colors.successLight },
  eventClaims: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  demoPanel: { marginBottom: 20, borderColor: Colors.orange + '40' },
  demoToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoTitle: { fontSize: 15, fontWeight: '800', color: Colors.orangeLight },
  demoSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 12, lineHeight: 18 },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  demoTriggerBtn: {
    width: '30%', alignItems: 'center', padding: 10,
    backgroundColor: Colors.glass, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.glassBorder,
    gap: 4,
  },
  demoTriggerBtnActive: { borderColor: Colors.orange, backgroundColor: Colors.orangeGlow },
  demoTriggerEmoji: { fontSize: 24 },
  demoTriggerName: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  demoFiringText: { fontSize: 9, color: Colors.orange, fontWeight: '700' },
  gpsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.danger + '10', padding: 12, borderRadius: 10, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: Colors.danger + '30' },
  weatherToggleRow: { backgroundColor: Colors.warning + '10', borderColor: Colors.warning + '35', marginTop: 8 },
  gpsToggleInfo: { flex: 1, paddingRight: 10 },
  gpsToggleTitle: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  gpsToggleSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
});
