import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
}

const AccuracyWaitScreen = ({ navigation }: any) => {
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [isReadyToStart, setIsReadyToStart] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [finishLine, setFinishLine] = useState<Location | null>(null);
  const [mapVisible, setMapVisible] = useState<boolean>(false);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy || 100;
        setCurrentAccuracy(accuracy);
        setIsReadyToStart(accuracy < 10);
        
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentLocation(location);
      },
      (error) => console.log(error),
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: 1000,
        fastestInterval: 1000,
      }
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, []);

  const handleStart = async () => {
    if (finishLine) {
      await AsyncStorage.setItem('finishLine', JSON.stringify(finishLine));
    }
    navigation.navigate('SpeedTracking', { finishLine });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const toggleMap = () => {
    setMapVisible(!mapVisible);
  };

  const handleMapPress = (event: any) => {
    setFinishLine(event.nativeEvent.coordinate);
  };

  return (
    <View style={styles.container}>
      {mapVisible && currentLocation ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            onPress={handleMapPress}
            mapType="standard"
          >
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                title="Sua posição"
                pinColor="blue"
              />
            )}
            {finishLine && (
              <Marker
                coordinate={finishLine}
                title="Linha de chegada"
                pinColor="red"
              />
            )}
          </MapView>
          <TouchableOpacity 
            style={styles.closeMapButton} 
            onPress={toggleMap}
          >
            <Text style={styles.closeMapButtonText}>Fechar Mapa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Preparando GPS</Text>
          
          <View style={styles.accuracyContainer}>
            <Text style={styles.accuracyLabel}>Precisão atual:</Text>
            <Text style={styles.accuracyValue}>
              {currentAccuracy ? `${currentAccuracy.toFixed(2)} m` : 'Calculando...'}
            </Text>
            
            <View style={styles.indicatorContainer}>
              <ActivityIndicator 
                size="large" 
                color={isReadyToStart ? '#4CAF50' : '#F47820'} 
              />
              <Text style={[
                styles.statusText, 
                { color: isReadyToStart ? '#4CAF50' : '#F47820' }
              ]}>
                {isReadyToStart 
                  ? 'Precisão adequada! Pronto para iniciar.' 
                  : 'Aguardando precisão adequada (< 10m)...'}
              </Text>
            </View>
          </View>

          <View style={styles.finishLineContainer}>
            <Text style={styles.finishLineText}>
              {finishLine 
                ? 'Linha de chegada definida!' 
                : 'Nenhuma linha de chegada definida'}
            </Text>
            <TouchableOpacity 
              style={styles.mapButton} 
              onPress={toggleMap}
              disabled={!currentLocation}
            >
              <Text style={styles.mapButtonText}>
                {finishLine ? 'Alterar Linha de Chegada' : 'Definir Linha de Chegada'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={handleCancel}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.startButton,
                !isReadyToStart && styles.disabledButton
              ]} 
              onPress={handleStart}
              disabled={!isReadyToStart}
            >
              <Text style={styles.buttonText}>Iniciar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  accuracyContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  accuracyLabel: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  indicatorContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  finishLineContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  finishLineText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  mapButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  startButton: {
    backgroundColor: '#F47820',
  },
  disabledButton: {
    backgroundColor: 'rgba(244, 120, 32, 0.5)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: width,
    height: height,
  },
  closeMapButton: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#F47820',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  closeMapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccuracyWaitScreen; 