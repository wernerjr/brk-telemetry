import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, FlatList } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';

interface SpeedData {
  speed: number;
  color: string;
}

interface LapData {
  lapNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  track?: any[];
  isDecelerationLap?: boolean;
}

const SessionDetailScreen = ({ route, navigation }: any) => {
  const { session } = route.params;
  const [sessionStats, setSessionStats] = useState({
    avgSpeed: 0,
    maxSpeed: 0,
    duration: 0,
    distance: 0,
  });
  const [selectedLap, setSelectedLap] = useState<LapData | null>(null);
  
  // Creates segments of polylines with colors based on speed
  const getTrackSegments = (trackData: any[] = session.track) => {
    if (!trackData || trackData.length < 2) return [];
    
    const segments: { points: any[], color: string }[] = [];
    const speeds: number[] = [];
    
    // Calculate speeds for all track points
    for (let i = 1; i < trackData.length; i++) {
      const prev = trackData[i - 1];
      const curr = trackData[i];
      
      const distance = calculateHaversineDistance(prev, curr);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h
      
      speeds.push(speed);
    }
    
    // Find max speed
    const maxSpeed = Math.max(...speeds);
    
    // Create segments with colors
    for (let i = 1; i < trackData.length; i++) {
      const speed = speeds[i - 1];
      const color = getSpeedColor(speed, maxSpeed);
      
      segments.push({
        points: [
          { latitude: trackData[i - 1].latitude, longitude: trackData[i - 1].longitude },
          { latitude: trackData[i].latitude, longitude: trackData[i].longitude }
        ],
        color: color
      });
    }
    
    return segments;
  };
  
  // Formatar tempo em minutos:segundos.milissegundos
  const formatLapTime = (timeMs: number): string => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = Math.floor((timeMs % 1000) / 10); // Centésimos de segundo
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
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
  const getInitialRegion = (trackData: any[] = session.track) => {
    if (!trackData || trackData.length === 0) {
      // Default region if no track
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // Find min and max lat/lng to determine bounds
    let minLat = trackData[0].latitude;
    let maxLat = trackData[0].latitude;
    let minLng = trackData[0].longitude;
    let maxLng = trackData[0].longitude;
    
    trackData.forEach((point: any) => {
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
  
  const trackSegments = useMemo(() => {
    if (selectedLap && selectedLap.track && selectedLap.track.length > 0) {
      return getTrackSegments(selectedLap.track);
    }
    return getTrackSegments();
  }, [session, selectedLap]);
  
  const initialRegion = useMemo(() => {
    if (selectedLap && selectedLap.track && selectedLap.track.length > 0) {
      return getInitialRegion(selectedLap.track);
    }
    return getInitialRegion();
  }, [session, selectedLap]);
  
  // Encontrar a volta mais rápida
  const getFastestLap = () => {
    if (!session.laps || session.laps.length === 0) return null;
    
    let fastestLap = session.laps[0];
    for (let i = 1; i < session.laps.length; i++) {
      if (session.laps[i].duration < fastestLap.duration) {
        fastestLap = session.laps[i];
      }
    }
    
    return fastestLap;
  };
  
  const fastestLap = useMemo(() => getFastestLap(), [session]);
  
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
  
  const renderLapItem = ({ item, index }: { item: LapData, index: number }) => {
    const isFastest = fastestLap && item.lapNumber === fastestLap.lapNumber;
    const isSelected = selectedLap && item.lapNumber === selectedLap.lapNumber;
    
    return (
      <TouchableOpacity 
        onPress={() => {
          if (isSelected) {
            // Deselect if already selected
            setSelectedLap(null);
          } else {
            setSelectedLap(item);
          }
        }}
      >
        <View style={[
          styles.lapItem, 
          isFastest && styles.fastestLapItem,
          isSelected && styles.selectedLapItem
        ]}>
          <View style={styles.lapNumberContainer}>
            <Text style={styles.lapNumber}>{item.lapNumber}</Text>
          </View>
          <View style={styles.lapTimeContainer}>
            <Text style={[
              styles.lapTime, 
              isFastest && styles.fastestLapTime,
              isSelected && styles.selectedLapTime
            ]}>
              {formatLapTime(item.duration)}
            </Text>
            {isFastest && <Text style={styles.fastestLabel}>MAIS RÁPIDA</Text>}
            {isSelected && <Text style={styles.selectedLabel}>SELECIONADA</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <ScrollView style={styles.container}>
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
        {((selectedLap && selectedLap.track && selectedLap.track.length > 0) || 
           (session.track && session.track.length > 0)) ? (
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
            {(selectedLap && selectedLap.track && selectedLap.track.length > 0) ? (
              <Marker 
                coordinate={{
                  latitude: selectedLap.track[0].latitude,
                  longitude: selectedLap.track[0].longitude
                }}
                title="Início da Volta"
                pinColor="green"
              />
            ) : (
              session.track && session.track.length > 0 && (
                <Marker 
                  coordinate={{
                    latitude: session.track[0].latitude,
                    longitude: session.track[0].longitude
                  }}
                  title="Início"
                  pinColor="green"
                />
              )
            )}
            
            {/* End marker */}
            {(selectedLap && selectedLap.track && selectedLap.track.length > 0) ? (
              <Marker 
                coordinate={{
                  latitude: selectedLap.track[selectedLap.track.length - 1].latitude,
                  longitude: selectedLap.track[selectedLap.track.length - 1].longitude
                }}
                title="Fim da Volta"
                pinColor="red"
              />
            ) : (
              session.track && session.track.length > 1 && (
                <Marker 
                  coordinate={{
                    latitude: session.track[session.track.length - 1].latitude,
                    longitude: session.track[session.track.length - 1].longitude
                  }}
                  title="Fim"
                  pinColor="red"
                />
              )
            )}
            
            {/* Finish line marker */}
            {session.finishLine && (
              <Marker 
                coordinate={{
                  latitude: session.finishLine.latitude,
                  longitude: session.finishLine.longitude
                }}
                title="Linha de Chegada"
                pinColor="blue"
              />
            )}
          </MapView>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Nenhum dado de trajeto disponível</Text>
          </View>
        )}
      </View>
      
      {/* Laps Section */}
      {session.laps && session.laps.length > 0 && (
        <View style={styles.lapsContainer}>
          <Text style={styles.sectionTitle}>Voltas</Text>
          <Text style={styles.lapCount}>
            {selectedLap 
              ? `Visualizando: Volta ${selectedLap.lapNumber} (toque para desselecionar)`
              : `Total: ${session.laps.length} voltas (toque para visualizar)`}
          </Text>
          
          {fastestLap && (
            <View style={styles.fastestLapContainer}>
              <Text style={styles.fastestLapTitle}>Volta mais rápida</Text>
              <Text style={styles.fastestLapValue}>
                Volta {fastestLap.lapNumber}: {formatLapTime(fastestLap.duration)}
              </Text>
            </View>
          )}
          
          <FlatList
            data={session.laps}
            renderItem={renderLapItem}
            keyExtractor={(item) => `lap-${item.lapNumber}`}
            scrollEnabled={false}
            style={styles.lapList}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    marginTop: 50,
    marginLeft: 20,
    marginBottom: 10,
  },
  backButtonText: {
    color: '#F47820',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F47820',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  noDataContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  noDataText: {
    color: '#aaa',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  lapsContainer: {
    padding: 15,
    marginBottom: 20,
  },
  lapCount: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 15,
    textAlign: 'center',
  },
  fastestLapContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  fastestLapTitle: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 5,
  },
  fastestLapValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  lapList: {
    width: '100%',
  },
  lapItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fastestLapItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  selectedLapItem: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  lapNumberContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(244, 120, 32, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lapNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lapTimeContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 15,
  },
  lapTime: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  fastestLapTime: {
    color: '#4CAF50',
  },
  selectedLapTime: {
    color: '#2196F3',
  },
  fastestLabel: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
});

export default SessionDetailScreen; 