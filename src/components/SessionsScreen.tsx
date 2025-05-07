import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Session {
  id: number;
  date: string;
  track: { latitude: number; longitude: number; timestamp: number }[];
}

const SessionsScreen = ({ navigation }: any) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await AsyncStorage.getItem('sessions');
        if (data) {
          setSessions(JSON.parse(data));
        }
      } catch (e) {
        console.log('Erro ao carregar sessões:', e);
      }
    };
    const unsubscribe = navigation.addListener('focus', fetchSessions);
    return unsubscribe;
  }, [navigation]);

  const deleteSession = async (id: number) => {
    try {
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      await AsyncStorage.setItem('sessions', JSON.stringify(newSessions));
    } catch (e) {
      console.log('Erro ao apagar sessão:', e);
    }
  };

  const renderItem = ({ item }: { item: Session }) => (
    <TouchableOpacity onPress={() => navigation.navigate('SessionDetail', { session: item })}>
      <View style={styles.sessionItem}>
        <Text style={styles.sessionTitle}>Sessão #{item.id}</Text>
        <Text style={styles.sessionDate}>{new Date(item.date).toLocaleString()}</Text>
        <Text style={styles.sessionPoints}>Pontos: {item.track.length}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteSession(item.id)}>
          <Text style={styles.deleteButtonText}>Apagar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backButtonText}>{'< Voltar'}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Sessões</Text>
      <Text style={styles.subtitle}>Aqui você verá o histórico e detalhes das suas sessões.</Text>
      <FlatList
        data={sessions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma sessão salva.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231F20',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: '#F47820',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F47820',
    marginBottom: 16,
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
  },
  sessionItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: 320,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionTitle: {
    color: '#F47820',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionDate: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  sessionPoints: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.5,
    marginTop: 40,
    textAlign: 'center',
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default SessionsScreen; 