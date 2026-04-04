// GigGuard Color System — Modern Clean Insurance Design
// Primary: GigGuard Blue #2563EB, Background: #F9FAFB, Cards: #FFFFFF

export const Colors = {
  // ── BRAND COLORS ──────────────────────────────────────
  paytmBlue: '#2563EB',        // Replaced Paytm with GigGuard primary blue
  paytmBlueDark: '#1D4ED8',    
  paytmBlueDarker: '#1E3A8A',  
  paytmNavy: '#1A365D',        // Deep Navy for Splash/Auth background
  
  // ── NEW GIGGUARD SPECIFICS ────────────────────────────
  primaryBlue: '#3B82F6',
  primaryNavy: '#1A365D',      // Deep navy background
  accentTeal: '#0D9488',       // Teal accents if needed
  
  // ── BACKGROUNDS ────────────────────────────────────────────
  bg: '#F9FAFB',               // Main screen background form samples
  bgDark: '#F3F4F6',           
  cardBg: '#FFFFFF',           // Clean white card background
  cardBgAlt: '#F8FAFC',        
  headerBg: '#1A365D',         // For any legacy dark headers

  // ── TEXT ───────────────────────────────────────────────────
  textPrimary: '#111827',      
  textSecondary: '#4B5563',    
  textMuted: '#9CA3AF',        
  textDisabled: '#D1D5DB',
  textOnBlue: '#FFFFFF',       
  textOnDark: '#FFFFFF',

  // ── SEMANTIC COLORS ────────────────────────────────────────
  success: '#059669',          // Green for active toggles and checkboxes
  successLight: '#10B981',
  successBg: '#D1FAE5',        
  warning: '#F59E0B',          
  warningLight: '#FBBF24',
  warningBg: '#FEF3C7',
  warningGlow: '#FFFBEB',
  danger: '#EF4444',           
  dangerLight: '#F87171',
  dangerBg: '#FEE2E2',
  paid: '#059669',

  // ── QUICK ACTION ICON COLORS ───────────────────────────────
  iconBlue: '#2563EB',
  iconGreen: '#059669',
  iconOrange: '#F59E0B',
  iconPurple: '#7C3AED',
  iconRed: '#EF4444',
  iconTeal: '#0D9488',
  iconPink: '#EC4899',
  iconGold: '#F59E0B',

  // ── ICON BACKGROUNDS (pastel) ──────────────────────────────
  iconBgBlue: '#DBEAFE',
  iconBgGreen: '#D1FAE5',
  iconBgOrange: '#FEF3C7',
  iconBgPurple: '#EDE9FE',
  iconBgRed: '#FEE2E2',
  iconBgTeal: '#CCFBF1',
  iconBgPink: '#FCE7F3',
  iconBgGold: '#FEF3C7',

  // ── BORDERS & DIVIDERS ─────────────────────────────────────
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',

  // ── SHADOWS ────────────────────────────────────────────────
  shadow: 'rgba(17, 24, 39, 0.05)',
  shadowBlue: 'rgba(37, 99, 235, 0.15)',

  // ── GRADIENT PAIRS ─────────────────────────────────────────
  gradientBlue: ['#1A365D', '#1E40AF'] as [string, string],
  gradientBlueBright: ['#2563EB', '#60A5FA'] as [string, string],
  gradientGreen: ['#059669', '#10B981'] as [string, string],

  // ── LEGACY (kept for compat) ────────────────────────────────
  navy: '#F9FAFB',
  navyCard: '#FFFFFF',
  navyBorder: '#E5E7EB',
  indigo: '#2563EB',
  indigoLight: '#3B82F6',
  indigoGlow: '#DBEAFE',
  orange: '#F59E0B',
  orangeLight: '#FBBF24',
  orangeGlow: '#FEF3C7',
  glass: '#F8FAFC',
  glassBorder: '#E5E7EB',
  successGlow: '#D1FAE5',
  white: '#FFFFFF',
  black: '#000000',
};
