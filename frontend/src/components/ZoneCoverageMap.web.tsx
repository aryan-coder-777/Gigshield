import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { haversineKm, ZoneCenter } from '../lib/geoUtils';

type Props = {
  catalog: ZoneCenter[];
  highlightZoneNames: string[];
  userLatitude?: number | null;
  userLongitude?: number | null;
};

const MAP_HEIGHT = 240;

/**
 * Web build: list-only view. react-native-maps is native-only and must not be imported on web.
 */
export default function ZoneCoverageMap({
  catalog,
  highlightZoneNames,
  userLatitude,
  userLongitude,
}: Props) {
  const rows = useMemo(() => {
    const hl =
      highlightZoneNames.length > 0
        ? new Set(highlightZoneNames)
        : new Set(catalog.map((z) => z.name));
    return [...catalog]
      .filter((z) => hl.has(z.name))
      .map((z) => {
        let dist: number | null = null;
        if (
          userLatitude != null &&
          userLongitude != null &&
          !Number.isNaN(userLatitude) &&
          !Number.isNaN(userLongitude)
        ) {
          dist = haversineKm(userLatitude, userLongitude, z.latitude, z.longitude);
        }
        return { ...z, dist, isHl: true };
      })
      .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9));
  }, [catalog, highlightZoneNames, userLatitude, userLongitude]);

  return (
    <View style={styles.webBox}>
      <Text style={styles.webTitle}>Coverage zones (web)</Text>
      <Text style={styles.webSub}>
        Interactive map runs on iOS/Android. Below: API zone centers and distance from you (allow
        location in the browser when prompted).
      </Text>
      <ScrollView style={styles.webScroll} nestedScrollEnabled>
        {rows.map((z) => (
          <View key={z.name} style={[styles.webRow, z.isHl && styles.webRowHl]}>
            <Text style={styles.webName}>{z.name}</Text>
            <Text style={styles.webMeta}>
              {z.radius_km} km radius
              {z.dist != null ? ` · ${z.dist.toFixed(1)} km from you` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  webBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.navyCard,
    padding: 12,
    marginBottom: 12,
    maxHeight: MAP_HEIGHT + 40,
  },
  webTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  webSub: { fontSize: 11, color: Colors.textMuted, marginTop: 6, lineHeight: 16 },
  webScroll: { marginTop: 10, maxHeight: MAP_HEIGHT },
  webRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.glass,
    marginBottom: 6,
  },
  webRowHl: { borderWidth: 1, borderColor: Colors.indigo + '55' },
  webName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  webMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
