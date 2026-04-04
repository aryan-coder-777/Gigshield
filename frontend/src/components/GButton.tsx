import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const GButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: size === 'lg' ? 16 : size === 'sm' ? 8 : 12,
      paddingVertical: size === 'lg' ? 18 : size === 'sm' ? 8 : 14,
      paddingHorizontal: size === 'lg' ? 32 : size === 'sm' ? 16 : 24,
      opacity: disabled ? 0.5 : 1,
      ...(fullWidth && { width: '100%' }),
    };

    switch (variant) {
      case 'primary':
        return { ...base, backgroundColor: Colors.paytmBlue };
      case 'secondary':
        return { ...base, backgroundColor: Colors.warning };
      case 'outline':
        return { ...base, backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.paytmBlue };
      case 'danger':
        return { ...base, backgroundColor: Colors.danger };
      case 'ghost':
        return { ...base, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder };
      default:
        return { ...base, backgroundColor: Colors.paytmBlue };
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '700',
      fontSize: size === 'lg' ? 17 : size === 'sm' ? 13 : 15,
      letterSpacing: 0.3,
    };
    switch (variant) {
      case 'outline':
        return { ...base, color: Colors.paytmBlue };
      case 'ghost':
        return { ...base, color: Colors.textSecondary };
      default:
        return { ...base, color: Colors.white };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
