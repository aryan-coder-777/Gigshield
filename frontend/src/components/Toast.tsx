import React, { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CONFIG: Record<ToastVariant, { bg: string; icon: string; border: string }> = {
  success: { bg: '#022C22', icon: 'checkmark-circle',    border: Colors.success  },
  error:   { bg: '#2D0A0A', icon: 'close-circle',        border: Colors.danger   },
  info:    { bg: '#0C1A35', icon: 'information-circle',  border: Colors.primaryBlue },
  warning: { bg: '#2D1A00', icon: 'warning',             border: Colors.warning  },
};

const TEXT_COLOR: Record<ToastVariant, string> = {
  success: Colors.successLight,
  error:   Colors.dangerLight,
  info:    '#93C5FD',
  warning: Colors.warningLight,
};

let _idCounter = 0;

// ── Individual Toast Item ──────────────────────────────────────────────────

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  const vc  = VARIANT_CONFIG[toast.variant];
  const tc  = TEXT_COLOR[toast.variant];
  const dur = toast.duration ?? 3000;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => onDone(toast.id));
    }, dur);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: vc.bg,
          borderLeftColor: vc.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={vc.icon as any} size={20} color={tc} style={styles.toastIcon} />
      <Text style={[styles.toastText, { color: tc }]} numberOfLines={3}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

// ── Toast Provider ─────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = 'info', duration = 3000) => {
    const id = ++_idCounter;
    setToasts(prev => [...prev.slice(-2), { id, message, variant, duration }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    show,
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
    warning: (msg) => show(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDone={remove} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 14 : 28,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
});
