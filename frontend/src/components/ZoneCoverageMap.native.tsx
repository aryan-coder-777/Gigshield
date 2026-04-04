import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { Colors } from '../constants/Colors';
import { ZoneCenter } from '../lib/geoUtils';

type Props = {
  catalog: ZoneCenter[];
  highlightZoneNames: string[];
  userLatitude?: number | null;
  userLongitude?: number | null;
};

const MAP_HEIGHT = 240;

/**
 * iOS / Android: real map. This file is excluded from the web bundle via .native.tsx resolution.
 */
export default function ZoneCoverageMap({
  catalog,
  highlightZoneNames,
  userLatitude,
  userLongitude,
}: Props) {
  const hlSet = useMemo(() => {
    if (highlightZoneNames.length > 0) return new Set(highlightZoneNames);
    return new Set(catalog.map((z) => z.name));
  }, [highlightZoneNames, catalog]);

  const initialRegion = useMemo(() => {
    const w = Dimensions.get('window');
    const relevant = catalog.filter((z) => hlSet.has(z.name));
    const list = relevant.length ? relevant : catalog;
    const lat = list.reduce((s, z) => s + z.latitude, 0) / list.length;
    const lon = list.reduce((s, z) => s + z.longitude, 0) / list.length;
    const latDelta = Math.max(0.35, w.width > 400 ? 0.45 : 0.55);
    const lonDelta = latDelta * 1.1;
    return { latitude: lat, longitude: lon, latitudeDelta: latDelta, longitudeDelta: lonDelta };
  }, [catalog, hlSet]);

  return (
    <View style={styles.wrap}>
      <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation={false}>
        {catalog.map((z) => {
          const isHl = hlSet.has(z.name);
          if (highlightZoneNames.length > 0 && !isHl) return null;
          return (
            <React.Fragment key={z.name}>
              <Circle
                center={{ latitude: z.latitude, longitude: z.longitude }}
                radius={z.radius_km * 1000}
                strokeColor={isHl ? Colors.primaryBlue : 'rgba(100,116,139,0.7)'}
                fillColor={isHl ? 'rgba(37,99,235,0.12)' : 'rgba(148,163,184,0.08)'}
                strokeWidth={isHl ? 2 : 1}
              />
              <Marker
                coordinate={{ latitude: z.latitude, longitude: z.longitude }}
                title={z.name}
                description={`~${z.radius_km} km cover`}
                pinColor={isHl ? '#2563EB' : '#94A3B8'}
              />
            </React.Fragment>
          );
        })}
        {userLatitude != null &&
          userLongitude != null &&
          !Number.isNaN(userLatitude) &&
          !Number.isNaN(userLongitude) && (
            <Marker
              coordinate={{ latitude: userLatitude, longitude: userLongitude }}
              title="You"
              description="Device location"
              pinColor="#10B981"
            />
          )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MAP_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
  },
  map: { flex: 1 },
});
