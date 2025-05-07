import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const SessionDetailScreen = ({ route, navigation }: any) => {
  const { session } = route.params;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'< Voltar'}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Detalhes da Sessão #{session.id}</Text>
      <Text style={styles.subtitle}>Data: {new Date(session.date).toLocaleString()}</Text>
      <Text style={styles.subtitle}>Pontos: {session.track.length}</Text>
      <FlatList
        data={session.track}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.coordItem}>
            <Text style={styles.coordText}>
              #{index + 1} - Lat: {item.latitude.toFixed(6)}, Lng: {item.longitude.toFixed(6)}
            </Text>
            <Text style={styles.timeText}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum ponto registrado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231F20',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: '#F47820',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F47820',
    marginBottom: 12,
    marginTop: 40,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  coordItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  coordText: {
    color: '#fff',
    fontSize: 15,
  },
  timeText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.5,
    marginTop: 40,
    textAlign: 'center',
  },
});

export default SessionDetailScreen; 