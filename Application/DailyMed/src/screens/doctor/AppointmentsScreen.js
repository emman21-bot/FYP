import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/theme';
import CustomAlert from '../../components/CustomAlert';
import DoctorDrawer from '../../components/DoctorDrawer';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = 'http://192.168.1.4:5000/api';

const AppointmentsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, history
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const hasInitialized = useRef(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });

  useFocusEffect(
    useCallback(() => {
      // Only fetch on first focus
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        fetchAppointments();
      }
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      if (!token) {
        console.log('No token found');
        return;
      }

      const response = await axios.get(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    // Prevent too frequent refreshes (minimum 3 seconds between requests)
    const now = Date.now();
    if (now - lastFetchTime < 3000) {
      console.log('Refresh throttled - please wait a moment');
      setRefreshing(false);
      return;
    }
    
    setLastFetchTime(now);
    setRefreshing(true);
    fetchAppointments();
  };

  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      const endpoint = status === 'approved' 
        ? `${API_URL}/appointments/${appointmentId}/approve`
        : `${API_URL}/appointments/${appointmentId}/decline`;
      
      const response = await axios.patch(
        endpoint,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: `Appointment ${status} successfully`,
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update appointment',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const openRescheduleModal = (appointment) => {
    setSelectedAppointment(appointment);
    setNewDate(new Date(appointment.appointmentDate));
    setNewStartTime(appointment.timeSlot.startTime);
    setNewEndTime(appointment.timeSlot.endTime);
    setShowRescheduleModal(true);
  };

  const handleReschedule = async () => {
    if (!newStartTime || !newEndTime) {
      setAlertConfig({
        type: 'warning',
        title: 'Required',
        message: 'Please select start and end time',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }

    try {
      setRescheduling(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const response = await axios.patch(
        `${API_URL}/appointments/${selectedAppointment._id}/reschedule`,
        {
          newDate: formattedDate,
          newTimeSlot: {
            startTime: newStartTime,
            endTime: newEndTime
          },
          reason: rescheduleReason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: 'Appointment rescheduled successfully',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        setShowRescheduleModal(false);
        setRescheduleReason('');
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to reschedule appointment',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setRescheduling(false);
    }
  };

  const handleMarkAsDone = async (appointmentId) => {
    try {
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      const response = await axios.patch(
        `${API_URL}/appointments/${appointmentId}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: 'Appointment marked as completed!',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error marking appointment as done:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to mark appointment as done',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const handleStartInstantMeeting = async (appointmentId) => {
    try {
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      setAlertConfig({
        type: 'info',
        title: 'Starting Meeting',
        message: 'Creating instant meeting...',
        buttons: []
      });
      setAlertVisible(true);
      
      const response = await axios.post(
        `${API_URL}/appointments/${appointmentId}/start-instant-meeting`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Refresh appointments to get updated meeting link
        await fetchAppointments();
        
        // Open the host URL immediately
        const hostUrl = response.data.data.hostUrl;
        Linking.openURL(hostUrl).catch(err => {
          console.error('Failed to open Zoom link:', err);
          setAlertConfig({
            type: 'error',
            title: 'Error',
            message: 'Could not open Zoom meeting link',
            buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
        });
        
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: 'Instant meeting created! Patient has been notified.',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('Error starting instant meeting:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to start instant meeting',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    
    if (filter === 'upcoming') {
      // Filter for upcoming appointments: pending, approved, rescheduled
      const upcomingApts = appointments.filter(apt => 
        ['pending', 'approved', 'rescheduled'].includes(apt.status)
      );
      
      // Sort: pending (new requests) first, then by date/time
      return upcomingApts.sort((a, b) => {
        // Pending appointments always on top
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // Then sort by appointment date and time
        const dateA = new Date(a.appointmentDate);
        const dateB = new Date(b.appointmentDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
        
        // If same date, sort by start time
        const timeA = a.timeSlot?.startTime || '00:00';
        const timeB = b.timeSlot?.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    } else {
      // History: completed, declined, cancelled
      const historyApts = appointments.filter(apt => 
        ['completed', 'declined', 'cancelled'].includes(apt.status)
      );
      
      // Sort by date (newest first)
      return historyApts.sort((a, b) => {
        const dateA = new Date(a.appointmentDate);
        const dateB = new Date(b.appointmentDate);
        return dateB - dateA; // Newest first
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      approved: '#4CAF50',
      declined: '#F44336',
      cancelled: '#9E9E9E',
      completed: '#2196F3',
    };
    return colors[status] || '#999';
  };

  const renderAppointmentCard = ({ item }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientEmail}>{item.patientEmail}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="calendar" size={18} color="#666" />
        <Text style={styles.detailText}>
          {new Date(item.appointmentDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="clock-outline" size={18} color="#666" />
        <Text style={styles.detailText}>
          {item.timeSlot.startTime} - {item.timeSlot.endTime}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="note-text" size={18} color="#666" />
        <Text style={styles.detailText}>{item.reason}</Text>
      </View>

      {item.status === 'completed' && item.completedAt && (
        <View style={[styles.detailRow, { marginTop: 8, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 6 }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
          <Text style={[styles.detailText, { color: '#4CAF50', fontWeight: '600' }]}>
            Completed on {new Date(item.completedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      )}

      {(item.status === 'approved' || item.status === 'rescheduled') && (
        <>
          {/* Start Instant Meeting Button - Primary Option */}
          <TouchableOpacity 
            style={[styles.joinButton, { backgroundColor: '#0066FF' }]}
            onPress={() => handleStartInstantMeeting(item._id)}
          >
            <MaterialCommunityIcons name="video-plus" size={20} color="#fff" />
            <Text style={styles.joinButtonText}>Start Instant Meeting</Text>
          </TouchableOpacity>

          {/* Scheduled Meeting Link - Commented Out as per user request */}
          {/* {item.zoomMeetingLink && (
            <TouchableOpacity 
              style={[styles.joinButton, { marginTop: 10, backgroundColor: '#666' }]}
              onPress={() => {
                const meetingUrl = item.zoomHostUrl || item.zoomMeetingLink;
                Linking.openURL(meetingUrl).catch(err => {
                  console.error('Failed to open Zoom link:', err);
                  setAlertConfig({
                    type: 'error',
                    title: 'Error',
                    message: 'Could not open Zoom meeting link',
                    buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
                  });
                  setAlertVisible(true);
                });
              }}
            >
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#fff" />
              <Text style={styles.joinButtonText}>Join Scheduled Meeting</Text>
            </TouchableOpacity>
          )} */}
        </>
      )}

      {item.status === 'pending' && (
        <>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleStatusUpdate(item._id, 'approved')}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleStatusUpdate(item._id, 'declined')}
            >
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton, { marginTop: 10 }]}
            onPress={() => openRescheduleModal(item)}
          >
            <MaterialCommunityIcons name="calendar-clock" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
        </>
      )}

      {(item.status === 'approved' || item.status === 'rescheduled') && (
        <>
          <TouchableOpacity
            style={[styles.actionButton, styles.markDoneButton, { marginTop: 10 }]}
            onPress={() => {
              setAlertConfig({
                type: 'warning',
                title: 'Mark as Completed',
                message: 'Are you sure this appointment has been completed?',
                buttons: [
                  { text: 'Cancel', style: 'secondary', onPress: () => setAlertVisible(false) },
                  { 
                    text: 'Yes, Mark Done', 
                    style: 'primary',
                    onPress: () => {
                      setAlertVisible(false);
                      handleMarkAsDone(item._id);
                    }
                  }
                ]
              });
              setAlertVisible(true);
            }}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>Mark as Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton, { marginTop: 10 }]}
            onPress={() => openRescheduleModal(item)}
          >
            <MaterialCommunityIcons name="calendar-clock" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <DoctorDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="DoctorAppointments"
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
            <Text style={styles.headerTitle}>Appointments</Text>
            <Text style={styles.headerSubtitle}>Manage patient consultations</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'history' && styles.filterButtonActive]}
          onPress={() => setFilter('history')}
        >
          <Text style={[styles.filterText, filter === 'history' && styles.filterTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {getFilteredAppointments().length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={80} color="#ccc" />
              <Text style={styles.emptyText}>No appointments found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'all' 
                  ? 'Patient appointments will appear here'
                  : `No ${filter} appointments`
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredAppointments()}
              renderItem={renderAppointmentCard}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Select New Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>
                  {newDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setNewDate(selectedDate);
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Start Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 09:00"
                value={newStartTime}
                onChangeText={setNewStartTime}
                maxLength={5}
              />

              <Text style={styles.label}>End Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10:00"
                value={newEndTime}
                onChangeText={setNewEndTime}
                maxLength={5}
              />

              <Text style={styles.label}>Reason for Rescheduling (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explain why you're rescheduling..."
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleReschedule}
                disabled={rescheduling}
              >
                {rescheduling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  patientName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  patientEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  rescheduleButton: {
    backgroundColor: '#FF9800',
  },
  markDoneButton: {
    backgroundColor: '#F1F8F4',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 10,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default AppointmentsScreen;