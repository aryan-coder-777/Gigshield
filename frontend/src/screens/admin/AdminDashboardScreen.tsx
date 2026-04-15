import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, StatusBar, Platform, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GCard, GBadge, GDivider, GStat } from '../../components/GCard';
import { GButton } from '../../components/GButton';
import { adminAPI, triggersAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const TRIGGER_TYPES = ['RAIN', 'EXTREME_HEAT', 'HAZARDOUS_AQI', 'FLOOD', 'HUB_SHUTDOWN', 'CURFEW', 'ROAD_CLOSURE'];
const TRIGGER_EMOJIS: Record<string, string> = {
  RAIN: '🌧️', EXTREME_HEAT: '🌡️', HAZARDOUS_AQI: '🏭',
  FLOOD: '🌊', HUB_SHUTDOWN: '🏢', CURFEW: '🚫', ROAD_CLOSURE: '🚧',
};

export default function AdminDashboardScreen({ navigation }: any) {
  const { worker, logout } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [flaggedClaims, setFlaggedClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState('Tambaram');
  const [activeTab, setActiveTab] = useState<'overview' | 'claims' | 'triggers' | 'forecast'>('overview');
  const [predictions, setPredictions] = useState<any>(null);
  const [simulateGpsSpoof, setSimulateGpsSpoof] = useState(false);
  const [simulateLowWeatherHistory, setSimulateLowWeatherHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, claimsRes, predRes] = await Promise.allSettled([
        adminAPI.getDashboard(),
        adminAPI.getFlaggedClaims(),
        adminAPI.getPredictions(),
      ]);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
      if (claimsRes.status === 'fulfilled') setFlaggedClaims(claimsRes.value.data.flagged_claims || []);
      if (predRes.status === 'fulfilled') setPredictions(predRes.value.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const makeDecision = async (claimId: number, decision: string) => {
    Alert.alert(
      decision === 'approve' ? 'Approve Claim' : 'Reject Claim',
      `Are you sure you want to ${decision} this claim?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: decision === 'approve' ? 'Approve & Pay' : 'Reject', style: decision === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminAPI.makeDecision(claimId, decision, `Admin ${decision}d`);
              await fetchData();
              Alert.alert('Done', `Claim ${decision}d successfully`);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not process decision');
            }
          }
        },
      ]
    );
  };

  const simulateTrigger = async (type: string) => {
    setSimulating(type);
    try {
      const res = await triggersAPI.simulate({
        trigger_type: type,
        zone: selectedZone,
        simulate_gps_spoof: simulateGpsSpoof,
        simulate_low_weather_history: simulateLowWeatherHistory,
      });
      await fetchData();
      const data = res.data;
      Alert.alert('🔥 Trigger Fired!',
        `${type} in ${selectedZone}\n\n✅ ${data.claims_generated} auto-claims\n💰 ₹${data.total_payout_triggered} triggered`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Trigger failed');
    } finally {
      setSimulating(null);
    }
  };

  const summary = dashboard?.summary || {};

  return (
    <LinearGradient colors={['#0A0E1A', '#1a0a1a']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Admin Header */}
      <View style={styles.header}>
        <View>
          <GBadge label="ADMIN PANEL" variant="warning" size="sm" />
          <Text style={styles.title}>GigShield HQ</Text>
        </View>
        <TouchableOpacity
          onPress={async () => { await logout(); }}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['overview', 'claims', 'triggers', 'forecast'].map((t) => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t as any)}
            style={[styles.tab, activeTab === t ? styles.tabActive : null]}>
            <Text style={[styles.tabText, activeTab === t ? styles.tabTextActive : null]} numberOfLines={1}>
              {t === 'overview' ? '📊 Overview' : t === 'claims' ? `⚠️ (${flaggedClaims.length})` : t === 'triggers' ? '🔥 Triggers' : '📈 Forecast'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />}
      >
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              {[
                { label: 'Active Policies', value: summary.active_policies || 0, color: Colors.success, icon: 'shield-checkmark' },
                { label: 'Total Workers', value: summary.total_workers || 0, color: Colors.indigo, icon: 'people' },
                { label: 'Loss Ratio', value: `${summary.loss_ratio || 0}%`, color: summary.loss_ratio > 80 ? Colors.danger : Colors.warning, icon: 'trending-up' },
                { label: 'Fraud Rate', value: `${summary.fraud_detection_rate || 0}%`, color: Colors.warning, icon: 'alert-circle' },
              ].map((kpi, i) => (
                <GCard key={i} style={styles.kpiCard}>
                  <Ionicons name={kpi.icon as any} size={22} color={kpi.color} />
                  <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                </GCard>
              ))}
            </View>

            {/* Financial summary */}
            <GCard style={styles.finCard} glow="warning">
              <Text style={styles.finTitle}>💰 This Week's Financials</Text>
              <GDivider />
              <View style={styles.finRow}>
                <GStat label="Total Premiums" value={`₹${(summary.total_premium_week || 0).toFixed(0)}`} color={Colors.indigoLight} />
                <View style={styles.finDivider} />
                <GStat label="Total Payouts" value={`₹${(summary.total_payout_week || 0).toFixed(0)}`} color={Colors.successLight} />
                <View style={styles.finDivider} />
                <GStat label="Today's Payouts" value={`₹${(summary.total_payout_today || 0).toFixed(0)}`} color={Colors.orangeLight} />
              </View>
            </GCard>

            {/* Claims breakdown */}
            <GCard style={styles.claimsBreakdown}>
              <Text style={styles.finTitle}>📋 Claims This Week</Text>
              <GDivider />
              <View style={styles.claimsRow}>
                {[
                  { label: 'Total', value: summary.total_claims_week || 0, color: Colors.textPrimary },
                  { label: 'Auto-Approved', value: summary.auto_approved_week || 0, color: Colors.success },
                  { label: 'Flagged', value: summary.flagged_week || 0, color: Colors.warning },
                  { label: 'Rejected', value: summary.rejected_week || 0, color: Colors.danger },
                ].map((item, i) => (
                  <View key={i} style={styles.claimsStat}>
                    <Text style={[styles.claimsStatVal, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.claimsStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </GCard>

            {/* Zone heatmap */}
            {dashboard?.zone_heatmap && Object.keys(dashboard.zone_heatmap).length > 0 && (
              <GCard style={styles.heatmapCard}>
                <Text style={styles.finTitle}>🗺️ Zone Disruption Heatmap</Text>
                <GDivider />
                {Object.entries(dashboard.zone_heatmap)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([zone, count]: [string, any], i) => (
                    <View key={i} style={styles.heatmapRow}>
                      <Text style={styles.heatmapZone}>{zone}</Text>
                      <View style={styles.heatmapBarWrapper}>
                        <View style={[styles.heatmapBar, { width: `${Math.min(100, (count / 10) * 100)}%` }]} />
                      </View>
                      <Text style={styles.heatmapCount}>{count}</Text>
                    </View>
                  ))}
              </GCard>
            )}

            {/* Recent triggers */}
            {(dashboard?.recent_triggers || []).slice(0, 5).map((t: any) => (
              <GCard key={t.id} style={styles.triggerCard}>
                <View style={styles.triggerRow}>
                  <Text style={styles.triggerEmoji}>{TRIGGER_EMOJIS[t.type] || '⚠️'}</Text>
                  <View style={styles.triggerInfo}>
                    <Text style={styles.triggerType}>{t.type.replace(/_/g, ' ')}</Text>
                    <Text style={styles.triggerZone}>{t.zone} · {t.severity}</Text>
                    <Text style={styles.triggerDate}>{new Date(t.detected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={styles.triggerStats}>
                    <Text style={styles.triggerPayout}>₹{t.total_payout}</Text>
                    <Text style={styles.triggerClaims}>{t.claims_generated} claims</Text>
                  </View>
                </View>
              </GCard>
            ))}
          </>
        )}

        {/* ── FLAGGED CLAIMS TAB ── */}
        {activeTab === 'claims' && (
          <>
            {flaggedClaims.length === 0 ? (
              <GCard style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyTitle}>No Flagged Claims</Text>
                <Text style={styles.emptySub}>All claims are resolved</Text>
              </GCard>
            ) : (
              flaggedClaims.map((claim) => (
                <GCard key={claim.id} style={styles.flaggedCard}>
                  <View style={styles.flaggedHeader}>
                    <Text style={styles.flaggedType}>{claim.claim_type.replace(/_/g, ' ')}</Text>
                    <GBadge label={claim.fraud_tier} 
                      variant={claim.fraud_tier === 'REVIEW' ? 'warning' : 'danger'} size="sm" />
                  </View>
                  <Text style={styles.flaggedZone}>📍 {claim.zone} · Worker #{claim.worker_id}</Text>
                  <View style={styles.flaggedStats}>
                    <Text style={styles.flaggedAmount}>₹{claim.payout_amount}</Text>
                    <Text style={styles.flaggedScore}>Fraud: {(claim.fraud_score * 100).toFixed(0)}%</Text>
                  </View>

                  {claim.fraud_signals && (
                    <Text style={styles.fraudSignals} numberOfLines={4}>
                      {typeof claim.fraud_signals === 'string'
                        ? claim.fraud_signals
                        : JSON.stringify(claim.fraud_signals)}
                    </Text>
                  )}

                  {claim.appeal_note && (
                    <View style={styles.appealBox}>
                      <Ionicons name="chatbubble-outline" size={14} color={Colors.warning} />
                      <Text style={styles.appealNote}>"{claim.appeal_note}"</Text>
                    </View>
                  )}

                  <View style={styles.decisionRow}>
                    <GButton title="✓ Approve & Pay" onPress={() => makeDecision(claim.id, 'approve')}
                      variant="primary" size="sm" style={{ flex: 1 }} />
                    <GButton title="✗ Reject" onPress={() => makeDecision(claim.id, 'reject')}
                      variant="danger" size="sm" style={{ flex: 1 }} />
                  </View>
                </GCard>
              ))
            )}
          </>
        )}

        {/* ── TRIGGERS TAB ── */}
        {activeTab === 'triggers' && (
          <>
            <GCard style={styles.demoInfo}>
              <Text style={styles.demoInfoTitle}>🚀 Live Demo Control Panel</Text>
              <Text style={styles.demoInfoSub}>
                Fire any trigger to demonstrate the complete automated pipeline for judges. 
                Claims auto-process and payouts initiate within seconds.
              </Text>
            </GCard>

            <GCard style={styles.togglesCard}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>GPS spoof (block)</Text>
                <Switch value={simulateGpsSpoof} onValueChange={setSimulateGpsSpoof} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Low weather-history match</Text>
                <Switch value={simulateLowWeatherHistory} onValueChange={setSimulateLowWeatherHistory} />
              </View>
            </GCard>

            {/* Zone selector */}
            <View style={styles.zoneSelector}>
              {['Tambaram', 'Anna Nagar', 'Velachery', 'Andheri', 'Koramangala'].map((z) => (
                <TouchableOpacity key={z} onPress={() => setSelectedZone(z)}
                  style={[styles.zoneChip, selectedZone === z ? styles.zoneChipActive : null]}>
                  <Text style={[styles.zoneChipText, selectedZone === z ? styles.zoneChipTextActive : null]}>{z}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.triggerGrid}>
              {TRIGGER_TYPES.map((type) => (
                <TouchableOpacity key={type} onPress={() => simulateTrigger(type)}
                  disabled={!!simulating}
                  style={[styles.triggerBtn, simulating === type ? styles.triggerBtnActive : null]}>
                  <Text style={styles.triggerBtnEmoji}>{TRIGGER_EMOJIS[type]}</Text>
                  <Text style={styles.triggerBtnName}>{type.replace(/_/g, '\n')}</Text>
                  {simulating === type && <Text style={styles.triggerBtnFiring}>⚡ Firing...</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <GCard style={styles.pipelineCard}>
              <Text style={styles.pipelineTitle}>🔄 Auto Pipeline Flow</Text>
              <GDivider />
              {[
                { step: '1', label: 'Trigger Detected', desc: 'Threshold breached in zone', color: Colors.indigo },
                { step: '2', label: 'Active Policies Found', desc: 'Workers in zone identified', color: Colors.indigo },
                { step: '3', label: 'Fraud Check (AI)', desc: 'IF + GPS + weather-history signals', color: Colors.warning },
                { step: '4', label: 'Auto-Approved', desc: 'Clean claims instantly approved', color: Colors.success },
                { step: '5', label: 'Instant payout', desc: 'Mock Razorpay UPI or Stripe test PI', color: Colors.success },
                { step: '6', label: 'Dashboard Updated', desc: 'Worker notified in-app', color: Colors.success },
              ].map((s, i) => (
                <View key={i} style={styles.pipelineStep}>
                  <View style={[styles.pipelineDot, { backgroundColor: s.color }]}>
                    <Text style={styles.pipelineDotText}>{s.step}</Text>
                  </View>
                  <View style={styles.pipelineInfo}>
                    <Text style={styles.pipelineLabel}>{s.label}</Text>
                    <Text style={styles.pipelineDesc}>{s.desc}</Text>
                  </View>
                </View>
              ))}
            </GCard>
          </>
        )}

        {/* ── FORECAST TAB (Phase 3) ── */}
        {activeTab === 'forecast' && predictions && (
          <>
            <GCard style={styles.forecastIntro}>
              <Text style={styles.finTitle}>Next-week claim intensity</Text>
              <GDivider />
              <Text style={styles.forecastNarrative}>{predictions.forecast?.narrative}</Text>
              <Text style={styles.forecastMeta}>
                Portfolio index: {predictions.forecast?.portfolio_week_avg_intensity} · Generated{' '}
                {predictions.forecast?.generated_at
                  ? new Date(predictions.forecast.generated_at).toLocaleString('en-IN')
                  : ''}
              </Text>
            </GCard>

            {Object.entries(predictions.forecast?.zones || {}).map(([zone, zdata]: [string, any]) => (
              <GCard key={zone} style={styles.zoneForecastCard}>
                <Text style={styles.zoneForecastTitle}>{zone}</Text>
                <Text style={styles.zoneForecastAvg}>
                  Week avg intensity: {zdata.week_avg_claim_intensity}
                </Text>
                <Text style={styles.peakDay}>
                  Peak: {zdata.peak_day?.date} ({zdata.peak_day?.estimated_claim_intensity})
                </Text>
                <GDivider />
                {(zdata.daily || []).slice(0, 4).map((d: any) => (
                  <View key={d.date} style={styles.dayRow}>
                    <Text style={styles.dayDate}>{d.date}</Text>
                    <Text style={styles.dayVals}>
                      R{d.rain_disruption_prob} H{d.heat_disruption_prob} A{d.aqi_disruption_prob}
                    </Text>
                  </View>
                ))}
              </GCard>
            ))}

            <GCard style={styles.livePressure}>
              <Text style={styles.finTitle}>Live mock pressure (now)</Text>
              <GDivider />
              {Object.entries(predictions.live_pressure?.by_zone || {}).map(([z, info]: [string, any]) => (
                <View key={z} style={styles.pressureRow}>
                  <Text style={styles.pressureZone}>{z}</Text>
                  <Text style={styles.pressureVal}>
                    {info.active_now} active · {(info.types || []).join(', ') || '—'}
                  </Text>
                </View>
              ))}
            </GCard>
          </>
        )}

        {activeTab === 'forecast' && !predictions && !loading && (
          <GCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No forecast data</Text>
            <Text style={styles.emptySub}>Pull to refresh</Text>
          </GCard>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : Platform.OS === 'web' ? 8 : 16,
    paddingHorizontal: 20, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  logoutBtn: { padding: 8 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: Colors.navyCard, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.navyBorder,
  },
  tabActive: { borderColor: Colors.orange, backgroundColor: Colors.orangeGlow },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: Colors.orangeLight },
  scroll: { padding: 20, paddingBottom: 100 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: '47%', alignItems: 'center', gap: 6, padding: 14 },
  kpiValue: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },
  finCard: { marginBottom: 16 },
  finTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  finRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  finDivider: { width: 1, backgroundColor: Colors.navyBorder },
  claimsBreakdown: { marginBottom: 16 },
  claimsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  claimsStat: { alignItems: 'center' },
  claimsStatVal: { fontSize: 20, fontWeight: '900' },
  claimsStatLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  heatmapCard: { marginBottom: 16 },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  heatmapZone: { fontSize: 12, color: Colors.textSecondary, width: 90, fontWeight: '600' },
  heatmapBarWrapper: { flex: 1, height: 6, backgroundColor: Colors.glass, borderRadius: 3, overflow: 'hidden' },
  heatmapBar: { height: '100%', backgroundColor: Colors.orange, borderRadius: 3 },
  heatmapCount: { fontSize: 12, color: Colors.orangeLight, fontWeight: '700', width: 20, textAlign: 'right' },
  triggerCard: { marginBottom: 8, padding: 14 },
  triggerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  triggerEmoji: { fontSize: 24 },
  triggerInfo: { flex: 1 },
  triggerType: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  triggerZone: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  triggerDate: { fontSize: 10, color: Colors.textDisabled, marginTop: 2 },
  triggerStats: { alignItems: 'flex-end' },
  triggerPayout: { fontSize: 14, fontWeight: '800', color: Colors.successLight },
  triggerClaims: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary },
  flaggedCard: { marginBottom: 12 },
  flaggedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  flaggedType: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  flaggedZone: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  flaggedStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  flaggedAmount: { fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  flaggedScore: { fontSize: 13, color: Colors.warning, fontWeight: '700' },
  appealBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warningGlow, borderRadius: 6, padding: 8, marginBottom: 10,
  },
  appealNote: { fontSize: 12, color: Colors.warningLight, flex: 1, fontStyle: 'italic' },
  decisionRow: { flexDirection: 'row', gap: 8 },
  demoInfo: { marginBottom: 14 },
  demoInfoTitle: { fontSize: 15, fontWeight: '800', color: Colors.orangeLight, marginBottom: 6 },
  demoInfoSub: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  zoneSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  zoneChip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: Colors.navyCard, borderWidth: 1, borderColor: Colors.navyBorder,
  },
  zoneChipActive: { backgroundColor: Colors.orangeGlow, borderColor: Colors.orange },
  zoneChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  zoneChipTextActive: { color: Colors.orangeLight },
  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  triggerBtn: {
    width: '30%', alignItems: 'center', padding: 14,
    backgroundColor: Colors.navyCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.navyBorder, gap: 6,
  },
  triggerBtnActive: { borderColor: Colors.orange, backgroundColor: Colors.orangeGlow },
  triggerBtnEmoji: { fontSize: 28 },
  triggerBtnName: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  triggerBtnFiring: { fontSize: 10, color: Colors.orange, fontWeight: '800' },
  pipelineCard: { marginBottom: 20 },
  pipelineTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  pipelineStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pipelineDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  pipelineDotText: { fontSize: 12, fontWeight: '900', color: Colors.white },
  pipelineInfo: { flex: 1 },
  pipelineLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  pipelineDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  fraudSignals: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  togglesCard: { marginBottom: 12, paddingVertical: 8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', flex: 1, paddingRight: 8 },
  forecastIntro: { marginBottom: 14 },
  forecastNarrative: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 6 },
  forecastMeta: { fontSize: 10, color: Colors.textDisabled, marginTop: 8 },
  zoneForecastCard: { marginBottom: 10 },
  zoneForecastTitle: { fontSize: 15, fontWeight: '800', color: Colors.orangeLight },
  zoneForecastAvg: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  peakDay: { fontSize: 11, color: Colors.successLight, marginTop: 4 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  dayDate: { fontSize: 11, color: Colors.textMuted },
  dayVals: { fontSize: 10, color: Colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  livePressure: { marginBottom: 20 },
  pressureRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  pressureZone: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  pressureVal: { fontSize: 11, color: Colors.textMuted, flex: 1, textAlign: 'right' },
});
