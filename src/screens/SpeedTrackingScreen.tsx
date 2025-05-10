import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, SafeAreaView } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrientationUtil from '../utils/OrientationUtil';

interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  lapNumber?: number; // Adicionando o número da volta à localização
}

interface FinishLine {
  latitude: number;
  longitude: number;
}

interface LapData {
  lapNumber: number;
  startTime: number;
  endTime: number;
  duration: number; // em milissegundos
  track: Location[]; // Armazenar as coordenadas desta volta
  isDecelerationLap?: boolean; // Identificar se é uma volta de desaceleração
}

const SpeedTrackingScreen = ({ navigation, route }: any) => {
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [lastLocation, setLastLocation] = useState<Location | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [session, setSession] = useState<Location[]>([]);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
  const [finishLine, setFinishLine] = useState<FinishLine | null>(route.params?.finishLine || null);
  const [distanceToFinish, setDistanceToFinish] = useState<number | null>(null);
  const [finishReached, setFinishReached] = useState<boolean>(false);
  
  // Variáveis para controle de voltas
  const [lapCount, setLapCount] = useState<number>(0);
  const [laps, setLaps] = useState<LapData[]>([]);
  const [currentLapStartTime, setCurrentLapStartTime] = useState<number | null>(null);
  const [currentLapTime, setCurrentLapTime] = useState<number>(0);
  const [lastLapTime, setLastLapTime] = useState<number | null>(null);
  const [canCrossFinishLine, setCanCrossFinishLine] = useState<boolean>(true);
  const [currentLapTrack, setCurrentLapTrack] = useState<Location[]>([]);
  const [firstCrossing, setFirstCrossing] = useState<boolean>(false);
  
  // Timer para atualizar o tempo da volta atual
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionActive = useRef<boolean>(true);
  const preStartTrack = useRef<Location[]>([]);

  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const isLandscape = screenDimensions.width > screenDimensions.height;
  
  // Efeito para monitorar mudanças na orientação da tela
  useEffect(() => {
    const updateDimensions = () => {
      const dims = Dimensions.get('window');
      setScreenDimensions(dims);
    };
    
    // Listener para detectar mudanças na orientação
    Dimensions.addEventListener('change', updateDimensions);
    
    // Ocultar barra de status na orientação landscape
    StatusBar.setHidden(true);
    
    return () => {
      // Limpar o listener e mostrar a barra de status novamente
      //@ts-ignore
      Dimensions.removeEventListener('change', updateDimensions);
      StatusBar.setHidden(false);
    };
  }, []);

  const calculateHaversineDistance = (loc1: Location | FinishLine, loc2: Location | FinishLine): number => {
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
  
  // Formatar tempo em minutos:segundos.milissegundos
  const formatLapTime = (timeMs: number): string => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = Math.floor((timeMs % 1000) / 10); // Centésimos de segundo
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };
  
  // Limpar todos os dados da sessão anterior
  const clearSessionData = async () => {
    await AsyncStorage.removeItem('currentSession');
    setSession([]);
    setLapCount(0);
    setLaps([]);
    setLastLapTime(null);
    setCurrentLapTrack([]);
    setFinishReached(false);
    setFirstCrossing(false);
    preStartTrack.current = [];
    sessionActive.current = true;
  };
  
  // Iniciar o timer para atualizar o tempo da volta atual
  useEffect(() => {
    if (currentLapStartTime && sessionActive.current) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setCurrentLapTime(now - currentLapStartTime);
      }, 100);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentLapStartTime]);

  // Efeito para limpar dados ao montar o componente
  useEffect(() => {
    clearSessionData();
    
    // Carregar linha de chegada do AsyncStorage se não foi passada por parâmetro
    const loadFinishLine = async () => {
      if (!finishLine) {
        try {
          const savedFinishLine = await AsyncStorage.getItem('finishLine');
          if (savedFinishLine) {
            setFinishLine(JSON.parse(savedFinishLine));
          }
        } catch (e) {
          console.log('Erro ao carregar linha de chegada:', e);
        }
      }
    };
    
    loadFinishLine();
    
    // Não iniciar a primeira volta automaticamente
    // A volta começará quando o usuário passar pela linha de chegada
    
    return () => {
      // Limpar timer ao desmontar o componente
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionActive.current) return;
    
    const watchId = Geolocation.watchPosition(
      (position) => {
        if (!sessionActive.current) return;
        
        const newLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy ?? undefined,
          altitude: position.coords.altitude ?? undefined,
          lapNumber: firstCrossing ? lapCount : -1, // -1 indica antes da primeira passagem pela linha
        };
        const now = newLocation.timestamp;
        if (!lastSavedTimestamp || now - lastSavedTimestamp >= 100) {
          const round6 = (num: number) => Math.round(num * 1e6) / 1e6;
          setCurrentLocation(newLocation);
          
          // Adicionar à sessão geral
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
          
          // Se já iniciou as voltas, adicionar à volta atual
          if (firstCrossing) {
            setCurrentLapTrack(prev => {
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
          } else {
            // Armazenar pontos antes da primeira passagem pela linha
            preStartTrack.current.push(newLocation);
          }
          
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
          
          // Verificar distância até a linha de chegada
          if (finishLine && currentLocation) {
            const distance = calculateHaversineDistance(currentLocation, finishLine);
            setDistanceToFinish(distance);
            
            // Verificar se chegou à linha de chegada (dentro de 4 metros)
            if (distance < 4 ) {
              if (canCrossFinishLine) {
                const now = Date.now();
                
                if (!firstCrossing) {
                  // Primeira passagem pela linha de chegada - iniciar primeira volta
                  setFirstCrossing(true);
                  setFinishReached(true);
                  setCurrentLapStartTime(now);
                  setCurrentLapTime(0);
                  setLapCount(1); // Começar na volta 1
                  
                  // Adicionar os pontos coletados antes da linha como parte da volta 1
                  setCurrentLapTrack(preStartTrack.current);
                } else if (currentLapStartTime) {
                  // Completou uma volta
                  const lapDuration = now - currentLapStartTime;
                  
                  // Adicionar volta à lista com suas coordenadas
                  const newLap: LapData = {
                    lapNumber: lapCount,
                    startTime: currentLapStartTime,
                    endTime: now,
                    duration: lapDuration,
                    track: [...currentLapTrack], // Copiar as coordenadas desta volta
                    isDecelerationLap: false // Não é uma volta de desaceleração
                  };
                  
                  setLaps(prevLaps => [...prevLaps, newLap]);
                  setLastLapTime(lapDuration);
                  setLapCount(prevLapCount => prevLapCount + 1);
                  
                  // Iniciar nova volta
                  setCurrentLapStartTime(now);
                  setCurrentLapTime(0);
                  setCurrentLapTrack([]); // Limpar as coordenadas para a nova volta
                  
                  // Salvar dados parciais da sessão
                  saveSessionData({
                    laps: [...laps, newLap],
                    lapCount: lapCount + 1,
                    track: session
                  });
                }
                
                // Evitar múltiplas detecções da linha de chegada
                setCanCrossFinishLine(false);
                
                // Permitir nova detecção após se afastar da linha de chegada
                setTimeout(() => {
                  if (sessionActive.current) {
                    setCanCrossFinishLine(true);
                  }
                }, 10000); // 10 segundos de cooldown
              }
            } else if (distance > 50) {
              // Quando se afastar da linha de chegada, permitir nova detecção
              setCanCrossFinishLine(true);
            }
          }
          
          setLastSavedTimestamp(now);
        }
      },
      (error) => console.log(error),
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: 100,
        fastestInterval: 100,
      }
    );
    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, [lastLocation, finishLine, currentLocation, finishReached, canCrossFinishLine, lapCount, currentLapStartTime, sessionActive.current, firstCrossing]);

  // Salvar dados da sessão parcialmente
  const saveSessionData = async (data: any) => {
    try {
      // Calcular a volta mais rápida excluindo voltas de desaceleração
      const fastestLap = data.laps && data.laps.length > 0
        ? data.laps
            .filter((lap: LapData) => !lap.isDecelerationLap)
            .reduce((fastest: LapData | null, lap: LapData) => 
              fastest === null || lap.duration < fastest.duration ? lap : fastest, 
              null as LapData | null)
        : null;
      
      await AsyncStorage.setItem('currentSession', JSON.stringify({
        ...data,
        fastestLap
      }));
    } catch (e) {
      console.log('Erro ao salvar dados parciais da sessão:', e);
    }
  };

  const handleStop = async () => {
    // Marcar a sessão como inativa
    sessionActive.current = false;
    
    // Parar o timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Finalizar a volta atual se houver
    let finalLaps = [...laps];
    
    // Para debug: Ver quantas voltas existem antes de marcar como desaceleração
    console.log(`Total de voltas antes da marcação: ${finalLaps.length}`);
    finalLaps.forEach((lap: LapData, index: number) => {
      console.log(`Volta ${lap.lapNumber}: ${lap.isDecelerationLap ? 'Desaceleração' : 'Normal'}`);
    });
    
    // Não vamos marcar a penúltima volta como desaceleração
    // Apenas a última volta em andamento será marcada como desaceleração
    
    // Adicionar a volta atual em andamento como uma volta de desaceleração
    if (currentLapStartTime && currentLapTrack.length > 0 && firstCrossing) {
      const now = Date.now();
      const lapDuration = now - currentLapStartTime;
      
      const finalLap: LapData = {
        lapNumber: lapCount,
        startTime: currentLapStartTime,
        endTime: now,
        duration: lapDuration,
        track: currentLapTrack,
        isDecelerationLap: true // Apenas esta volta é marcada como desaceleração
      };
      
      finalLaps.push(finalLap);
    }
    
    // Para debug: Ver quantas voltas têm agora
    console.log(`Total de voltas após marcação: ${finalLaps.length}`);
    finalLaps.forEach((lap: LapData, index: number) => {
      console.log(`Volta ${lap.lapNumber}: ${lap.isDecelerationLap ? 'Desaceleração' : 'Normal'}`);
    });
    
    // Salva a sessão localmente
    const sessionData = {
      id: Date.now(),
      date: new Date().toISOString(),
      track: session,
      finishLine: finishLine,
      finishReached: finishReached,
      laps: finalLaps,
      lapCount: finalLaps.length,
      // Calcular a volta mais rápida excluindo as voltas de desaceleração
      fastestLap: finalLaps.length > 0 
        ? finalLaps
            .filter((lap: LapData) => !lap.isDecelerationLap)
            .reduce((fastest: LapData | null, lap: LapData) => 
              fastest === null || lap.duration < fastest.duration ? lap : fastest, 
              null as LapData | null)
        : null
    };
    
    try {
      const prev = await AsyncStorage.getItem('sessions');
      const sessions = prev ? JSON.parse(prev) : [];
      sessions.push(sessionData);
      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));
      
      // Limpar dados da sessão atual
      await AsyncStorage.removeItem('currentSession');
    } catch (e) {
      console.log('Erro ao salvar sessão:', e);
    }
    
    navigation.navigate('Sessions');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Topo da tela - Informações GPS */}
        <View style={styles.topBar}>
          <View style={styles.gpsInfoItemLocation}>
            <Text style={styles.iconText}>●</Text>
            <View>
              <Text style={styles.gpsInfoLabel}>COORDENADAS</Text>
              <Text style={styles.gpsInfoText} numberOfLines={1} ellipsizeMode="tail">
                {currentLocation ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.gpsInfoSeparator} />
          
          <View style={styles.gpsInfoItem}>
            <Text style={styles.iconText}>↑</Text>
            <View>
              <Text style={styles.gpsInfoLabel}>ALTITUDE</Text>
              <Text style={styles.gpsInfoText}>
                {currentLocation && currentLocation.altitude !== undefined 
                  ? `${currentLocation.altitude.toFixed(1)} m` 
                  : 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.gpsInfoSeparator} />
          
          <View style={styles.gpsInfoItem}>
            <Text style={styles.iconText}>◎</Text>
            <View>
              <Text style={styles.gpsInfoLabel}>PRECISÃO</Text>
              <Text style={styles.gpsInfoText}>
                {currentLocation && currentLocation.accuracy !== undefined 
                  ? `${currentLocation.accuracy.toFixed(1)} m` 
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Conteúdo principal - Layout adaptativo para orientação */}
        <View style={[
          styles.mainContent,
          // Aplicar layout horizontal apenas em landscape
          isLandscape ? styles.mainContentLandscape : styles.mainContentPortrait
        ]}>
          {/* Seção de velocidade */}
          <View style={[
            styles.speedSection,
            isLandscape ? styles.leftSection : styles.topSection
          ]}>
            <View style={styles.speedContainer}>
              <Text style={styles.speedLabel}>VELOCIDADE</Text>
              <Text style={styles.speedText}>
                {Number.isFinite(currentSpeed) ? currentSpeed.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>
            
            {finishLine && distanceToFinish !== null && (
              <View style={styles.finishLineInfo}>
                <Text style={[
                  styles.distanceText,
                  finishReached ? styles.finishReachedText : {}
                ]}>
                  {!firstCrossing 
                    ? `${distanceToFinish.toFixed(0)} m até a linha` 
                    : `${distanceToFinish.toFixed(0)} m até completar`}
                </Text>
                {!firstCrossing && (
                  <Text style={styles.instructionText}>
                    Cruze a linha para iniciar
                  </Text>
                )}
              </View>
            )}
          </View>
          
          {/* Seção de informações de voltas */}
          <View style={[
            styles.lapSection,
            isLandscape ? styles.rightSection : styles.bottomSection
          ]}>
            {firstCrossing ? (
              <View style={styles.lapsContainer}>
                <View style={styles.lapHeader}>
                  <Text style={styles.lapCountText}>VOLTA {lapCount}</Text>
                  <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                    <Text style={styles.stopButtonText}>PARAR</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.lapTimesContainer}>
                  {/* Tempo da volta atual - maior e mais destaque */}
                  <View style={styles.currentLapTimeContainer}>
                    <Text style={styles.currentLapTimeLabel}>TEMPO ATUAL</Text>
                    <Text style={styles.currentLapTimeValue}>
                      {formatLapTime(currentLapTime)}
                    </Text>
                  </View>
                  
                  {/* Última volta - menor */}
                  {lastLapTime !== null && (
                    <View style={styles.lastLapTimeContainer}>
                      <Text style={styles.lastLapTimeLabel}>ÚLTIMA VOLTA</Text>
                      <Text style={styles.lastLapTimeValue}>
                        {formatLapTime(lastLapTime)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.notStartedContainer}>
                <Text style={styles.notStartedText}>
                  Aguardando passagem pela linha de chegada para iniciar
                </Text>
                <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                  <Text style={styles.stopButtonText}>CANCELAR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    paddingTop: 10, // Reduzido já que agora estamos usando SafeAreaView
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    marginBottom: 10,
    zIndex: 10,
  },
  gpsInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gpsInfoItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  gpsInfoSeparator: {
    width: 1,
    height: '100%',
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  iconText: {
    fontSize: 18,
    marginRight: 6,
    color: '#F47820',
    fontWeight: 'bold',
  },
  gpsInfoLabel: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  gpsInfoText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
  },
  mainContentLandscape: {
    flexDirection: 'row',
  },
  mainContentPortrait: {
    flexDirection: 'column',
  },
  speedSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftSection: {
    width: '35%',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  topSection: {
    height: '35%',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  lapSection: {
    justifyContent: 'center',
  },
  rightSection: {
    width: '65%',
    paddingLeft: 10,
  },
  bottomSection: {
    height: '65%',
    paddingTop: 10,
  },
  speedContainer: {
    alignItems: 'center',
  },
  speedLabel: {
    color: '#aaa',
    fontSize: 14,
    letterSpacing: 1,
  },
  speedText: {
    fontSize: 60,
    color: '#fff',
    fontWeight: 'bold',
  },
  speedUnit: {
    color: '#aaa',
    fontSize: 16,
    marginTop: -5,
  },
  finishLineInfo: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    width: '90%',
  },
  distanceText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  finishReachedText: {
    color: '#4CAF50',
  },
  instructionText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    fontStyle: 'italic',
  },
  lapsContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  lapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  lapCountText: {
    fontSize: 24,
    color: '#F47820',
    fontWeight: 'bold',
  },
  lapTimesContainer: {
    width: '100%',
  },
  currentLapTimeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  currentLapTimeLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
    letterSpacing: 1,
  },
  currentLapTimeValue: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  lastLapTimeContainer: {
    alignItems: 'center',
  },
  lastLapTimeLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 5,
  },
  lastLapTimeValue: {
    fontSize: 28,
    color: '#F47820',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  notStartedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  notStartedText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#F47820',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default SpeedTrackingScreen; 