import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { workerAPI, claimsAPI } from '../../lib/api';
import { AIChatModal } from '../../components/AIChatModal';

export default function DashboardScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [recentPayouts, setRecentPayouts] = useState<any[]>([]);
  const [chatVisible, setChatVisible] = useState(false);

  // Animated counter for earnings
  const earningsAnim = useRef(new Animated.Value(0)).current;
  const weekEarningsAnim = useRef(new Animated.Value(0)).current;
  const [displayEarnings, setDisplayEarnings] = useState(0);
  const [displayWeekEarnings, setDisplayWeekEarnings] = useState(0);

  const load = useCallback(async () => {
    try {
      const [sumRes, payRes] = await Promise.allSettled([
        workerAPI.getDashboardSummary(),
        claimsAPI.getPayouts(),
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (payRes.status === 'fulfilled') {
        const list = payRes.value.data?.payouts || [];
        setRecentPayouts(list.slice(0, 5));
      }
    } catch {
      setSummary(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Animate earnings counters when summary loads
  useEffect(() => {
    if (!summary) return;
    const targetLifetime = summary.earnings_protected_inr_lifetime ?? 0;
    const targetWeek     = summary.earnings_protected_inr_this_week ?? 0;

    Animated.timing(earningsAnim, {
      toValue: targetLifetime,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    earningsAnim.addListener(({ value }) => setDisplayEarnings(Math.round(value)));

    Animated.timing(weekEarningsAnim, {
      toValue: targetWeek,
      duration: 900,
      useNativeDriver: false,
    }).start();
    weekEarningsAnim.addListener(({ value }) => setDisplayWeekEarnings(Math.round(value)));

    return () => {
      earningsAnim.removeAllListeners();
      weekEarningsAnim.removeAllListeners();
    };
  }, [summary]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const policy   = summary?.policy;
  const hasPolicy = summary?.active_policy && policy;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cardBg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>GigShield</Text>
          <Text style={styles.subGreeting}>Income Protection Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.avatarCircle} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person" size={18} color={Colors.primaryBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}
      >

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primaryBlue} style={{ marginVertical: 60 }} />
        ) : (
          <>
            {/* ── Hero: Earnings Protected ── */}
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="wallet" size={18} color={Colors.success} />
                </View>
                <Text style={styles.heroLabel}>Lifetime earnings protected</Text>
              </View>
              <Text style={styles.heroValue}>₹{displayEarnings.toLocaleString('en-IN')}</Text>
              <View style={styles.heroSubRow}>
                <Ionicons name="trending-up" size={13} color={Colors.success} />
                <Text style={styles.heroSub}>
                  +₹{displayWeekEarnings} this week via instant UPI / Stripe rails
                </Text>
              </View>
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { flex: 1 }]}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primaryBlue} />
                <Text style={styles.statBig}>{summary?.claims_total ?? 0}</Text>
                <Text style={styles.statLabel}>Total claims</Text>
              </View>
              <View style={[styles.statCard, { flex: 1, marginLeft: 10 }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={styles.statBig}>{summary?.claims_auto_approved_this_week ?? 0}</Text>
                <Text style={styles.statLabel}>Approved this week</Text>
              </View>
              <View style={[styles.statCard, { flex: 1, marginLeft: 10 }]}>
                <Ionicons name="flame-outline" size={18} color={Colors.warning} />
                <Text style={styles.statBig}>{summary?.streak_weeks_insured ?? 0}</Text>
                <Text style={styles.statLabel}>Weeks insured</Text>
              </View>
            </View>

            {/* ── Active Coverage Card ── */}
            <View style={styles.coverageCard}>
              <View style={styles.coverageHeader}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.primaryBlue} />
                <Text style={styles.coverageTitle}>Active weekly cover</Text>
                {hasPolicy && (
                  <View style={styles.activeDot}>
                    <View style={styles.dot} />
                    <Text style={styles.activeDotText}>LIVE</Text>
                  </View>
                )}
              </View>

              {hasPolicy ? (
                <>
                  <View style={styles.coverageMetrics}>
                    <View style={styles.coverageCol}>
                      <Text style={styles.coverageSmall}>Plan</Text>
                      <Text style={styles.coverageEm}>{policy.plan_type}</Text>
                    </View>
                    <View style={styles.coverageCol}>
                      <Text style={styles.coverageSmall}>Premium</Text>
                      <Text style={styles.coverageEm}>₹{policy.weekly_premium_inr}</Text>
                    </View>
                    <View style={styles.coverageCol}>
                      <Text style={styles.coverageSmall}>Cap left</Text>
                      <Text style={styles.coverageEm}>₹{policy.remaining_weekly_payout_inr?.toFixed(0)}</Text>
                    </View>
                    <View style={styles.coverageCol}>
                      <Text style={styles.coverageSmall}>Days left</Text>
                      <Text style={styles.coverageEm}>{policy.days_left_in_policy_week}d</Text>
                    </View>
                  </View>

                  {/* Week progress */}
                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressFill,
                      { width: `${Math.min(100, policy.coverage_used_pct || 0)}%` as any }
                    ]} />
                  </View>
                  <Text style={styles.coverageFoot}>
                    {policy.week_progress_pct}% of policy week elapsed
                  </Text>
                </>
              ) : (
                <View style={styles.noPolicyRow}>
                  <Ionicons name="shield-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.noPolicy}>No active policy — buy weekly cover in the Policy tab.</Text>
                </View>
              )}
            </View>

            {/* ── Extra Insights ── */}
            {(summary?.disruption_hours_averted > 0 || summary?.avg_claim_latency_seconds > 0) && (
              <View style={styles.insightRow}>
                {summary.disruption_hours_averted > 0 && (
                  <View style={[styles.insightCard, { flex: 1 }]}>
                    <Ionicons name="time-outline" size={16} color={Colors.indigo} />
                    <Text style={styles.insightVal}>{summary.disruption_hours_averted}h</Text>
                    <Text style={styles.insightLabel}>Disruption hrs averted</Text>
                  </View>
                )}
                {summary.avg_claim_latency_seconds > 0 && (
                  <View style={[styles.insightCard, { flex: 1, marginLeft: 10 }]}>
                    <Ionicons name="flash-outline" size={16} color={Colors.warning} />
                    <Text style={styles.insightVal}>{Math.round(summary.avg_claim_latency_seconds)}s</Text>
                    <Text style={styles.insightLabel}>Avg claim latency</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Recent Payouts ── */}
            {recentPayouts.length > 0 && (
              <View style={styles.payoutSection}>
                <Text style={styles.sectionTitle}>Recent payouts</Text>
                {recentPayouts.map((p: any) => (
                  <View key={p.id} style={styles.payoutRow}>
                    <View style={styles.payoutRailIcon}>
                      <Ionicons
                        name={p.payment_rail === 'STRIPE' ? 'card-outline' : 'phone-portrait-outline'}
                        size={16}
                        color={p.payment_rail === 'STRIPE' ? Colors.indigo : Colors.success}
                      />
                    </View>
                    <View style={styles.payoutLeft}>
                      <Text style={styles.payoutAmt}>₹{p.amount}</Text>
                      <Text style={styles.payoutMeta}>
                        {p.payment_rail === 'STRIPE' ? 'Stripe Instant' : 'Razorpay UPI'} · {p.status}
                      </Text>
                    </View>
                    <Text style={styles.payoutIds} numberOfLines={1}>
                      {p.stripe_payment_intent_id
                        ? p.stripe_payment_intent_id.slice(0, 18) + '…'
                        : (p.razorpay_payout_id || p.upi_transaction_id || '').slice(0, 16) + '…'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Alerts CTA ── */}
            <TouchableOpacity
              style={styles.alertsBtn}
              onPress={() => navigation.navigate('Alerts')}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications" size={18} color="#FFF" />
              <Text style={styles.alertsBtnText}>Disruption Alerts & Demo Triggers</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFF" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── AI Bot FAB ── */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setChatVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={24} color="#FFF" />
      </TouchableOpacity>

      <AIChatModal visible={chatVisible} onClose={() => setChatVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  greeting: { fontSize: 17, fontWeight: '900', color: Colors.primaryBlue, letterSpacing: -0.3 },
  subGreeting: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.iconBgBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Hero
  heroCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heroIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.successBg,
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  heroValue: { fontSize: 36, fontWeight: '900', color: Colors.success, letterSpacing: -1 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  heroSub: { fontSize: 12, color: Colors.textSecondary, flex: 1 },

  // Stats row
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  statBig: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },

  // Coverage card
  coverageCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  coverageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  coverageTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  activeDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success,
  },
  activeDotText: { fontSize: 10, fontWeight: '800', color: Colors.success },
  coverageMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  coverageCol: {},
  coverageSmall: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  coverageEm: { fontSize: 15, fontWeight: '800', color: Colors.primaryBlue, marginTop: 3 },
  progressTrack: {
    height: 7, backgroundColor: Colors.borderLight,
    borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: {
    height: '100%', backgroundColor: Colors.primaryBlue, borderRadius: 4,
  },
  coverageFoot: { fontSize: 11, color: Colors.textMuted },
  noPolicyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noPolicy: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },

  // Insights
  insightRow: { flexDirection: 'row', marginBottom: 14 },
  insightCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  insightVal: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  insightLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },

  // Payouts
  payoutSection: { marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  payoutRailIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.bgDark,
    alignItems: 'center', justifyContent: 'center',
  },
  payoutLeft: { flex: 1 },
  payoutAmt: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  payoutMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  payoutIds: { fontSize: 9, color: Colors.textMuted, maxWidth: '35%', textAlign: 'right' },

  // Alerts button
  alertsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryBlue,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  alertsBtnText: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
