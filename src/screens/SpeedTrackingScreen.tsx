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
  
  // Adicionar state para armazenar a melhor volta da sessão
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  
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
                  
                  // Adicione a verificação de melhor volta
                  if (bestLapTime === null || lapDuration < bestLapTime) {
                    setBestLapTime(lapDuration);
                  }
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

  // Atualizar a lógica para guardar a melhor volta quando uma volta é completada
  useEffect(() => {
    // Quando lastLapTime for atualizado, verificar se é a melhor volta
    if (lastLapTime === null) return;
    
    if (bestLapTime === null || lastLapTime < bestLapTime) {
      setBestLapTime(lastLapTime);
    }
  }, [lastLapTime]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Informações GPS compactas no topo */}
        <View style={styles.miniTopBar}>
          <View style={styles.gpsInfoRow}>
            <Text style={styles.miniIconText}>●</Text>
            <Text style={styles.miniInfoText} numberOfLines={1} ellipsizeMode="tail">
              {currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : 'N/A'}
            </Text>
            
            <Text style={styles.miniIconText}>↑</Text>
            <Text style={styles.miniInfoText}>
              {currentLocation?.altitude !== undefined ? `${currentLocation.altitude.toFixed(0)}m` : 'N/A'}
            </Text>
            
            <Text style={styles.miniIconText}>◎</Text>
            <Text style={styles.miniInfoText}>
              {currentLocation?.accuracy !== undefined ? `${currentLocation.accuracy.toFixed(0)}m` : 'N/A'}
            </Text>
          </View>
        </View>
        
        {/* Conteúdo principal adaptativo (landscape/portrait) */}
        <View style={[
          styles.mainContent,
          isLandscape ? styles.mainContentLandscape : styles.mainContentPortrait
        ]}>
          {firstCrossing ? (
            /* Quando a sessão está ativa com voltas */
            <>
              {/* Área da velocidade (esquerda/topo dependendo da orientação) */}
              <View style={[
                styles.speedSection,
                isLandscape ? styles.speedSectionLandscape : styles.speedSectionPortrait
              ]}>
                <View style={styles.speedContainer}>
                  <Text style={styles.speedLabel}>VELOCIDADE</Text>
                  <Text style={styles.speedValue}>
                    {Number.isFinite(currentSpeed) ? currentSpeed.toFixed(1) : '0.0'}
                  </Text>
                  <Text style={styles.speedUnit}>km/h</Text>
                </View>
                
                {/* Informação da distância */}
                {finishLine && distanceToFinish !== null && (
                  <View style={styles.distanceIndicator}>
                    <Text style={[
                      styles.distanceText,
                      distanceToFinish < 50 ? styles.distanceCloseText : {}
                    ]}>
                      {`${distanceToFinish.toFixed(0)}m`}
                    </Text>
                    <Text style={styles.distanceLabel}>ATÉ LINHA</Text>
                  </View>
                )}
                
                {/* Botão de parar */}
                <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                  <Text style={styles.stopButtonText}>PARAR</Text>
                </TouchableOpacity>
              </View>
              
              {/* Área de tempos de voltas (centro/principal) */}
              <View style={[
                styles.lapTimesSection,
                isLandscape ? styles.lapTimesSectionLandscape : styles.lapTimesSectionPortrait
              ]}>
                {/* Tempo da volta atual (mais importante, maior destaque) */}
                <View style={styles.currentLapContainer}>
                  <View style={styles.lapHeaderRow}>
                    <Text style={styles.lapCountText}>VOLTA {lapCount}</Text>
                    <Text style={styles.lapTypeLabel}>ATUAL</Text>
                  </View>
                  <Text style={styles.currentLapTimeValue}>
                    {formatLapTime(currentLapTime)}
                  </Text>
                </View>
                
                {/* Painel de voltas anteriores/melhores */}
                <View style={styles.lapHistoryContainer}>
                  {/* Última volta completada */}
                  {lastLapTime !== null && (
                    <View style={styles.lapHistoryItem}>
                      <Text style={styles.lapHistoryLabel}>ÚLTIMA VOLTA</Text>
                      <Text style={[
                        styles.lapHistoryValue,
                        bestLapTime === lastLapTime ? styles.bestLapValue : {}
                      ]}>
                        {formatLapTime(lastLapTime)}
                      </Text>
                    </View>
                  )}
                  
                  {/* Melhor volta da sessão */}
                  {bestLapTime !== null && (
                    <View style={styles.lapHistoryItem}>
                      <Text style={styles.lapHistoryLabel}>MELHOR VOLTA</Text>
                      <Text style={[styles.lapHistoryValue, styles.bestLapValue]}>
                        {formatLapTime(bestLapTime)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            /* Quando ainda não foi iniciada a primeira volta */
            <View style={styles.notStartedContainer}>
              <View style={styles.speedContainerCenter}>
                <Text style={styles.speedValue}>
                  {Number.isFinite(currentSpeed) ? currentSpeed.toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.speedUnit}>km/h</Text>
              </View>
              
              {finishLine && distanceToFinish !== null && (
                <View style={styles.waitingPrompt}>
                  <Text style={styles.waitingDistance}>
                    {`${distanceToFinish.toFixed(0)}m ATÉ A LINHA`}
                  </Text>
                  <Text style={styles.waitingInstructions}>
                    Cruze a linha de chegada para iniciar a sessão
                  </Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.stopButtonLarge} onPress={handleStop}>
                <Text style={styles.stopButtonText}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 8,
  },
  miniTopBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  gpsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniIconText: {
    fontSize: 12,
    color: '#F47820',
    marginHorizontal: 4,
  },
  miniInfoText: {
    color: '#ccc',
    fontSize: 10,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  
  // Layout principal
  mainContent: {
    flex: 1,
  },
  mainContentLandscape: {
    flexDirection: 'row',
  },
  mainContentPortrait: {
    flexDirection: 'column',
  },
  
  // Seção de velocidade
  speedSection: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 10,
  },
  speedSectionLandscape: {
    width: '25%',
    height: '100%',
    marginRight: 10,
  },
  speedSectionPortrait: {
    width: '100%',
    height: '25%',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedContainer: {
    alignItems: 'center',
  },
  speedContainerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  speedLabel: {
    color: '#aaa',
    fontSize: 12,
    letterSpacing: 1,
  },
  speedValue: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  speedUnit: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  distanceIndicator: {
    alignItems: 'center',
    marginVertical: 10,
  },
  distanceText: {
    fontSize: 22,
    color: '#2196F3',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  distanceCloseText: {
    color: '#4CAF50',
  },
  distanceLabel: {
    color: '#ccc',
    fontSize: 12,
    letterSpacing: 1,
  },
  
  // Seção de tempos de voltas (centro/principal)
  lapTimesSection: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'space-between',
  },
  lapTimesSectionLandscape: {
    height: '100%',
  },
  lapTimesSectionPortrait: {
    flex: 1,
  },
  
  // Volta atual
  currentLapContainer: {
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
  },
  lapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  lapCountText: {
    fontSize: 20,
    color: '#F47820',
    fontWeight: 'bold',
  },
  lapTypeLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  currentLapTimeValue: {
    fontSize: 60,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  
  // Histórico de voltas
  lapHistoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
  },
  lapHistoryItem: {
    alignItems: 'center',
    padding: 10,
    flex: 1,
  },
  lapHistoryLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  lapHistoryValue: {
    fontSize: 26,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  bestLapValue: {
    color: '#4CAF50',
  },
  
  // Tela antes de iniciar a primeira volta
  notStartedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingPrompt: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 15,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderRadius: 10,
    width: '100%',
  },
  waitingDistance: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  waitingInstructions: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Botões
  stopButton: {
    backgroundColor: '#F47820',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  stopButtonLarge: {
    backgroundColor: '#F47820',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default SpeedTrackingScreen; 