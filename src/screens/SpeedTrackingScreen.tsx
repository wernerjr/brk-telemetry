import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Platform, TouchableOpacity } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
}

const SpeedTrackingScreen = ({ navigation }: any) => {
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [lastLocation, setLastLocation] = useState<Location | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [session, setSession] = useState<Location[]>([]);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);

  const calculateHaversineDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.latitude * Math.PI) / 180;
    const φ2 = (loc2.latitude * Math.PI) / 180;
    const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  };

  const calculateSpeed = (loc1: Location, loc2: Location): number => {
    const distance = calculateHaversineDistance(loc1, loc2);
    const timeDiff = (loc2.timestamp - loc1.timestamp) / 1000; // Convert to seconds
    if (timeDiff <= 0) return 0;
    const speedMps = distance / timeDiff; // meters per second
    const speedKmh = speedMps * 3.6; // convert to km/h
    return speedKmh;
  };

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy ?? undefined,
          altitude: position.coords.altitude ?? undefined,
        };
        const now = newLocation.timestamp;
        if (!lastSavedTimestamp || now - lastSavedTimestamp >= 1000) {
          const round6 = (num: number) => Math.round(num * 1e6) / 1e6;
          setCurrentLocation(newLocation);
          setSession((prev) => {
            if (prev.length === 0) return [newLocation];
            const last = prev[prev.length - 1];
            if (
              round6(last.latitude) !== round6(newLocation.latitude) ||
              round6(last.longitude) !== round6(newLocation.longitude)
            ) {
              return [...prev, newLocation];
            }
            return prev;
          });
          if (lastLocation) {
            const lastLat = round6(lastLocation.latitude);
            const lastLng = round6(lastLocation.longitude);
            const newLat = round6(newLocation.latitude);
            const newLng = round6(newLocation.longitude);
            if (lastLat !== newLat || lastLng !== newLng) {
              const speed = calculateSpeed(lastLocation, newLocation);
              setCurrentSpeed(Number.isFinite(speed) ? speed : 0);
              setLastLocation(newLocation);
            }
          } else {
            setLastLocation(newLocation);
          }
          setLastSavedTimestamp(now);
        }
      },
      (error) => console.log(error),
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: 500,
        fastestInterval: 500,
      }
    );
    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, [lastLocation]);

  const handleStop = async () => {
    // Salva a sessão localmente
    const sessionData = {
      id: Date.now(),
      date: new Date().toISOString(),
      track: session,
    };
    try {
      const prev = await AsyncStorage.getItem('sessions');
      const sessions = prev ? JSON.parse(prev) : [];
      sessions.push(sessionData);
      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));
    } catch (e) {
      console.log('Erro ao salvar sessão:', e);
    }
    navigation.navigate('Sessions');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.speedText}>{Number.isFinite(currentSpeed) ? currentSpeed.toFixed(1) : '0.0'} km/h</Text>
      {currentLocation && (
        <Text style={styles.coordsText}>
          Lat: {currentLocation.latitude.toFixed(6)}{"\n"}
          Lng: {currentLocation.longitude.toFixed(6)}{"\n"}
          Altitude: {currentLocation.altitude !== undefined ? currentLocation.altitude.toFixed(2) + ' m' : 'N/A'}{"\n"}
          Precisão: {currentLocation.accuracy !== undefined ? currentLocation.accuracy.toFixed(2) + ' m' : 'N/A'}
        </Text>
      )}
      <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
        <Text style={styles.stopButtonText}>Parar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  speedText: {
    fontSize: 72,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  coordsText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: '#F47820',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default SpeedTrackingScreen; 