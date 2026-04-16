import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { policiesAPI } from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';

export default function PolicyScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  // Confirm modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, policyRes] = await Promise.allSettled([
        policiesAPI.getPlans(),
        policiesAPI.getActive(),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.plans || []);
      if (policyRes.status === 'fulfilled') setActivePolicy(policyRes.value.data);
      else setActivePolicy(null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Step 1: Show branded confirm modal
  const onActivatePress = (plan: any) => {
    setPendingPlan(plan);
    setConfirmVisible(true);
  };

  // Step 2: User confirmed — call API
  const onConfirmActivate = async () => {
    if (!pendingPlan) return;
    setConfirmVisible(false);
    setActivating(pendingPlan.plan_type);
    try {
      await policiesAPI.createPolicy(pendingPlan.plan_type);
      await fetchData();
      toast.success(`🛡️ ${pendingPlan.plan_type} coverage is now active!`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Could not activate policy';
      toast.error(msg);
    } finally {
      setActivating(null);
      setPendingPlan(null);
    }
  };

  const onCancelActivate = () => {
    setConfirmVisible(false);
    setPendingPlan(null);
  };

  const coverageUsedPct = activePolicy
    ? Math.min(100, Math.round(
        (1 - activePolicy.remaining_weekly_payout / Math.max(activePolicy.max_weekly_payout, 1)) * 100
      ))
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryBlue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Insurance Policies</Text>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle-outline" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Active Coverage ── */}
        <Text style={styles.sectionTitle}>Active Coverage</Text>

        {activePolicy ? (
          <View style={styles.activePolicyCard}>
            <View style={styles.activeBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#FFF" />
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
            <View style={styles.activePolicyTop}>
              <View style={styles.activeIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color="#FFF" />
              </View>
              <View style={styles.activePolicyInfo}>
                <Text style={styles.activePolicyTitle}>{activePolicy.plan_type} Protection</Text>
                <Text style={styles.activePolicySub}>
                  ₹{activePolicy.weekly_premium}/week · ₹{activePolicy.remaining_weekly_payout} cover left
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Coverage used</Text>
                <Text style={styles.progressPct}>{coverageUsedPct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${coverageUsedPct}%` as any }]} />
              </View>
              <Text style={styles.progressSub}>
                ₹{activePolicy.max_weekly_payout - activePolicy.remaining_weekly_payout} used of ₹{activePolicy.max_weekly_payout} cap
              </Text>
            </View>

            <TouchableOpacity style={styles.viewDetailsBtn}>
              <Text style={styles.viewDetailsText}>View Policy Details</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primaryBlue} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noPolicyCard}>
            <Ionicons name="shield-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.noPolicyText}>No active coverage</Text>
            <Text style={styles.noPolicySub}>Choose a plan below to get protected.</Text>
          </View>
        )}

        {/* ── Available Plans ── */}
        <Text style={styles.sectionTitle}>Available Coverages</Text>

        {plans.map((plan) => {
          const isActive = activePolicy?.plan_type === plan.plan_type;
          const isRecommended = plan.recommended;
          const isActivating = activating === plan.plan_type;

          return (
            <View
              key={plan.plan_type}
              style={[
                styles.planCard,
                isRecommended  ? styles.planCardRecommended : null,
                isActive  ? styles.planCardActive : null,
              ]}
            >
              {isRecommended && (
                <View style={styles.recommendedBadge}>
                  <Ionicons name="sparkles" size={11} color="#FFF" />
                  <Text style={styles.recommendedText}>AI RECOMMENDED</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[
                  styles.planIconWrap,
                  { backgroundColor: isActive ? Colors.success : Colors.iconBgBlue }
                ]}>
                  <Ionicons
                    name={isActive ? 'shield-checkmark' : 'shield-outline'}
                    size={20}
                    color={isActive ? '#FFF' : Colors.primaryBlue}
                  />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>{plan.plan_type} Insurance</Text>
                  <Text style={styles.planPremium}>₹{plan.weekly_premium} / week</Text>
                </View>
                <View style={styles.planCapBadge}>
                  <Text style={styles.planCapLabel}>Covers up to</Text>
                  <Text style={styles.planCapAmt}>₹{plan.max_weekly_payout}</Text>
                </View>
              </View>

              {/* Feature chips */}
              {plan.features && plan.features.length > 0 && (
                <View style={styles.featureList}>
                  {plan.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureChip}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.planFooter}>
                <View style={[
                  styles.activeLine,
                  { backgroundColor: isActive ? Colors.success : Colors.borderLight }
                ]} />
                {isActive ? (
                  <View style={styles.currentBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.currentText}>Current Plan</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.activateBtn, isActivating  ? styles.activateBtnLoading : null]}
                    onPress={() => onActivatePress(plan)}
                    disabled={!!activating}
                    activeOpacity={0.8}
                  >
                    {isActivating ? (
                      <ActivityIndicator size="small" color={Colors.primaryBlue} />
                    ) : (
                      <>
                        <Text style={styles.activateBtnText}>Activate</Text>
                        <Ionicons name="chevron-forward" size={13} color={Colors.primaryBlue} />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primaryBlue} />
          <Text style={styles.infoText}>
            Coverage resets every 7 days. Premiums are AI-calculated based on your operating zone risk and
            platform. One active policy per worker at a time.
          </Text>
        </View>
      </ScrollView>

      {/* Branded Confirm Modal — replaces window.confirm() */}
      <ConfirmModal
        visible={confirmVisible}
        title={`Activate ${pendingPlan?.plan_type} Plan`}
        message={`You will be covered at ₹${pendingPlan?.weekly_premium}/week with up to ₹${pendingPlan?.max_weekly_payout} protection. This replaces any existing plan.`}
        confirmText="Activate Now"
        cancelText="Cancel"
        variant="primary"
        icon="shield-checkmark"
        onConfirm={onConfirmActivate}
        onCancel={onCancelActivate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4 },
  profileBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 12,
  },

  // ── Active Policy Card ────────────────────────────────────────────────────
  activePolicyCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.success + '40',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  activeBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  activePolicyTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  activeIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  activePolicyInfo: { flex: 1 },
  activePolicyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  activePolicySub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  progressSection: { marginBottom: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  progressPct: { fontSize: 11, fontWeight: '800', color: Colors.primaryBlue },
  progressTrack: {
    height: 7,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryBlue,
    borderRadius: 4,
  },
  progressSub: { fontSize: 11, color: Colors.textMuted, marginTop: 5 },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    marginTop: 4,
  },
  viewDetailsText: { fontSize: 13, fontWeight: '700', color: Colors.primaryBlue, flex: 1 },

  // ── No Policy ─────────────────────────────────────────────────────────────
  noPolicyCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  noPolicyText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  noPolicySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // ── Plan Cards ─────────────────────────────────────────────────────────────
  planCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardRecommended: {
    borderColor: Colors.primaryBlue + '60',
    borderWidth: 2,
    shadowColor: Colors.primaryBlue,
    shadowOpacity: 0.12,
  },
  planCardActive: {
    borderColor: Colors.success + '60',
    borderWidth: 2,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recommendedText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  planIconWrap: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  planPremium: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  planCapBadge: { alignItems: 'flex-end' },
  planCapLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  planCapAmt: { fontSize: 15, fontWeight: '900', color: Colors.primaryBlue },

  // Feature list
  featureList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },

  // Footer
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  activeLine: { width: 36, height: 4, borderRadius: 2 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  currentText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activateBtnLoading: { opacity: 0.6 },
  activateBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primaryBlue },

  // Info box
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.iconBgBlue,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});
