import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GCard, GBadge, GDivider } from '../../components/GCard';
import { GButton } from '../../components/GButton';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';

export default function ProfileScreen({ navigation }: any) {
  const { worker, logout } = useAuthStore();
  const toast = useToast();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const requestLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    toast.success('Signed out successfully');
  };

  const cancelLogout = () => {
    setLogoutConfirmVisible(false);
  };

  const getRiskColor = (score: number) => score < 40 ? Colors.success : score < 70 ? Colors.warning : Colors.danger;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Worker identity card */}
        <GCard style={styles.identityCard} glow="indigo">
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(worker?.name || 'R')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.workerName}>{worker?.name || 'Ravi Kumar'}</Text>
              <Text style={styles.workerPhone}>📱 {worker?.phone || '9876543210'}</Text>
              {worker?.email && <Text style={styles.workerEmail}>✉️ {worker.email}</Text>}
              <GBadge label={worker?.kyc_status === 'VERIFIED' ? '✓ KYC Verified' : 'KYC Pending'} 
                variant={worker?.kyc_status === 'VERIFIED' ? 'success' : 'warning'} size="sm" />
            </View>
          </View>
        </GCard>

        {/* Work details */}
        <GCard style={styles.section}>
          <Text style={styles.sectionTitle}>Work Details</Text>
          <GDivider style={{ marginBottom: 12 }} />
          {[
            { icon: 'briefcase-outline', label: 'Platform', value: worker?.platform || 'Amazon' },
            { icon: 'location-outline', label: 'City', value: worker?.city || 'Chennai' },
            { icon: 'map-outline', label: 'Operating Zones', value: (worker?.zones || []).join(', ') },
            { icon: 'time-outline', label: 'Weekly Hours', value: `${worker?.weekly_hours || 60} hrs/week` },
            { icon: 'card-outline', label: 'Linked UPI ID', value: `${worker?.phone || '9876543210'}@paytm` },
          ].map((item, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name={item.icon as any} size={18} color={Colors.textMuted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </GCard>

        {/* AI Risk profile */}
        <GCard style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Risk Profile</Text>
          <GDivider style={{ marginBottom: 12 }} />
          <View style={styles.riskRow}>
            <View style={styles.riskScoreCircle}>
              <Text style={[styles.riskScoreNum, { color: getRiskColor(worker?.zone_risk_score || 55) }]}>
                {Math.round(worker?.zone_risk_score || 55)}
              </Text>
              <Text style={styles.riskScoreLabel}>/ 100</Text>
            </View>
            <View style={styles.riskDetails}>
              <Text style={styles.riskTier}>Risk Tier: {worker?.risk_tier || 'Standard'}</Text>
              <Text style={styles.riskDesc}>
                Based on your zone's historical disruption frequency, seasonal index, and platform type.
              </Text>
              <GBadge 
                label={(worker?.zone_risk_score ?? 0) < 40 ? 'LOW RISK' : (worker?.zone_risk_score ?? 0) < 70 ? 'MEDIUM RISK' : 'HIGH RISK'}
                variant={(worker?.zone_risk_score ?? 0) < 40 ? 'success' : (worker?.zone_risk_score ?? 0) < 70 ? 'warning' : 'danger'}
                size="sm"
              />
            </View>
          </View>
        </GCard>

        {/* Coverage summary */}
        <GCard style={styles.section}>
          <Text style={styles.sectionTitle}>Coverage Summary</Text>
          <GDivider style={{ marginBottom: 12 }} />
          {[
            { emoji: '🌧️', label: 'Heavy Rain (>10mm/hr)', payout: '₹300' },
            { emoji: '🌡️', label: 'Extreme Heat (>42°C)', payout: '₹250' },
            { emoji: '🏭', label: 'Hazardous AQI (>300)', payout: '₹350' },
            { emoji: '🌊', label: 'Flood / Storm Alert', payout: '₹400' },
            { emoji: '🏢', label: 'Hub Shutdown', payout: '₹500' },
            { emoji: '🚫', label: 'Curfew / Strike', payout: '₹450' },
            { emoji: '🚧', label: 'Road Closure', payout: '₹280' },
          ].map((item, i) => (
            <View key={i} style={styles.coverageRow}>
              <Text style={styles.coverageEmoji}>{item.emoji}</Text>
              <Text style={styles.coverageLabel}>{item.label}</Text>
              <Text style={styles.coveragePayout}>{item.payout}</Text>
            </View>
          ))}
        </GCard>

        {/* About */}
        <GCard style={styles.section}>
          <Text style={styles.sectionTitle}>About GigShield</Text>
          <GDivider style={{ marginBottom: 12 }} />
          <Text style={styles.aboutText}>
            GigShield is an AI-powered parametric income insurance platform protecting delivery workers from income loss due to external disruptions. Built for Guidewire DEVTrails 2026 hackathon.
          </Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Version 1.0.0 · Demo Mode</Text>
          </View>
        </GCard>

        {/* Sign out */}
        <GButton
          title="Sign Out"
          onPress={requestLogout}
          variant="danger"
          fullWidth
          style={styles.signOutBtn}
          icon={<Ionicons name="log-out-outline" size={18} color={Colors.white} />}
        />
      </ScrollView>
      <ConfirmModal
        visible={logoutConfirmVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="danger"
        icon="log-out-outline"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { paddingTop: Platform.OS === 'ios' ? 52 : Platform.OS === 'web' ? 8 : 16, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  identityCard: { marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.iconBgBlue, borderWidth: 2, borderColor: Colors.paytmBlue + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: Colors.paytmBlue },
  identityInfo: { flex: 1, gap: 4 },
  workerName: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  workerPhone: { fontSize: 13, color: Colors.textSecondary },
  workerEmail: { fontSize: 13, color: Colors.textSecondary },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
  riskRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  riskScoreCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.navyBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  riskScoreNum: { fontSize: 24, fontWeight: '900' },
  riskScoreLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600' },
  riskDetails: { flex: 1, gap: 6 },
  riskTier: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  riskDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  coverageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  coverageEmoji: { fontSize: 18, width: 28 },
  coverageLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  coveragePayout: { fontSize: 14, fontWeight: '800', color: Colors.successLight },
  aboutText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  versionRow: { marginTop: 10 },
  versionText: { fontSize: 12, color: Colors.textMuted },
  signOutBtn: { marginBottom: 20 },
});
