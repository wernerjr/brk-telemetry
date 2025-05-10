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
  SafeAreaView,
  StatusBar
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
}

const COLORS = {
  orange: '#F47820',
  black: '#231F20',
  white: '#FFFFFF',
  lightGray: '#aaaaaa',
  green: '#4CAF50',
  blue: '#2196F3',
  darkBlue: 'rgba(33, 150, 243, 0.15)',
  red: '#F44336',
};

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      
      <LinearGradient
        colors={[COLORS.black, '#2a2a2a', COLORS.black]}
        style={styles.background}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
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
              Toque no mapa para definir a linha de chegada
            </Text>
            <TouchableOpacity 
              style={styles.closeMapButton} 
              onPress={toggleMap}
            >
              <Text style={styles.closeMapButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Configurar Sessão</Text>
            </View>
            
            <View style={styles.compactRow}>
              <View style={[styles.sectionCard, styles.nameInputContainer]}>
                <Text style={styles.sectionTitle}>Nome</Text>
                <TextInput
                  style={styles.textInput}
                  value={sessionName}
                  onChangeText={setSessionName}
                  placeholder="Nome da sessão"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  autoCapitalize="words"
                />
              </View>
              
              <View style={[styles.sectionCard, styles.gpsContainer]}>
                <Text style={styles.sectionTitle}>GPS</Text>
                <View style={styles.gpsContent}>
                  <Text style={styles.valueText}>
                    {currentAccuracy ? `${currentAccuracy.toFixed(1)}m` : '...'}
                  </Text>
                  <View style={styles.statusRow}>
                    <ActivityIndicator 
                      size="small" 
                      color={isReadyToStart ? COLORS.green : COLORS.orange} 
                    />
                    <Text style={[
                      styles.statusText, 
                      { color: isReadyToStart ? COLORS.green : COLORS.orange }
                    ]}>
                      {isReadyToStart ? 'OK' : 'Aguardando...'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.finishLineHeader}>
                <Text style={styles.sectionTitle}>Linha de Chegada</Text>
                <Text style={[
                  styles.finishLineStatus,
                  {color: finishLine ? COLORS.green : COLORS.orange}
                ]}>
                  {finishLine ? '✓ Definida' : '⚠️ Obrigatória'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.mapButton} 
                onPress={toggleMap}
                disabled={!currentLocation}
              >
                <Text style={styles.mapButtonText}>
                  {finishLine ? 'Alterar Linha' : 'Definir Linha'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.requirementsCard}>
              <View style={styles.requirementRow}>
                <View style={[
                  styles.statusIndicator, 
                  isReadyToStart ? styles.metIndicator : styles.notMetIndicator
                ]} />
                <Text style={[
                  styles.requirementText,
                  isReadyToStart ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  Precisão do GPS adequada
                </Text>
              </View>
              
              <View style={styles.requirementRow}>
                <View style={[
                  styles.statusIndicator, 
                  finishLine ? styles.metIndicator : styles.notMetIndicator
                ]} />
                <Text style={[
                  styles.requirementText,
                  finishLine ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  Linha de chegada definida
                </Text>
              </View>
              
              <View style={styles.requirementRow}>
                <View style={[
                  styles.statusIndicator, 
                  sessionName.trim() !== '' ? styles.metIndicator : styles.notMetIndicator
                ]} />
                <Text style={[
                  styles.requirementText,
                  sessionName.trim() !== '' ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  Nome da sessão preenchido
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.button, 
                styles.startButton,
                !canStart && styles.disabledButton
              ]} 
              onPress={handleStart}
              disabled={!canStart}
            >
              <Text style={styles.buttonText}>INICIAR SESSÃO</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  background: {
    position: 'absolute',
    width: width,
    height: height,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: COLORS.orange,
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
    flex: 1,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nameInputContainer: {
    flex: 2,
    marginRight: 8,
  },
  gpsContainer: {
    flex: 1,
  },
  gpsContent: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.orange,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 44,
  },
  valueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: 'monospace',
  },
  statusText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '600',
  },
  finishLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  finishLineStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  mapButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  mapButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  requirementsCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  metIndicator: {
    backgroundColor: COLORS.green,
  },
  notMetIndicator: {
    backgroundColor: COLORS.orange,
  },
  requirementText: {
    fontSize: 14,
  },
  requirementMet: {
    color: COLORS.green,
  },
  requirementNotMet: {
    color: COLORS.orange,
  },
  button: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    alignSelf: 'center',
    width: '90%',
  },
  startButton: {
    backgroundColor: COLORS.orange,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: 'rgba(244, 120, 32, 0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  mapContainer: {
    flex: 1,
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
    color: COLORS.white,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '90%',
  },
  closeMapButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  closeMapButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SessionSetupScreen; 