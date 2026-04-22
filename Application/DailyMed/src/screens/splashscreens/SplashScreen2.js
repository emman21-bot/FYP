import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const SplashScreen2 = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to next splash screen after 3 seconds
    const timer = setTimeout(() => {
      navigation.replace('SplashScreen3');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Medical App Icon with heartbeat */}
        <View style={styles.iconSection}>
          <View style={styles.heartContainer}>
            <View style={styles.heartBadge}>
              <Text style={styles.heartIcon}>💚</Text>
              <View style={styles.pulseRing1} />
              <View style={styles.pulseRing2} />
            </View>
          </View>
          
          <View style={styles.brandContainer}>
            <Text style={styles.medicalAppText}>Medical App</Text>
          </View>
        </View>

        {/* Illustration Area */}
        <View style={styles.illustrationContainer}>
          <View style={styles.doctorIllustration}>
            {/* Plant decoration */}
            <View style={styles.plantDecor}>
              <Text style={styles.plantIcon}>🌿</Text>
            </View>
            
            {/* Doctor figure */}
            <View style={styles.doctorFigure}>
              <View style={styles.doctorHead} />
              <View style={styles.doctorBody} />
              <Text style={styles.doctorEmoji}>👨‍⚕️</Text>
            </View>

            {/* Medical chart */}
            <View style={styles.chartDecor}>
              <Text style={styles.chartIcon}>📋</Text>
            </View>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Find your Doctor</Text>
          <Text style={styles.description}>
            Connect with healthcare professionals{'\n'}
            and get expert consultation
          </Text>
        </View>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          <View style={styles.dotActive} />
          <View style={styles.dot} />
        </View>

        <View style={styles.navigation}>
          <Text style={styles.skipText}>Skip</Text>
          <Text style={styles.nextText}>Next</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heartContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  heartBadge: {
    width: 70,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  heartIcon: {
    fontSize: 35,
  },
  pulseRing1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#4CAF50',
    opacity: 0.3,
  },
  pulseRing2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#4CAF50',
    opacity: 0.2,
  },
  brandContainer: {
    alignItems: 'center',
  },
  medicalAppText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
  illustrationContainer: {
    width: '100%',
    height: 280,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorIllustration: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  plantDecor: {
    position: 'absolute',
    left: 30,
    bottom: 40,
  },
  plantIcon: {
    fontSize: 40,
  },
  doctorFigure: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorEmoji: {
    fontSize: 80,
  },
  chartDecor: {
    position: 'absolute',
    right: 30,
    bottom: 40,
  },
  chartIcon: {
    fontSize: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7DD8',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#7A8FA3',
    textAlign: 'center',
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0E1F5',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7DD8',
    marginHorizontal: 4,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#B0BEC5',
    fontWeight: '500',
  },
  nextText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default SplashScreen2;
