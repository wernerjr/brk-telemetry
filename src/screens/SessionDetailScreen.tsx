import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';

interface SpeedData {
  speed: number;
  color: string;
}

const SessionDetailScreen = ({ route, navigation }: any) => {
  const { session } = route.params;
  const [sessionStats, setSessionStats] = useState({
    avgSpeed: 0,
    maxSpeed: 0,
    duration: 0,
    distance: 0,
  });
  
  // Creates segments of polylines with colors based on speed
  const getTrackSegments = () => {
    if (!session.track || session.track.length < 2) return [];
    
    const segments: { points: any[], color: string }[] = [];
    const speeds: number[] = [];
    
    // Calculate speeds for all track points
    for (let i = 1; i < session.track.length; i++) {
      const prev = session.track[i - 1];
      const curr = session.track[i];
      
      const distance = calculateHaversineDistance(prev, curr);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h
      
      speeds.push(speed);
    }
    
    // Find max speed
    const maxSpeed = Math.max(...speeds);
    
    // Create segments with colors
    for (let i = 1; i < session.track.length; i++) {
      const speed = speeds[i - 1];
      const color = getSpeedColor(speed, maxSpeed);
      
      segments.push({
        points: [
          { latitude: session.track[i - 1].latitude, longitude: session.track[i - 1].longitude },
          { latitude: session.track[i].latitude, longitude: session.track[i].longitude }
        ],
        color: color
      });
    }
    
    return segments;
  };
  
  const calculateSessionStats = () => {
    if (!session.track || session.track.length < 2) {
      return {
        avgSpeed: 0,
        maxSpeed: 0,
        duration: 0,
        distance: 0,
      };
    }
    
    let totalDistance = 0;
    let maxSpeed = 0;
    const speeds: number[] = [];
    
    // Calculate distances and speeds
    for (let i = 1; i < session.track.length; i++) {
      const prev = session.track[i - 1];
      const curr = session.track[i];
      
      const distance = calculateHaversineDistance(prev, curr);
      totalDistance += distance;
      
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        const speed = (distance / timeDiff) * 3.6; // km/h
        speeds.push(speed);
        if (speed > maxSpeed) maxSpeed = speed;
      }
    }
    
    // Calculate duration
    const duration = (session.track[session.track.length - 1].timestamp - session.track[0].timestamp) / 1000; // seconds
    
    // Calculate average speed
    const avgSpeed = speeds.length > 0 ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0;
    
    return {
      avgSpeed: avgSpeed,
      maxSpeed: maxSpeed,
      duration: duration,
      distance: totalDistance / 1000, // convert to km
    };
  };
  
  const calculateHaversineDistance = (loc1: any, loc2: any): number => {
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
  
  // Function to get a color based on speed (green to red)
  const getSpeedColor = (speed: number, maxSpeed: number): string => {
    if (maxSpeed === 0) return '#00FF00'; // Default green if no max speed
    
    const ratio = Math.min(speed / maxSpeed, 1); // Normalize between 0 and 1
    
    // Generate RGB components for a gradient between green (low speed) and red (high speed)
    const r = Math.floor(255 * ratio);
    const g = Math.floor(255 * (1 - ratio));
    const b = 0;
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Calculate the initial region for the map to focus on the track
  const getInitialRegion = () => {
    if (!session.track || session.track.length === 0) {
      // Default region if no track
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // Find min and max lat/lng to determine bounds
    let minLat = session.track[0].latitude;
    let maxLat = session.track[0].latitude;
    let minLng = session.track[0].longitude;
    let maxLng = session.track[0].longitude;
    
    session.track.forEach((point: any) => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });
    
    // Calculate center and deltas with some padding
    const padding = 1.5; // Add 50% padding around the bounds
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * padding;
    const lngDelta = (maxLng - minLng) * padding;
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01), // Ensure minimum zoom
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };
  
  const trackSegments = useMemo(() => getTrackSegments(), [session]);
  const initialRegion = useMemo(() => getInitialRegion(), [session]);
  
  useEffect(() => {
    const stats = calculateSessionStats();
    setSessionStats(stats);
  }, [session]);
  
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'< Voltar'}</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Sessão #{session.id}</Text>
      <Text style={styles.subtitle}>Data: {new Date(session.date).toLocaleString()}</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionStats.avgSpeed.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Vel. Média (km/h)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionStats.maxSpeed.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Vel. Máxima (km/h)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatTime(sessionStats.duration)}</Text>
          <Text style={styles.statLabel}>Tempo</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionStats.distance.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Distância (km)</Text>
        </View>
      </View>
      
      <View style={styles.mapContainer}>
        {session.track && session.track.length > 0 ? (
          <MapView 
            style={styles.map}
            initialRegion={initialRegion}
            mapType="standard"
          >
            {trackSegments.map((segment, index) => (
              <Polyline
                key={index}
                coordinates={segment.points}
                strokeColor={segment.color}
                strokeWidth={5}
              />
            ))}
            
            {/* Start marker */}
            {session.track.length > 0 && (
              <Marker 
                coordinate={{
                  latitude: session.track[0].latitude,
                  longitude: session.track[0].longitude
                }}
                title="Início"
                pinColor="green"
              />
            )}
            
            {/* End marker */}
            {session.track.length > 1 && (
              <Marker 
                coordinate={{
                  latitude: session.track[session.track.length - 1].latitude,
                  longitude: session.track[session.track.length - 1].longitude
                }}
                title="Fim"
                pinColor="red"
              />
            )}
          </MapView>
        ) : (
          <View style={styles.emptyMapContainer}>
            <Text style={styles.emptyText}>Nenhum ponto registrado.</Text>
          </View>
        )}
      </View>
      
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Velocidade</Text>
        <View style={styles.legendBar}>
          <Text style={styles.legendText}>Baixa</Text>
          <LinearGradient 
            colors={['#00FF00', '#FFFF00', '#FF0000']} 
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.legendGradient} 
          />
          <Text style={styles.legendText}>Alta</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231F20',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: '#F47820',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F47820',
    marginBottom: 12,
    marginTop: 40,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    width: '50%',
    padding: 8,
  },
  statValue: {
    color: '#F47820',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  emptyMapContainer: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.5,
  },
  legend: {
    marginBottom: 20,
  },
  legendTitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  legendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendGradient: {
    height: 8,
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default SessionDetailScreen; 