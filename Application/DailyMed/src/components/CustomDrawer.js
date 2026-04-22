import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { authAPI } from '../services/api'; // Adjust path if needed
import CustomAlert from '../components/CustomAlert'; // Adjust path based on your structure

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.80;

const CustomDrawer = ({ visible, onClose, navigation, currentScreen }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
    buttons: [],
  });

  const menuItems = [
    { title: 'Dashboard', screen: 'Dashboard', icon: 'grid-outline' },
    { title: 'AI Predictions', screen: 'AIPredictions', icon: 'hardware-chip-outline' },
    { title: 'Health Data', screen: 'HealthData', icon: 'stats-chart-outline' },
    { title: 'Reports', screen: 'Reports', icon: 'document-text-outline' },
    { title: 'Appointments', screen: 'Appointments', icon: 'calendar-outline' },
    { title: 'Medications', screen: 'Medications', icon: 'medical-outline' },
    // { title: 'Find a Doctor', screen: 'FindDoctor', icon: 'person-search-outline' },
    { title: 'My Doctor', screen: 'MyDoctor', icon: 'medkit-outline' },
  ];

  const handleNavigate = (screen) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 300);
  };

  const handleSettings = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate('Settings');
    }, 300);
  };

  const handleLogout = () => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
          style: 'secondary',
        },
        {
          text: 'Logout',
          onPress: async () => {
            setAlertConfig({ ...alertConfig, visible: false });
            try {
              await authAPI.logout();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              // Always redirect to login even if API fails
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
          style: 'primary',
        },
      ],
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Drawer */}
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../images/dailymedlogo.jpg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>DailyMed</Text>
              <Text style={styles.roleText}>Patient Portal</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  style={[
                    styles.menuItem,
                    currentScreen === item.screen && styles.menuItemActive,
                  ]}
                  onPress={() => handleNavigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={item.icon} 
                    size={24} 
                    color="#007AFF"
                    style={styles.menuIcon}
                  />
                  <Text
                    style={[
                      styles.menuText,
                      currentScreen === item.screen && styles.menuTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bottom Buttons Section */}
            <View style={styles.bottomButtons}>
              {/* Settings Button */}
              <TouchableOpacity
                style={styles.settingsFullButton}
                onPress={handleSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.settingsFullButtonText}>Settings</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutFullButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutFullButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Custom Alert for Logout Confirmation */}
        <CustomAlert
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    backgroundColor: Colors.white || '#ffffff',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: Colors.white || '#ffffff',
    paddingTop: StatusBar.currentHeight || 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Montserrat-Bold',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuItemActive: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginHorizontal: 12,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Montserrat-Medium',
  },
  menuTextActive: {
    color: '#007AFF',
    fontFamily: 'Montserrat-SemiBold',
  },
  bottomButtons: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  settingsFullButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#95c4f5ff',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'Montserrat-Medium',
    marginTop: 4,
  },
  settingsFullButtonText: {
    fontSize: 17,
    color: '#000000',
    fontFamily: 'Montserrat-SemiBold',
  },
  logoutFullButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutFullButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: 'Montserrat-Bold',
  },
});

export default CustomDrawer;