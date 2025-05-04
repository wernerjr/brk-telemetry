import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const COLORS = {
  orange: '#F47820',
  black: '#231F20',
  white: '#FFFFFF',
};

const HomeScreen = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
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

      {/* Speed Circle */}
      <View style={styles.speedCircleContainer}>
        <BlurView
          style={styles.speedCircle}
          blurType="dark"
          blurAmount={20}
        />
        <View style={styles.speedCircleInner} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>BRK</Text>
        <Text style={styles.subtitle}>TELEMETRIA</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Monitore. Analise. Domine.</Text>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navigation}>
        <View style={styles.navItem}>
          <Text style={styles.navText}>PAINEL</Text>
        </View>
        <View style={styles.navItem}>
          <Text style={styles.navText}>SESSÕES</Text>
        </View>
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
  speedCircleContainer: {
    position: 'absolute',
    top: height * 0.2,
    left: width * 0.5 - 150,
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  speedCircleInner: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  title: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 5,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 8,
    marginTop: -10,
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