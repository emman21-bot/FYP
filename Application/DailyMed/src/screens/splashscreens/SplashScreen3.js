import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const SplashScreen3 = ({ navigation }) => {
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
  }, []);

  const handleGetStarted = () => {
    navigation.replace('Login');
  };

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
          <View style={styles.recordsIllustration}>
            {/* Document icon with person */}
            <View style={styles.personWithDocument}>
              <Text style={styles.personEmoji}>👩‍💼</Text>
              
              {/* Floating documents */}
              <View style={styles.documentFloat1}>
                <View style={styles.documentIcon}>
                  <Text style={styles.docEmoji}>📄</Text>
                </View>
              </View>
              
              <View style={styles.documentFloat2}>
                <View style={styles.documentIcon}>
                  <Text style={styles.docEmoji}>📋</Text>
                </View>
              </View>

              <View style={styles.documentFloat3}>
                <View style={styles.documentIcon}>
                  <Text style={styles.docEmoji}>📝</Text>
                </View>
              </View>

              {/* Mobile device mockup */}
              <View style={styles.mobileDevice}>
                <View style={styles.deviceScreen}>
                  <View style={styles.healthIcon}>
                    <Text style={styles.healthSymbol}>❤️</Text>
                  </View>
                  <View style={styles.recordLines}>
                    <View style={styles.recordLine} />
                    <View style={styles.recordLine} />
                    <View style={styles.recordLine} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Storage your{'\n'}Medical Records</Text>
          <Text style={styles.description}>
            Securely store and access your health{'\n'}
            records anytime, anywhere
          </Text>
        </View>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          <View style={styles.dot} />
          <View style={styles.dotActive} />
        </View>

        <View style={styles.navigation}>
          <TouchableOpacity onPress={handleGetStarted}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGetStarted}>
            <Text style={styles.nextText}>Get Started</Text>
          </TouchableOpacity>
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
  recordsIllustration: {
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
  personWithDocument: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  personEmoji: {
    fontSize: 70,
    marginBottom: 20,
  },
  documentFloat1: {
    position: 'absolute',
    top: 40,
    left: 30,
  },
  documentFloat2: {
    position: 'absolute',
    top: 50,
    right: 30,
  },
  documentFloat3: {
    position: 'absolute',
    top: 120,
    left: 40,
  },
  documentIcon: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  docEmoji: {
    fontSize: 24,
  },
  mobileDevice: {
    position: 'absolute',
    bottom: 30,
    width: 120,
    height: 160,
    backgroundColor: '#2E7DD8',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  deviceScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  healthIcon: {
    marginBottom: 8,
  },
  healthSymbol: {
    fontSize: 28,
  },
  recordLines: {
    width: '100%',
    marginTop: 10,
  },
  recordLine: {
    height: 6,
    backgroundColor: '#E0F0FF',
    borderRadius: 3,
    marginVertical: 4,
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
    textAlign: 'center',
    lineHeight: 36,
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

export default SplashScreen3;
