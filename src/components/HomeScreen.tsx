import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';
import BRKLogo from './BRKLogo';

const { width, height } = Dimensions.get('window');

const COLORS = {
  orange: '#F47820',
  black: '#231F20',
  white: '#FFFFFF',
  lightGray: '#aaaaaa',
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.black, '#2a2a2a', COLORS.black]}
        style={styles.background}
      />

      {/* Content */}
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>BRK TELEMETRIA</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <BRKLogo width={200} height={70} color={COLORS.white} style={styles.logo} />
            <View style={styles.divider} />
            <Text style={styles.tagline}>Monitore. Analise. Domine.</Text>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => navigation.navigate('SessionSetup')}
            >
              <Text style={styles.startButtonText}>INICIAR NOVA SESSÃO</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sessionsButton}
              onPress={() => navigation.navigate('Sessions')}
            >
              <Text style={styles.sessionsButtonText}>VER SESSÕES ANTERIORES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  background: {
    position: 'absolute',
    width: width,
    height: height,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    marginBottom: 20,
  },
  divider: {
    width: 120,
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
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sessionsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sessionsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  }
});

export default HomeScreen; 