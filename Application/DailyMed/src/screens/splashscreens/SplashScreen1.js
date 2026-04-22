import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const SplashScreen1 = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.3);

  useEffect(() => {
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to next splash screen after 3 seconds
    const timer = setTimeout(() => {
      navigation.replace('SplashScreen2');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Heart with ECG line icon */}
        <View style={styles.iconContainer}>
          <View style={styles.heartIcon}>
            <Text style={styles.heartSymbol}>❤️</Text>
            <View style={styles.ecgLine}>
              <View style={styles.ecgPulse} />
            </View>
          </View>
        </View>
        
        <Text style={styles.appName}>DailyMed</Text>
        <Text style={styles.tagline}>Your Health Companion</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7DD8', // Professional blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  heartIcon: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heartSymbol: {
    fontSize: 50,
    color: '#2E7DD8',
  },
  ecgLine: {
    position: 'absolute',
    width: 60,
    height: 2,
    backgroundColor: '#2E7DD8',
    top: '50%',
  },
  ecgPulse: {
    width: 20,
    height: 10,
    backgroundColor: '#2E7DD8',
    position: 'absolute',
    left: 20,
    top: -4,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#E0F0FF',
    marginTop: 8,
    letterSpacing: 0.5,
  },
});

export default SplashScreen1;
