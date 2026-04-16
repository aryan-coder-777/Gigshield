import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { claimsAPI } from '../../lib/api';

const STATUS_META: Record<string, { color: string; label: string }> = {
  PAID: { color: Colors.success, label: 'Paid' },
  AUTO_APPROVED: { color: Colors.success, label: 'Approved' },
  PROCESSING: { color: Colors.warning, label: 'Processing' },
  FLAGGED_FOR_REVIEW: { color: Colors.warning, label: 'Review' },
  APPEAL_PENDING: { color: Colors.indigo, label: 'Appeal' },
  REJECTED: { color: Colors.danger, label: 'Rejected' },
};

export default function ClaimsScreen() {
  const [claims, setClaims] = useState<any[]>([]);
  const [totalPayout, setTotalPayout] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [appealNote, setAppealNote] = useState('');
  const [appealSending, setAppealSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await claimsAPI.getMyClaims();
      setClaims(res.data.claims || []);
      setTotalPayout(res.data.total_payout_received ?? 0);
    } catch {
      setClaims([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const submitAppeal = async () => {
    if (!selected) return;
    setAppealSending(true);
    try {
      await claimsAPI.submitAppeal(selected.id, appealNote.trim() || 'Please review my claim.');
      Alert.alert('Appeal sent', 'Our team will respond within 2 hours.');
      setSelected(null);
      setAppealNote('');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not submit appeal');
    } finally {
      setAppealSending(false);
    }
  };

  const canAppeal = (c: any) =>
    (c.status === 'REJECTED' || c.status === 'FLAGGED_FOR_REVIEW') && !c.appeal_submitted;

  const renderItem = ({ item }: { item: any }) => {
    const sm = STATUS_META[item.status] || { color: Colors.textMuted, label: item.status };
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={styles.cardType}>{item.claim_type.replace(/_/g, ' ')}</Text>
          <View style={[styles.badge, { backgroundColor: sm.color + '22' }]}>
            <Text style={[styles.badgeText, { color: sm.color }]}>{sm.label}</Text>
          </View>
        </View>
        <Text style={styles.cardZone}>📍 {item.zone}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardAmt}>₹{item.payout_amount}</Text>
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My claims</Text>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="flash-outline" size={20} color={Colors.primaryBlue} />
        <Text style={styles.infoText}>
          Claims are opened automatically when a parametric trigger fires in your insured zone (weather,
          AQI, hub, curfew, etc.). There is no manual “file incident” path for income-loss cover.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Lifetime approved payout (shown)</Text>
        <Text style={styles.summaryVal}>₹{totalPayout.toFixed(0)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primaryBlue} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryBlue} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No claims yet</Text>
              <Text style={styles.emptySub}>When a disruption hits your zone, a claim may open automatically.</Text>
            </View>
          }
        />
      )}

      {!!selected && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Claim #{selected?.id}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              {selected && (
                <>
                  <Text style={styles.modalRow}>Type: {selected.claim_type}</Text>
                  <Text style={styles.modalRow}>Zone: {selected.zone}</Text>
                  <Text style={styles.modalRow}>Amount: ₹{selected.payout_amount}</Text>
                  <Text style={styles.modalRow}>Status: {selected.status}</Text>
                  <Text style={styles.modalRow}>Fraud tier: {selected.fraud_tier}</Text>
                  {selected.disruption_description ? (
                    <Text style={styles.modalDesc}>{selected.disruption_description}</Text>
                  ) : null}
                  {selected.fraud_signals && (
                    <View style={styles.signalsContainer}>
                      <Text style={styles.signalsTitle}>Fraud & Anomaly Analysis</Text>
                      {Object.entries(selected.fraud_signals)
                        .filter(([k]) => ['claims_frequency', 'zone_match', 'timing', 'account_age', 'claim_latency', 'policy_age', 'weather_history', 'gps_proximity', 'gps_integrity'].includes(k))
                        .map(([key, value]: [string, any], idx) => {
                          const isGood = value === 'NORMAL' || value === 'OK' || value === 'ESTABLISHED' || value === 'CONSISTENT' || value === 'WITHIN_ZONE';
                          const isWarn = value === 'NEW_ACCOUNT' || value === 'NEW_POLICY' || value === 'WEAK' || value === 'SOFT_OUTSIDE_ZONE' || value === 'ANOMALY';
                          const badgeColor = isGood ? Colors.success : (isWarn ? Colors.warning : Colors.danger);
                          const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          const displayValue = String(value).replace(/_/g, ' ');
                          return (
                            <View key={idx} style={styles.signalRow}>
                              <Text style={styles.signalLabel}>{displayKey}</Text>
                              <View style={[styles.signalBadge, { backgroundColor: badgeColor + '20' }]}>
                                <Ionicons name={isGood ? 'checkmark-circle' : isWarn ? 'warning' : 'close-circle'} size={12} color={badgeColor} style={{ marginRight: 4 }} />
                                <Text style={[styles.signalValue, { color: badgeColor }]}>{displayValue}</Text>
                              </View>
                            </View>
                          );
                        })}
                        {selected.fraud_signals.raw_anomaly_score !== undefined && (
                          <View style={styles.signalRow}>
                            <Text style={styles.signalLabel}>Raw Anomaly Score</Text>
                            <Text style={styles.signalValueText}>{selected.fraud_signals.raw_anomaly_score}</Text>
                          </View>
                        )}
                    </View>
                  )}
                  {canAppeal(selected) && (
                    <>
                      <Text style={styles.appealLabel}>Appeal note</Text>
                      <TextInput
                        style={styles.appealInput}
                        placeholder="Why should we reconsider?"
                        placeholderTextColor={Colors.textMuted}
                        value={appealNote}
                        onChangeText={setAppealNote}
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.appealBtn}
                        onPress={submitAppeal}
                        disabled={appealSending}
                      >
                        {appealSending ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.appealBtnText}>Submit appeal</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  summaryVal: { fontSize: 16, fontWeight: '800', color: Colors.primaryBlue },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  cardZone: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  cardAmt: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  cardDate: { fontSize: 11, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalRow: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: Colors.textPrimary, marginTop: 8, lineHeight: 20 },
  signalsContainer: {
    marginTop: 12,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  signalsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  signalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  signalLabel: { fontSize: 11, color: Colors.textSecondary },
  signalBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  signalValue: { fontSize: 10, fontWeight: '700' },
  signalValueText: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  appealLabel: { fontSize: 13, fontWeight: '700', marginTop: 16 },
  appealInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  appealBtn: {
    backgroundColor: Colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  appealBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
