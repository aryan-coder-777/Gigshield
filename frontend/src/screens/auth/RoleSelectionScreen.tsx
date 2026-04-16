import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';

const ROLES = [
  { id: 'delivery', label: 'Delivery Driver', icon: 'cube-outline' },
  { id: 'rideshare', label: 'Ride Share', icon: 'car-outline' },
  { id: 'freelance', label: 'Freelance Designer', icon: 'color-palette-outline' },
  { id: 'handyman', label: 'Handyman', icon: 'hammer-outline' },
];

export default function RoleSelectionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setAuth } = useAuthStore();
  
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleNext = async () => {
    // Simulated save of selectedRoles
    if (route.params?.access_token && route.params?.workerObj) {
      await setAuth(route.params.access_token, route.params.workerObj);
      // setAuth automatically handles navigation via App.tsx listening to auth state change,
      // but we can ensure reset:
      navigation.reset({ index: 0, routes: [{ name: 'WorkerApp' }] });
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.timeText}>9:41</Text>
        
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Gig</Text>
          <Text style={styles.subtitle}>Select all the roles you perform for tailored coverage.</Text>
        </View>

        <View style={styles.list}>
          {ROLES.map((role) => {
            const isSelected = selectedRoles.includes(role.id);
            return (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleItem, isSelected ? styles.roleItemSelected : null]}
                onPress={() => toggleRole(role.id)}
                activeOpacity={0.7}
              >
                <View style={styles.roleLeft}>
                  <Ionicons name={role.icon as any} size={24} color={Colors.accentTeal} style={styles.roleIcon} />
                  <Text style={styles.roleLabel}>{role.label}</Text>
                </View>
                <View style={[styles.checkbox, isSelected ? styles.checkboxActive : null]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.nextBtn, selectedRoles.length === 0 ? styles.nextBtnDisabled : null]}
            disabled={selectedRoles.length === 0}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cardBg,
  },
  scroll: {
    padding: 24,
    paddingTop: 12,
    flexGrow: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  roleItemSelected: {
    // optional subtle highlight background
  },
  roleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    marginRight: 16,
  },
  roleLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0D9488', // Green/Teal accent match
    borderColor: '#0D9488',
  },
  footer: {
    marginTop: 40,
    paddingBottom: 20,
  },
  nextBtn: {
    backgroundColor: '#0D9488', // Teal
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    color: '#0D9488',
    fontSize: 15,
    fontWeight: '600',
  },
});
