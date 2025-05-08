import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';

interface SessionManagerProps {
  onSessionsUpdated: () => void;
}

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
      const importedSessions = JSON.parse(fileContent);

      // Validar o formato dos dados importados
      if (!Array.isArray(importedSessions)) {
        throw new Error('Formato de arquivo inválido');
      }

      // Mesclar com sessões existentes
      const existingSessions = await AsyncStorage.getItem('sessions');
      const currentSessions = existingSessions ? JSON.parse(existingSessions) : [];
      
      // Criar um mapa de IDs para evitar duplicatas
      const sessionMap = new Map();
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
      <TouchableOpacity style={styles.button} onPress={exportSessions}>
        <Text style={styles.buttonText}>Exportar Sessões</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={importSessions}>
        <Text style={styles.buttonText}>Importar Sessões</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#F47820',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SessionManager; 