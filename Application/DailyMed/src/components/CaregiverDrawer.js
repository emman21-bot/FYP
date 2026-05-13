import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { authAPI } from '../services/api';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.80;

const CaregiverDrawer = ({ visible, onClose, navigation, currentScreen }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
    buttons: [],
  });

  const menuItems = [
    { title: 'Dashboard', screen: 'CaregiverDashboard', icon: '📊' },
    { title: 'Patients', screen: 'CaregiverPatients', icon: '👥' },
    { title: 'Alerts', screen: 'CaregiverAlerts', icon: '🔔' },
  ];

  const handleNavigate = (screen) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
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
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawer}>
            <View style={styles.header}>
              <View style={styles.logoHeartContainer}>
                <Text style={styles.logoHeart}>❤️‍🩹</Text>
              </View>
              <Text style={styles.appName}>DailyMed</Text>
              <Text style={styles.roleText}>Caregiver Portal</Text>
            </View>

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
                  <Text style={styles.menuIcon}>{item.icon}</Text>
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

            <View style={styles.bottomButtons}>
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
  logoHeartContainer: {
    marginBottom: 12,
  },
  logoHeart: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Montserrat-Bold',
  },
  roleText: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'Montserrat-Medium',
    marginTop: 4,
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
    fontSize: 24,
    marginRight: 20,
    color: '#666666',
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

export default CaregiverDrawer;
