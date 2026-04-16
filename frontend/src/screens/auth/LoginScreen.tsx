import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authAPI } from '../../lib/api';
import { setMemoryToken } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!phone || phone.length !== 10) e.phone = 'Enter valid 10-digit phone';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authAPI.login(phone, password);
      const { access_token, worker_id, name, role, onboarding_complete } = res.data;
      // Prime the in-memory token cache FIRST so subsequent API calls (dashboard
      // data fetched immediately after navigation) are authenticated without
      // waiting for the AsyncStorage write to complete.
      setMemoryToken(access_token);
      await AsyncStorage.setItem('access_token', access_token);
      let workerProfile: any;
      try {
        const profileRes = await authAPI.getMe();
        workerProfile = profileRes.data;
      } catch {
        workerProfile = { id: worker_id, name, phone, role, onboarding_complete, zones: [], zone_risk_score: 0 };
      }
      await setAuth(access_token, workerProfile);
    } catch (err: any) {
      const isNetworkError = err.message === 'Network Error' || err.code === 'ECONNABORTED';
      const msg = isNetworkError
        ? 'Cannot connect to the server. Please ensure the Backend API black terminal is running!'
        : (err.response?.data?.detail || 'Login failed. Check your credentials.');
      
      if (Platform.OS === 'web') {
        window.alert(`Login Failed: ${msg}`);
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.paytmNavy} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Blue header */}
        <LinearGradient colors={Colors.gradientBlue} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>
            <View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your GigShield account</Text>
            </View>
          </View>
        </LinearGradient>

        {/* White form area */}
        <ScrollView
          style={styles.formArea}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Phone input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
            <View style={[styles.inputWrap, errors.phone ? styles.inputError : null]}>
              <View style={styles.inputPrefix}>
                <Text style={styles.prefixText}>+91</Text>
                <View style={styles.prefixDivider} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter mobile number"
                placeholderTextColor={Colors.textDisabled}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          {/* Password input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={[styles.inputWrap, errors.password ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={Colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading  ? styles.loginBtnDisabled : null]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={Colors.gradientBlueBright} style={styles.loginBtnGrad}>
              {loading ? (
                <Text style={styles.loginBtnText}>Signing in...</Text>
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>QUICK DEMO</Text>
            <View style={styles.divider} />
          </View>

          {/* Demo quick fill */}
          <View style={styles.demoRow}>
            <TouchableOpacity
              style={styles.demoCard}
              onPress={() => { setPhone('9876543210'); setPassword('ravi1234'); }}
              activeOpacity={0.8}
            >
              <View style={[styles.demoAvatar, { backgroundColor: Colors.iconBgBlue }]}>
                <Ionicons name="person" size={16} color={Colors.paytmBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.demoName}>Worker Demo</Text>
                <Text style={styles.demoSub}>Ravi Kumar · Amazon</Text>
              </View>
              <Ionicons name="flash" size={14} color={Colors.paytmBlue} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoCard, { borderColor: Colors.warningBg }]}
              onPress={() => { setPhone('0000000000'); setPassword('admin123'); }}
              activeOpacity={0.8}
            >
              <View style={[styles.demoAvatar, { backgroundColor: Colors.warningBg }]}>
                <Ionicons name="settings" size={16} color={Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.demoName, { color: Colors.warning }]}>Admin Demo</Text>
                <Text style={styles.demoSub}>GigShield Admin</Text>
              </View>
              <Ionicons name="flash" size={14} color={Colors.warning} />
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>New to GigShield? </Text>
            <Text style={styles.registerHighlight}>Create Account →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 20 : 36,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  formArea: { flex: 1, backgroundColor: Colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  scroll: { padding: 24, paddingBottom: 40 },

  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    height: 52, overflow: 'hidden',
  },
  inputError: { borderColor: Colors.danger },
  inputPrefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: '100%', backgroundColor: Colors.bgDark },
  prefixText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginRight: 8 },
  prefixDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  textInput: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  errorText: { fontSize: 11, color: Colors.danger, marginTop: 4, marginLeft: 4 },

  loginBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4, marginBottom: 24 },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  loginBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5 },

  demoRow: { gap: 10, marginBottom: 24 },
  demoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.iconBgBlue,
    padding: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  demoAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  demoName: { fontSize: 13, fontWeight: '800', color: Colors.paytmBlue },
  demoSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  registerLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  registerText: { fontSize: 14, color: Colors.textSecondary },
  registerHighlight: { fontSize: 14, color: Colors.paytmBlue, fontWeight: '800' },
});
