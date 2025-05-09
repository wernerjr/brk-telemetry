import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const AccuracyWaitScreen = ({ navigation }: any) => {
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [isReadyToStart, setIsReadyToStart] = useState<boolean>(false);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy || 100;
        setCurrentAccuracy(accuracy);
        setIsReadyToStart(accuracy < 10);
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

  const handleStart = () => {
    navigation.navigate('SpeedTracking');
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
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
    marginBottom: 60,
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
});

export default AccuracyWaitScreen; 