import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import CaregiverDrawer from '../../components/CaregiverDrawer';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const DashboardScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <CaregiverDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="CaregiverDashboard"
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="menu" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Care overview and updates</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="view-dashboard-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Dashboard Coming Soon</Text>
          <Text style={styles.emptySubtext}>Care statistics and insights will appear here</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.background,
    marginTop: StatusBar.currentHeight || 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 8,
  },
});

export default DashboardScreen;