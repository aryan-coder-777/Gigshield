import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../constants/Colors';

interface GCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: 'indigo' | 'orange' | 'success' | 'danger' | 'warning' | 'none';
  padding?: number;
}

export const GCard: React.FC<GCardProps> = ({
  children,
  style,
  glow = 'none',
  padding = 20,
}) => {
  const glowColors: Record<string, string> = {
    indigo: Colors.iconBgBlue,
    orange: Colors.warningBg,
    success: Colors.successBg,
    danger: Colors.dangerBg,
    warning: Colors.warningBg,
    none: 'transparent',
  };

  return (
    <View
      style={[
        styles.card,
        { padding, shadowColor: glowColors[glow] },
        glow !== 'none' && { borderColor: glowColors[glow] },
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface GBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'indigo' | 'orange' | 'muted';
  size?: 'sm' | 'md';
}

export const GBadge: React.FC<GBadgeProps> = ({ label, variant = 'indigo', size = 'md' }) => {
  const configs: Record<string, { bg: string; text: string }> = {
    success: { bg: Colors.successBg, text: Colors.successLight },
    warning: { bg: Colors.warningBg, text: Colors.warningLight },
    danger: { bg: Colors.dangerBg, text: Colors.dangerLight },
    indigo: { bg: Colors.iconBgBlue, text: Colors.paytmBlue },
    orange: { bg: Colors.warningBg, text: Colors.warningLight },
    muted: { bg: Colors.glass, text: Colors.textSecondary },
  };
  const { bg, text } = configs[variant] || configs.indigo;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'sm' && { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 }]}>
      <Text style={[styles.badgeText, { color: text }, size === 'sm' && { fontSize: 11 }]}>
        {label}
      </Text>
    </View>
  );
};

interface GDividerProps {
  style?: StyleProp<ViewStyle>;
}

export const GDivider: React.FC<GDividerProps> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

interface GStatProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export const GStat: React.FC<GStatProps> = ({ label, value, sub, color = Colors.textPrimary }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub && <Text style={styles.statSub}>{sub}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navyCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.navyBorder,
    marginVertical: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  statSub: {
    fontSize: 10,
    color: Colors.textDisabled,
    marginTop: 1,
  },
});
