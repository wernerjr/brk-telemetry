import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
}

const SessionSetupScreen = ({ navigation }: any) => {
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [isReadyToStart, setIsReadyToStart] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [finishLine, setFinishLine] = useState<Location | null>(null);
  const [mapVisible, setMapVisible] = useState<boolean>(false);
  const [sessionName, setSessionName] = useState<string>('');

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
  
  // Verificação para ativar o botão de início
  const canStart = isReadyToStart && finishLine !== null && sessionName.trim() !== '';

  const handleStart = async () => {
    // Verificar se a linha de chegada foi definida
    if (!finishLine) {
      Alert.alert(
        "Linha de Chegada Não Definida",
        "É necessário definir uma linha de chegada para iniciar a sessão.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Verificar se o nome da sessão foi preenchido
    if (sessionName.trim() === '') {
      Alert.alert(
        "Nome da Sessão",
        "É necessário dar um nome à sessão antes de iniciar.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Salvar linha de chegada e nome da sessão
    await AsyncStorage.setItem('finishLine', JSON.stringify(finishLine));
    
    // Navegar para a tela de rastreamento com os parâmetros
    navigation.navigate('SpeedTracking', { 
      finishLine,
      sessionName: sessionName.trim()
    });
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
                mapType="satellite"
                showsCompass={true}
                showsUserLocation={true}
                zoomControlEnabled={true}
              >
                {currentLocation && (
                  <Marker
                    coordinate={currentLocation}
                    title="Sua posição atual"
                    description="Posição atual com base no GPS"
                    pinColor="blue"
                  />
                )}
                {finishLine && (
                  <Marker
                    coordinate={finishLine}
                    title="Linha de chegada/chegada"
                    description="Ponto para contar voltas"
                    pinColor="red"
                  />
                )}
              </MapView>
              <Text style={styles.mapInstructions}>
                Toque no mapa para definir a linha de chegada/chegada (ponto vermelho)
              </Text>
              <TouchableOpacity 
                style={styles.closeMapButton} 
                onPress={toggleMap}
              >
                <Text style={styles.closeMapButtonText}>Confirmar Linha</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Configurar Sessão</Text>
              
              {/* Campo de nome da sessão */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome da Sessão:</Text>
                <TextInput
                  style={styles.textInput}
                  value={sessionName}
                  onChangeText={setSessionName}
                  placeholder="Ex: Treino Interlagos 12/07"
                  placeholderTextColor="#777"
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.accuracyContainer}>
                <Text style={styles.accuracyLabel}>Precisão do GPS:</Text>
                <Text style={styles.accuracyValue}>
                  {currentAccuracy ? `${currentAccuracy.toFixed(1)} m` : 'Calculando...'}
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
                      ? 'Precisão adequada! ✓' 
                      : 'Aguardando precisão (< 10m)...'}
                  </Text>
                </View>
              </View>

              <View style={styles.finishLineContainer}>
                <Text style={styles.finishLineTitle}>Linha de Chegada:</Text>
                <Text style={[
                  styles.finishLineText,
                  {color: finishLine ? '#4CAF50' : '#F47820'}
                ]}>
                  {finishLine 
                    ? '✓ Linha de chegada definida!' 
                    : '⚠️ Definição obrigatória'}
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
                    !canStart && styles.disabledButton
                  ]} 
                  onPress={handleStart}
                  disabled={!canStart}
                >
                  <Text style={styles.buttonText}>Iniciar</Text>
                </TouchableOpacity>
              </View>
              
              {/* Status dos requisitos */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Requisitos para iniciar:</Text>
                <Text style={[
                  styles.requirementItem, 
                  isReadyToStart ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  {isReadyToStart ? '✓' : '○'} Precisão do GPS adequada
                </Text>
                <Text style={[
                  styles.requirementItem, 
                  finishLine ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  {finishLine ? '✓' : '○'} Linha de chegada definida
                </Text>
                <Text style={[
                  styles.requirementItem, 
                  sessionName.trim() !== '' ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  {sessionName.trim() !== '' ? '✓' : '○'} Nome da sessão preenchido
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F47820',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  },
  accuracyContainer: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  accuracyLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  accuracyValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 10,
  },
  finishLineContainer: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  finishLineTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  finishLineText: {
    fontSize: 16,
    marginBottom: 15,
    fontWeight: '600',
  },
  mapButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeMapButton: {
    backgroundColor: '#F47820',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  closeMapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  requirementsContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
  },
  requirementsTitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 10,
  },
  requirementItem: {
    fontSize: 14,
    marginBottom: 6,
  },
  requirementMet: {
    color: '#4CAF50',
  },
  requirementNotMet: {
    color: '#F47820',
  },
});

export default SessionSetupScreen; 