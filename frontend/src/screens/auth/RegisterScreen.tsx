import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { GButton } from '../../components/GButton';
import { GInput } from '../../components/GInput';
import { GCard } from '../../components/GCard';
import { authAPI, setMemoryToken } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

const PLATFORMS = ['Amazon', 'Flipkart', 'Zepto', 'Blinkit', 'Swiggy', 'Zomato', 'Dunzo', 'Other'];
const CITIES = ['Chennai', 'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad'];
const ZONES_BY_CITY: Record<string, string[]> = {
  Chennai: ['Tambaram', 'Anna Nagar', 'T. Nagar', 'Velachery', 'Perambur', 'Chromepet', 'Sholinganallur'],
  Mumbai: ['Andheri', 'Bandra', 'Dharavi', 'Kurla', 'Thane', 'Borivali', 'Dadar'],
  Bengaluru: ['Koramangala', 'Whitefield', 'Electronic City', 'Indira Nagar', 'HSR Layout'],
  Delhi: ['Connaught Place', 'Lajpat Nagar', 'Dwarka', 'Rohini', 'Saket'],
  Hyderabad: ['Hitech City', 'Gachibowli', 'Secunderabad'],
};

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Personal info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Work info
  const [platform, setPlatform] = useState('Amazon');
  const [partnerId, setPartnerId] = useState('');
  const [city, setCity] = useState('Chennai');
  const [selectedZones, setSelectedZones] = useState<string[]>(['Tambaram']);
  const [weeklyHours, setWeeklyHours] = useState('60');

  // Step 3: KYC
  const [aadhaar, setAadhaar] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!phone || phone.length !== 10) e.phone = 'Enter valid 10-digit phone';
    if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (selectedZones.length === 0) e.zones = 'Select at least one zone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const handleRegister = async () => {
    if (!aadhaar || aadhaar.length !== 4) {
      setErrors({ aadhaar: 'Enter last 4 digits of Aadhaar' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        phone,
        name,
        email: email || undefined,
        password,
        platform,
        partner_id: partnerId || undefined,
        city,
        zones: selectedZones,
        weekly_hours: parseFloat(weeklyHours) || 60,
      });

      const { access_token, worker_id, name: wName, role, onboarding_complete } = res.data;

      // Set the token in memory + storage BEFORE calling KYC so the
      // request interceptor can attach the Authorization header.
      setMemoryToken(access_token);
      await AsyncStorage.setItem('access_token', access_token);

      // Update KYC
      try {
        await authAPI.updateKYC({ aadhaar_last4: aadhaar });
      } catch {
        // KYC update is non-critical; continue with registration
      }

      const workerObj = {
        id: worker_id,
        name: wName,
        phone,
        email,
        platform,
        city,
        zones: selectedZones,
        zone_risk_score: 0,
        risk_tier: 'Standard',
        kyc_status: 'VERIFIED',
        onboarding_complete: true,
        role,
      };

      // Show success confirmation, then navigate to role selection
      showAlert(
        '🎉 Account Created!',
        `Welcome to GigShield, ${wName || name}! Your account has been created and verified successfully.`,
        () => navigation.navigate('RoleSelection', { access_token, workerObj }),
      );
    } catch (err: any) {
      const isNetworkError = err.message === 'Network Error' || err.code === 'ECONNABORTED';
      const msg = isNetworkError
        ? 'Cannot connect to the server. Please ensure the Backend API is running!'
        : (err.response?.data?.detail || 'Registration failed. Please try again.');
      showAlert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View style={[styles.stepDot, step >= s  ? styles.stepDotActive : null]}>
            {step > s ? (
              <Ionicons name="checkmark" size={12} color={Colors.white} />
            ) : (
              <Text style={[styles.stepNum, step >= s  ? styles.stepNumActive : null]}>{s}</Text>
            )}
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s  ? styles.stepLineActive : null]} />}
        </View>
      ))}
    </View>
  );

  const stepTitles = ['Personal Info', 'Work Details', 'Verify Identity'];
  const stepSubs = ['Tell us about you', 'Where do you deliver?', 'Quick KYC verification'];

  return (
    <LinearGradient colors={['#0A0E1A', '#0F0A2E', '#0A0E1A']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Ionicons name="shield-checkmark" size={22} color={Colors.indigo} />
              <Text style={styles.headerTitleText}>GigShield</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          <StepIndicator />

          <Text style={styles.stepTitle}>{stepTitles[step - 1]}</Text>
          <Text style={styles.stepSub}>{stepSubs[step - 1]}</Text>

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <GCard style={styles.formCard}>
              <GInput label="Full Name" placeholder="Ravi Kumar" value={name} onChangeText={setName}
                icon="person-outline" error={errors.name} autoCapitalize="words" />
              <GInput label="Phone Number" placeholder="9876543210" value={phone} onChangeText={setPhone}
                icon="call-outline" keyboardType="phone-pad" error={errors.phone} autoCapitalize="none" />
              <GInput label="Email (Optional)" placeholder="ravi@example.com" value={email} onChangeText={setEmail}
                icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
              <GInput label="Password" placeholder="Min 6 characters" value={password} onChangeText={setPassword}
                icon="lock-closed-outline" secureTextEntry error={errors.password} />
              <GInput label="Confirm Password" placeholder="Re-enter password" value={confirmPassword}
                onChangeText={setConfirmPassword} icon="lock-closed-outline" secureTextEntry
                error={errors.confirmPassword} />
              <GButton title="Next: Work Details →" onPress={() => validateStep1() && setStep(2)}
                fullWidth size="lg" style={{ marginTop: 8 }} />
            </GCard>
          )}

          {/* STEP 2: Work Info */}
          {step === 2 && (
            <GCard style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Delivery Platform</Text>
                <View style={styles.chipRow}>
                  {PLATFORMS.map((p) => (
                    <TouchableOpacity key={p} onPress={() => setPlatform(p)}
                      style={[styles.chip, platform === p  ? styles.chipActive : null]}>
                      <Text style={[styles.chipText, platform === p  ? styles.chipTextActive : null]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <GInput label="Partner / Employee ID (Optional)" placeholder="AMZ-TBR-2847"
                value={partnerId} onChangeText={setPartnerId} icon="card-outline" autoCapitalize="characters" />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>City</Text>
                <View style={styles.chipRow}>
                  {CITIES.map((c) => (
                    <TouchableOpacity key={c} onPress={() => { setCity(c); setSelectedZones([]); }}
                      style={[styles.chip, city === c  ? styles.chipActive : null]}>
                      <Text style={[styles.chipText, city === c  ? styles.chipTextActive : null]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Operating Zones (Select all that apply)</Text>
                {errors.zones && <Text style={styles.errorText}>{errors.zones}</Text>}
                <View style={styles.chipRow}>
                  {(ZONES_BY_CITY[city] || []).map((z) => (
                    <TouchableOpacity key={z} onPress={() => toggleZone(z)}
                      style={[styles.chip, selectedZones.includes(z)  ? styles.chipSuccessActive : null]}>
                      <Text style={[styles.chipText, selectedZones.includes(z)  ? styles.chipTextSuccess : null]}>{z}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <GInput label="Weekly Working Hours" placeholder="60" value={weeklyHours}
                onChangeText={setWeeklyHours} icon="time-outline" keyboardType="numeric" />

              <GButton title="Next: Verify Identity →" onPress={() => validateStep2() && setStep(3)}
                fullWidth size="lg" style={{ marginTop: 8 }} />
            </GCard>
          )}

          {/* STEP 3: KYC */}
          {step === 3 && (
            <GCard style={styles.formCard}>
              <View style={styles.kycInfo}>
                <Ionicons name="shield-checkmark" size={40} color={Colors.success} />
                <Text style={styles.kycTitle}>Quick Identity Verification</Text>
                <Text style={styles.kycSub}>
                  We only store the last 4 digits of your Aadhaar for compliance.
                  Your data is encrypted and never shared.
                </Text>
              </View>

              <GInput label="Last 4 Digits of Aadhaar" placeholder="4521" value={aadhaar}
                onChangeText={setAadhaar} icon="finger-print-outline" keyboardType="numeric"
                maxLength={4} error={errors.aadhaar} autoCapitalize="none" />

              <View style={styles.kycNote}>
                <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
                <Text style={styles.kycNoteText}>
                  By registering, you agree to GigShield's Terms of Service and Privacy Policy.
                  This is a simulated KYC for demo purposes.
                </Text>
              </View>

              <GButton title={loading ? 'Creating Account...' : 'Create Account 🛡️'}
                onPress={handleRegister} loading={loading} fullWidth size="lg"
                style={{ marginTop: 16 }} />
            </GCard>
          )}

          <Text style={styles.signInLink}>
            Already have an account?{' '}
            <Text style={styles.signInHighlight} onPress={() => navigation.navigate('Login')}>
              Sign In
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'web' ? 20 : 48,
    paddingBottom: 16,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.navyCard, borderWidth: 1, borderColor: Colors.navyBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.indigo, borderColor: Colors.indigo },
  stepNum: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  stepNumActive: { color: Colors.white },
  stepLine: { width: 40, height: 1, backgroundColor: Colors.navyBorder, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.indigo },
  stepTitle: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  stepSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  formCard: { marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 8, letterSpacing: 0.2, textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.navyCard, borderWidth: 1, borderColor: Colors.navyBorder,
  },
  chipActive: { backgroundColor: Colors.indigoGlow, borderColor: Colors.indigo },
  chipSuccessActive: { backgroundColor: Colors.successGlow, borderColor: Colors.success },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.indigoLight },
  chipTextSuccess: { color: Colors.successLight },
  errorText: { fontSize: 12, color: Colors.dangerLight, marginBottom: 8 },
  kycInfo: { alignItems: 'center', marginBottom: 24, gap: 10 },
  kycTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  kycSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  kycNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12 },
  kycNoteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  signInLink: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  signInHighlight: { color: Colors.indigoLight, fontWeight: '700' },
});
