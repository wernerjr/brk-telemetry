import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import BRKLogo from './BRKLogo';

const { width, height } = Dimensions.get('window');

const COLORS = {
  orange: '#F47820',
  black: '#231F20',
  white: '#FFFFFF',
};

const HomeScreen = ({ navigation }: any) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.black, '#2a2a2a', COLORS.black]}
        style={styles.background}
      />

      {/* Content */}
      <View style={styles.content}>
        <BRKLogo width={180} height={60} color={COLORS.white} style={styles.logo} />
        <Text style={styles.subtitle}>TELEMETRIA</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Monitore. Analise. Domine.</Text>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => navigation.navigate('SessionSetup')}
        >
          <Text style={styles.startButtonText}>Iniciar Nova Sessão</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navigation}>
        <View style={styles.navItem}>
          <Text style={styles.navText}>PAINEL</Text>
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Sessions')}>
          <Text style={styles.navText}>SESSÕES</Text>
        </TouchableOpacity>
        <View style={styles.navItem}>
          <Text style={styles.navText}>CONFIGURAÇÕES</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  background: {
    position: 'absolute',
    width: width,
    height: height,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 8,
    marginTop: -5,
  },
  divider: {
    width: 100,
    height: 2,
    backgroundColor: COLORS.orange,
    marginVertical: 20,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.white,
    letterSpacing: 2,
    opacity: 0.8,
  },
  startButton: {
    marginTop: 30,
    backgroundColor: COLORS.orange,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 30,
    backgroundColor: 'rgba(35, 31, 32, 0.95)',
  },
  navItem: {
    paddingVertical: 15,
  },
  navText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
});

export default HomeScreen; 