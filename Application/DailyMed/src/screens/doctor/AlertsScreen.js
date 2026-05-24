import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/theme';
import { Swipeable } from 'react-native-gesture-handler';
import CustomAlert from '../../components/CustomAlert';

const API_URL = 'http://192.168.10.6:5000/api';
import DoctorDrawer from '../../components/DoctorDrawer';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const AlertsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' instead of 'new'/'read'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      if (!loading) setLoading(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      const response = await axios.get(
        `${API_URL}/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setNotifications(response.data.data);
        const unread = response.data.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    // Prevent too frequent refreshes (minimum 3 seconds between requests)
    const now = Date.now();
    if (now - lastFetchTime < 3000) {
      console.log('Refresh throttled - please wait a moment');
      setRefreshing(false);
      return;
    }
    
    setLastFetchTime(now);
    setRefreshing(true);
    fetchNotifications();
  }, [lastFetchTime]);

  const markAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      await axios.patch(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update locally without refetching
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      await axios.delete(
        `${API_URL}/notifications/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Remove from local state immediately
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete notification',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_request':
        return { name: 'calendar-plus', color: '#2196F3' };
      case 'appointment_approved':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'appointment_declined':
        return { name: 'close-circle', color: '#F44336' };
      case 'appointment_rescheduled':
        return { name: 'calendar-clock', color: '#FF9800' };
      case 'appointment_cancelled':
        return { name: 'cancel', color: '#9E9E9E' };
      case 'appointment_completed':
        return { name: 'check-circle-outline', color: '#00BCD4' };
      case 'appointment_started':
        return { name: 'video', color: '#9C27B0' };
      default:
        return { name: 'bell', color: Colors.primary };
    }
  };

  const renderRightActions = (progress, dragX, item) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteNotification(item._id)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <MaterialCommunityIcons name="delete" size={28} color="#fff" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderNotificationItem = ({ item }) => {
    const iconData = getNotificationIcon(item.type);
    
    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            !item.isRead && styles.unreadCard
          ]}
          onPress={() => {
            if (!item.isRead) {
              markAsRead(item._id);
            }
            if (item.data?.appointmentId) {
              navigation.navigate('Appointments');
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor: iconData.color + '20' }]}>
              <MaterialCommunityIcons name={iconData.name} size={28} color={iconData.color} />
            </View>
            <View style={styles.notificationTextContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.notificationTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.notificationTime}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="bell-outline" 
        size={100} 
        color="#E0E0E0" 
      />
      <Text style={styles.emptyText}>
        No notifications yet
      </Text>
      <Text style={styles.emptySubtext}>
        You'll be notified here for important updates
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <DoctorDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="Alerts"
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
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Auto-refresh indicator */}
      {/* <View style={styles.autoRefreshBar}>
        <MaterialCommunityIcons name="refresh" size={14} color="#666" />
        <Text style={styles.autoRefreshText}>Auto-refreshing every 4 seconds</Text>
      </View> */}

      {/* Swipe instruction */}
      {notifications.length > 0 && (
        <View style={styles.swipeHint}>
          <MaterialCommunityIcons name="gesture-swipe-left" size={16} color="#999" />
          <Text style={styles.swipeHintText}>Swipe left to delete</Text>
        </View>
      )}

      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  autoRefreshBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#FFF9C4',
    gap: 6,
  },
  autoRefreshText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#E3F2FD',
    gap: 8,
  },
  swipeHintText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  scrollContent: {
    padding: 12,
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  unreadCard: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.primary,
    elevation: 3,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  deleteAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
});

export default AlertsScreen;
