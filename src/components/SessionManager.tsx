import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';

interface SessionManagerProps {
  onSessionsUpdated: () => void;
}

interface Location {
  latitude: number;
  longitude: number;
  timestamp?: number;
  accuracy?: number;
  altitude?: number;
}

interface LapData {
  lapNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  track: Location[];
  isDecelerationLap?: boolean;
}

interface SessionData {
  id: number;
  date: string;
  sessionName?: string;
  finishLine?: {
    latitude: number;
    longitude: number;
  };
  laps?: LapData[];
  fastestLap?: LapData | null;
  track?: Location[];
}

const COLORS = {
  orange: '#F47820',
  black: '#231F20', 
  white: '#FFFFFF',
  darkGray: '#2a2a2a',
};

const SessionManager: React.FC<SessionManagerProps> = ({ onSessionsUpdated }) => {
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Permissão de Armazenamento',
            message: 'O aplicativo precisa de permissão para salvar arquivos.',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        console.log('Permissão de armazenamento:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Erro ao solicitar permissão:', err);
        return false;
      }
    }
    return true;
  };

  const exportSessions = async () => {
    try {
      console.log('Iniciando exportação...');
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Erro', 'Permissão de armazenamento negada');
        return;
      }

      const sessions = await AsyncStorage.getItem('sessions');
      if (!sessions) {
        Alert.alert('Aviso', 'Nenhuma sessão para exportar');
        return;
      }

      console.log('Sessões encontradas:', sessions);

      // Criar um nome de arquivo amigável
      const date = new Date();
      const fileName = `brk_telemetria_sessions_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.json`;

      // Preparar os dados para compartilhamento
      const shareOptions = {
        title: 'Exportar Sessões',
        message: 'Arquivo de sessões do BRK Telemetria',
        url: `data:application/json;base64,${Buffer.from(sessions).toString('base64')}`,
        type: 'application/json',
        filename: fileName,
        saveToFiles: true,
      };

      console.log('Compartilhando arquivo...');
      await Share.open(shareOptions);
      console.log('Arquivo compartilhado com sucesso');
    } catch (error: any) {
      console.error('Erro detalhado ao exportar sessões:', error);
      
      // Criar uma mensagem de erro detalhada
      const errorMessage = `
Erro: ${error.message || 'Erro desconhecido'}
Stack: ${error.stack || 'Sem stack trace'}
Code: ${error.code || 'Sem código de erro'}
Name: ${error.name || 'Sem nome de erro'}
      `.trim();

      Alert.alert(
        'Erro ao Exportar',
        errorMessage,
        [
          {
            text: 'OK',
            style: 'default',
          },
          {
            text: 'Copiar Erro',
            onPress: () => {
              // Aqui você pode adicionar a lógica para copiar o erro para a área de transferência
              console.log('Erro copiado:', errorMessage);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const importSessions = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.json],
      });

      console.log('Arquivo selecionado:', result[0]);

      const fileContent = await RNFS.readFile(result[0].uri, 'utf8');
      const importedSessions = JSON.parse(fileContent) as SessionData[];

      // Validar o formato dos dados importados
      if (!Array.isArray(importedSessions)) {
        throw new Error('Formato de arquivo inválido');
      }

      // Validar a estrutura dos dados de cada sessão
      importedSessions.forEach((session, index) => {
        if (!session.id) {
          throw new Error(`Sessão ${index + 1} inválida: ID ausente`);
        }
        if (!session.date) {
          throw new Error(`Sessão ${index + 1} inválida: Data ausente`);
        }
        
        // Verificar a presença da linha de chegada
        if (!session.finishLine || typeof session.finishLine.latitude !== 'number' || typeof session.finishLine.longitude !== 'number') {
          console.warn(`Sessão ${index + 1} (${session.id}): Linha de chegada inválida ou ausente`);
          // Definir uma linha de chegada padrão se não existir
          session.finishLine = session.finishLine || { latitude: 0, longitude: 0 };
        }
        
        // Verificar nome da sessão
        if (!session.sessionName) {
          console.warn(`Sessão ${index + 1} (${session.id}): Nome da sessão ausente`);
          // Adicionar um nome padrão baseado na data
          const sessionDate = new Date(session.date);
          session.sessionName = `Sessão ${sessionDate.toLocaleDateString()} ${sessionDate.toLocaleTimeString()}`;
        }
        
        // Validar estrutura de voltas
        if (Array.isArray(session.laps)) {
          session.laps.forEach((lap: LapData, lapIndex: number) => {
            // Garantir que o número da volta seja sequencial
            lap.lapNumber = lapIndex + 1;
            
            // Garantir que a propriedade isDecelerationLap exista
            if (lap.isDecelerationLap === undefined) {
              lap.isDecelerationLap = false;
            }
            
            // Verificar dados de trajeto das voltas
            if (!Array.isArray(lap.track)) {
              lap.track = [];
            }
          });
        } else {
          session.laps = [];
        }
        
        // Garantir que a volta mais rápida está corretamente calculada
        if (session.laps && session.laps.length > 0) {
          session.fastestLap = session.laps
            .filter((lap: LapData) => !lap.isDecelerationLap)
            .reduce((fastest: LapData | null, lap: LapData) => 
              fastest === null || lap.duration < fastest.duration ? lap : fastest, 
              null);
        } else {
          session.fastestLap = null;
        }
      });

      // Mesclar com sessões existentes
      const existingSessions = await AsyncStorage.getItem('sessions');
      const currentSessions = existingSessions ? JSON.parse(existingSessions) as SessionData[] : [];
      
      // Criar um mapa de IDs para evitar duplicatas
      const sessionMap = new Map<number, SessionData>();
      [...currentSessions, ...importedSessions].forEach(session => {
        sessionMap.set(session.id, session);
      });

      // Converter o mapa de volta para array
      const mergedSessions = Array.from(sessionMap.values());

      await AsyncStorage.setItem('sessions', JSON.stringify(mergedSessions));
      onSessionsUpdated();
      Alert.alert('Sucesso', 'Sessões importadas com sucesso');
    } catch (error: any) {
      if (DocumentPicker.isCancel(error)) {
        console.log('Importação cancelada pelo usuário');
      } else {
        console.error('Erro ao importar sessões:', error);
        
        // Criar uma mensagem de erro detalhada
        const errorMessage = `
Erro: ${error.message || 'Erro desconhecido'}
Stack: ${error.stack || 'Sem stack trace'}
Code: ${error.code || 'Sem código de erro'}
Name: ${error.name || 'Sem nome de erro'}
        `.trim();

        Alert.alert(
          'Erro ao Importar',
          errorMessage,
          [
            {
              text: 'OK',
              style: 'default',
            },
            {
              text: 'Copiar Erro',
              onPress: () => {
                // Aqui você pode adicionar a lógica para copiar o erro para a área de transferência
                console.log('Erro copiado:', errorMessage);
              },
            },
          ],
          { cancelable: true }
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, styles.exportButton]} 
        onPress={exportSessions}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Exportar</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.importButton]} 
        onPress={importSessions}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Importar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 6,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  exportButton: {
    backgroundColor: COLORS.orange,
  },
  importButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.orange,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default SessionManager; 