import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import { FontAwesome, MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';

const DashboardScreen = ({ navigation }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
    buttons: [],
  });

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
          onPress: () => {
            setAlertConfig({ ...alertConfig, visible: false });
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
          style: 'primary',
        },
      ],
    });
  };

  const handleButtonPress = (buttonName) => {
    console.log(`${buttonName} pressed`);
    if (buttonName === 'Manage Users') {
      navigation.navigate('AdminUsers');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <View style={styles.avatarCircle}>
            <FontAwesome name="user" size={48} color="#000000" />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeBackText}>Welcome Back</Text>
            <Text style={styles.adminText}>Admin</Text>
          </View>
        </View>

        {/* Logout Icon - pink/red door icon */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={45} color="#E91E63" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Large Green Card */}
        <TouchableOpacity
          style={styles.largeCard}
          onPress={() => handleButtonPress('Manage Users')}
          activeOpacity={0.8}
        >
          <View style={styles.largeCardTextContainer}>
            <Text style={styles.largeCardTitle}>Manage Users</Text>
            <Text style={styles.largeCardSubtitle}>{'{Total Number of Users}'}</Text>
          </View>
          <View style={styles.largeCardIcon}>
            <FontAwesome name="user" size={50} color="#000000" />
          </View>
        </TouchableOpacity>

        {/* Row of Two Small Cards */}
        <View style={styles.smallCardsRow}>
          {/* Customer Support */}
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => handleButtonPress('Customer Support')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="headset-mic" size={52} color="#000000" />
            <Text style={styles.smallCardTitle}>Customer Support</Text>
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => handleButtonPress('Settings')}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={50} color="#000000" />
            <Text style={styles.smallCardTitle}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Repeating White Manage Users Cards */}
        <TouchableOpacity
          style={styles.whiteCard}
          onPress={() => handleButtonPress('Manage Users')}
          activeOpacity={0.8}
        >
          <Text style={styles.whiteCardTitle}>Manage Users</Text>
          <Text style={styles.whiteCardSubtitle}>{'{Total Number of Users}'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whiteCard}
          onPress={() => handleButtonPress('Manage Users')}
          activeOpacity={0.8}
        >
          <Text style={styles.whiteCardTitle}>Manage Users</Text>
          <Text style={styles.whiteCardSubtitle}>{'{Total Number of Users}'}</Text>
        </TouchableOpacity>

        {/* Extra bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Very light gray as in target screenshot
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,    // Extra top padding to prevent overlap with status bar
    paddingBottom: 24,
    backgroundColor: '#FAFAFA',
  },

  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarCircle: {
    borderRadius: 34,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 25,
    marginLeft: 16,
  },

  welcomeTextContainer: {
    // no extra styling
  },

  welcomeBackText: {
    fontSize: 20,
    color: '#555555',
    fontWeight: '600',
  },

  adminText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000000',
  },

  logoutButton: {
    padding: 13,
    marginBottom: 7,
    marginRight: 8,
  },

  scrollContent: {
    flex: 1,
    paddingHorizontal: 30,
  },

  largeCard: {
    backgroundColor: '#a1e0f9ff', // Exact light lime green from target
    borderRadius: 30,
    paddingVertical: 48,
    paddingHorizontal: 28,
    marginBottom: 30,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },

  largeCardTextContainer: {
    flex: 1,
  },

  largeCardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },

  largeCardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },

  largeCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#a1e0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  smallCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 25,
  },

  smallCard: {
    flex: 1,
    backgroundColor: '#fcfbbcff',
    borderRadius: 24,
    paddingVertical: 43,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  smallCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
  },

  whiteCard: {
    backgroundColor: '#dbfbcaff',
    borderRadius: 24,
    paddingVertical: 58,
    paddingHorizontal: 28,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  whiteCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },

  whiteCardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
  },
});

export default DashboardScreen;