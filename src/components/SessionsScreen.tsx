import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  StatusBar, 
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SessionManager from './SessionManager';
import LinearGradient from 'react-native-linear-gradient';

interface Session {
  id: number;
  date: string;
  sessionName?: string;
  track: { latitude: number; longitude: number; timestamp: number }[];
  laps?: any[];
  fastestLap?: any;
}

const { width } = Dimensions.get('window');
const COLORS = {
  orange: '#F47820',
  black: '#231F20',
  darkGray: '#2a2a2a',
  lightGray: '#aaa',
  white: '#FFFFFF',
  red: '#F44336',
  green: '#4CAF50',
};

const SessionsScreen = ({ navigation }: any) => {
  const [sessions, setSessions] = useState<Session[]>([]);

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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchSessions);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(COLORS.black);
    
    return () => {
      StatusBar.setBarStyle('default');
    };
  }, []);

  const deleteSession = async (id: number) => {
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja apagar esta sessão?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Apagar", 
          onPress: async () => {
            try {
              const newSessions = sessions.filter(s => s.id !== id);
              setSessions(newSessions);
              await AsyncStorage.setItem('sessions', JSON.stringify(newSessions));
            } catch (e) {
              console.log('Erro ao apagar sessão:', e);
              Alert.alert("Erro", "Não foi possível apagar a sessão");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatLapTime = (timeMs: number): string => {
    if (!timeMs) return '--:--';
    
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = Math.floor((timeMs % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: Session }) => (
    <TouchableOpacity 
      style={styles.sessionCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('SessionDetail', { session: item })}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.sessionTitle}>
            {item.sessionName || `Sessão #${item.id}`}
          </Text>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => deleteSession(item.id)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <Text style={styles.timeText}>{formatTime(item.date)}</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.track?.length || 0}</Text>
            <Text style={styles.statLabel}>Pontos</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.laps?.length || 0}</Text>
            <Text style={styles.statLabel}>Voltas</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatLapTime(item.fastestLap?.duration || 0)}</Text>
            <Text style={styles.statLabel}>Melhor Volta</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>Toque para detalhes</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.black, '#2a2a2a', COLORS.black]}
        style={styles.background}
      />
      
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Sessões</Text>
        
        <SessionManager onSessionsUpdated={fetchSessions} />
        
        <FlatList
          data={sessions}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma sessão encontrada</Text>
              <Text style={styles.emptySubtext}>Inicie uma nova sessão para registrar seus dados de corrida</Text>
            </View>
          }
        />
      </View>
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
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  backButtonText: {
    color: COLORS.orange,
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
    letterSpacing: 1,
  },
  listContainer: {
    paddingBottom: 24,
  },
  sessionCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    color: COLORS.orange,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: COLORS.red,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  timeText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statLabel: {
    color: COLORS.lightGray,
    fontSize: 12,
    marginTop: 4,
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: 8,
  },
  viewDetailsText: {
    color: COLORS.lightGray,
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    padding: 20,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    color: COLORS.lightGray,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SessionsScreen; 