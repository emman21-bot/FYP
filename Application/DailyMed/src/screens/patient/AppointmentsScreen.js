import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import CustomAlert from '../../components/CustomAlert';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.1.71:5000/api';

const AppointmentsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showDoctorListModal, setShowDoctorListModal] = useState(false);
  const [showDoctorProfileModal, setShowDoctorProfileModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentReason, setAppointmentReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [filter, setFilter] = useState('upcoming'); // upcoming, history
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const hasInitialized = useRef(false);
  
  const [customAlert, setCustomAlert] = useState({
    visible: false,
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
      const token = await AsyncStorage.getItem('@dailymed_token');
      if (!token) {
        console.log('No token found, skipping appointment fetch');
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
      // Don't show alert, just log the error
    } finally {
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

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/doctor-profile/all`);
      
      if (response.data.success) {
        setDoctors(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error.response?.data?.message || error.message);
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load doctors. Please make sure the backend server is running.',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = () => {
    fetchDoctors();
    setShowDoctorListModal(true);
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDoctorListModal(false);
    setTimeout(() => setShowDoctorProfileModal(true), 300);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setShowDoctorProfileModal(false);
    setTimeout(() => setShowReasonModal(true), 300);
  };

  const handleBookAppointment = async () => {
    if (!appointmentReason.trim()) {
      setCustomAlert({
        visible: true,
        type: 'warning',
        title: 'Required',
        message: 'Please provide a reason for the appointment',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }

    try {
      setBookingLoading(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      const today = new Date();
      // Get local date in YYYY-MM-DD format
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const appointmentDate = `${year}-${month}-${day}`;
      
      const payload = {
        doctorId: selectedDoctor.userId,
        appointmentDate,
        timeSlot: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime
        },
        reason: appointmentReason.trim()
      };

      console.log('Booking appointment with payload:', payload);

      const response = await axios.post(`${API_URL}/appointments`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCustomAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Appointment request sent successfully! The doctor will review your request.',
          buttons: [{ 
            text: 'OK', 
            onPress: () => {
              setCustomAlert({ ...customAlert, visible: false });
              setShowReasonModal(false);
              setAppointmentReason('');
              setSelectedDoctor(null);
              setSelectedSlot(null);
              fetchAppointments();
            }
          }]
        });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      console.error('Error response:', error.response?.data);
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to book appointment',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert({ ...customAlert, visible: false }) }]
      });
    } finally {
      setBookingLoading(false);
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
        setCustomAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Appointment marked as completed!',
          buttons: [{ 
            text: 'OK', 
            onPress: () => {
              setCustomAlert(prev => ({ ...prev, visible: false }));
              fetchAppointments();
            }
          }]
        });
      }
    } catch (error) {
      console.error('Error marking appointment as done:', error);
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to mark appointment as done',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
      });
    }
  };

  const handleCancelAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    
    // If appointment is pending, cancel directly without reason
    if (appointment.status === 'pending') {
      setCustomAlert({
        visible: true,
        type: 'warning',
        title: 'Cancel Appointment',
        message: 'Are you sure you want to cancel this appointment request?',
        buttons: [
          { text: 'No', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) },
          { 
            text: 'Yes, Cancel',
            onPress: () => {
              setCustomAlert(prev => ({ ...prev, visible: false }));
              confirmCancelAppointment('');
            }
          }
        ]
      });
    } else {
      // For approved appointments, ask for reason
      setShowCancelModal(true);
    }
  };

  const confirmCancelAppointment = async (reason) => {
    try {
      setCancelLoading(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      const response = await axios.delete(
        `${API_URL}/appointments/${selectedAppointment._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { cancellationReason: reason }
        }
      );

      if (response.data.success) {
        setCustomAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Appointment cancelled successfully',
          buttons: [{ 
            text: 'OK', 
            onPress: () => {
              setCustomAlert(prev => ({ ...prev, visible: false }));
              setShowCancelModal(false);
              setCancellationReason('');
              fetchAppointments();
            }
          }]
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to cancel appointment',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const getTodayAvailableSlots = (doctor) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = doctor.availability?.find(a => a.day === today);
    return dayAvailability?.slots?.filter(s => s.isAvailable) || [];
  };

  const isSlotInPast = (slot) => {
    const now = new Date();
    const [hours, minutes] = slot.startTime.split(':');
    const slotTime = new Date();
    slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return slotTime < now;
  };

  const filteredDoctors = doctors.filter(doctor => 
    doctor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.expertise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      approved: '#4CAF50',
      declined: '#F44336',
      cancelled: '#9E9E9E',
      completed: '#2196F3',
      rescheduled: '#FF9800'
    };
    return colors[status] || '#999';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'clock-outline',
      approved: 'check-circle',
      declined: 'close-circle',
      cancelled: 'cancel',
      completed: 'checkbox-marked-circle',
      rescheduled: 'calendar-refresh'
    };
    return icons[status] || 'help-circle';
  };

  const renderAppointmentCard = ({ item }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{item.doctorName}</Text>
          <Text style={styles.doctorExpertise}>{item.doctorExpertise}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(item.status)} 
            size={16} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
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
            {`${item.timeSlot.startTime} - ${item.timeSlot.endTime}`}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="note-text" size={18} color="#666" />
          <Text style={styles.detailText} numberOfLines={2}>{item.reason}</Text>
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
        
        {(item.status === 'approved' || item.status === 'rescheduled') && item.status !== 'cancelled' && item.zoomMeetingLink && (
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => {
              Linking.openURL(item.zoomMeetingLink).catch(err => {
                console.error('Failed to open Zoom link:', err);
                setCustomAlert({
                  visible: true,
                  type: 'error',
                  title: 'Error',
                  message: 'Could not open Zoom meeting link',
                  buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
                });
              });
            }}
          >
            <MaterialCommunityIcons name="video" size={20} color="#fff" />
            <Text style={styles.joinButtonText}>Join Meeting</Text>
          </TouchableOpacity>
        )}

        {(item.status === 'approved' || item.status === 'rescheduled') && (
          <TouchableOpacity 
            style={styles.markDoneButton}
            onPress={() => {
              setCustomAlert({
                visible: true,
                type: 'info',
                title: 'Mark as Completed',
                message: 'Are you sure this appointment has been completed?',
                buttons: [
                  { text: 'Cancel', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) },
                  { 
                    text: 'Yes, Mark Done',
                    onPress: () => {
                      setCustomAlert(prev => ({ ...prev, visible: false }));
                      handleMarkAsDone(item._id);
                    }
                  }
                ]
              });
            }}
          >
            <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
            <Text style={styles.markDoneButtonText}>Mark as Done</Text>
          </TouchableOpacity>
        )}

        {(item.status === 'pending' || item.status === 'approved' || item.status === 'rescheduled') && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => handleCancelAppointment(item)}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color="#F44336" />
            <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="Appointments"
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
            <Text style={styles.headerSubtitle}>Schedule and manage your visits</Text>
          </View>
        </View>
      </View>

      {/* Filter Buttons */}
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
        {(() => {
          let filteredAppointments;
          
          if (filter === 'upcoming') {
            // Filter for upcoming appointments: pending, approved, rescheduled
            filteredAppointments = appointments.filter(apt => 
              ['pending', 'approved', 'rescheduled'].includes(apt.status)
            );
            
            // Sort: pending (new requests) first, then by date/time
            filteredAppointments.sort((a, b) => {
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
            filteredAppointments = appointments.filter(apt => 
              ['completed', 'declined', 'cancelled'].includes(apt.status)
            );
            
            // Sort by date (newest first)
            filteredAppointments.sort((a, b) => {
              const dateA = new Date(a.appointmentDate);
              const dateB = new Date(b.appointmentDate);
              return dateB - dateA; // Newest first
            });
          }
          
          return filteredAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={80} color="#ccc" />
              <Text style={styles.emptyText}>
                {filter === 'upcoming' ? 'No upcoming appointments' : 'No appointment history'}
              </Text>
              <Text style={styles.emptySubtext}>
                {filter === 'upcoming' 
                  ? 'Book your first appointment with a doctor' 
                  : 'Completed or cancelled appointments will appear here'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredAppointments}
              renderItem={renderAppointmentCard}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          );
        })()}
      </ScrollView>

      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={handleScheduleAppointment}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="calendar-plus" size={24} color="#fff" />
        <Text style={styles.scheduleButtonText}>Schedule Appointment</Text>
      </TouchableOpacity>

      <Modal
        visible={showDoctorListModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDoctorListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Doctor</Text>
              <TouchableOpacity onPress={() => setShowDoctorListModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredDoctors}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.doctorCard}
                    onPress={() => handleDoctorSelect(item)}
                  >
                    <View style={styles.doctorCardHeader}>
                      <View style={styles.doctorAvatar}>
                        <Text style={styles.doctorAvatarText}>
                          {item.fullName.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.doctorCardInfo}>
                        <Text style={styles.doctorCardName}>{item.fullName}</Text>
                        <Text style={styles.doctorCardExpertise}>{item.expertise}</Text>
                        {item.location?.city && (
                          <Text style={styles.doctorCardLocation}>
                            {`📍 ${item.location.city}, ${item.location.country}`}
                          </Text>
                        )}
                      </View>
                      <Feather name="chevron-right" size={24} color="#999" />
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyDoctors}>
                    <Text style={styles.emptyDoctorsText}>No doctors found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDoctorProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDoctorProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowDoctorProfileModal(false);
                setTimeout(() => setShowDoctorListModal(true), 300);
              }}>
                <Feather name="arrow-left" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Doctor Profile</Text>
              <TouchableOpacity onPress={() => setShowDoctorProfileModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.profileScrollView}>
              {selectedDoctor && (
                <>
                  <View style={styles.profileHeader}>
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileAvatarText}>
                        {selectedDoctor.fullName.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.profileName}>{selectedDoctor.fullName}</Text>
                    <Text style={styles.profileExpertise}>{selectedDoctor.expertise}</Text>
                    {selectedDoctor.location && (
                      <Text style={styles.profileLocation}>
                        {`📍 ${selectedDoctor.location.city}, ${selectedDoctor.location.country}`}
                      </Text>
                    )}
                  </View>

                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>About</Text>
                    <Text style={styles.profileAbout}>{selectedDoctor.about}</Text>
                  </View>

                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>Details</Text>
                    {selectedDoctor.experience > 0 && (
                      <View style={styles.profileDetailRow}>
                        <MaterialCommunityIcons name="briefcase" size={20} color="#666" />
                        <Text style={styles.profileDetailText}>
                          {selectedDoctor.experience} years experience
                        </Text>
                      </View>
                    )}
                    {selectedDoctor.consultationFee > 0 && (
                      <View style={styles.profileDetailRow}>
                        <MaterialCommunityIcons name="currency-usd" size={20} color="#666" />
                        <Text style={styles.profileDetailText}>
                          PKR {selectedDoctor.consultationFee} per consultation
                        </Text>
                      </View>
                    )}
                    {selectedDoctor.qualifications?.length > 0 && (
                      <View style={styles.profileDetailRow}>
                        <MaterialCommunityIcons name="school" size={20} color="#666" />
                        <Text style={styles.profileDetailText}>
                          {selectedDoctor.qualifications.join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>
                      Available Slots Today ({new Date().toLocaleDateString('en-US', { weekday: 'long' })})
                    </Text>
                    <View style={styles.slotsContainer}>
                      {getTodayAvailableSlots(selectedDoctor).length > 0 ? (
                        getTodayAvailableSlots(selectedDoctor).map((slot, index) => {
                          const isPast = isSlotInPast(slot);
                          return (
                            <TouchableOpacity
                              key={index}
                              style={[styles.slotButton, isPast && styles.slotButtonDisabled]}
                              onPress={() => !isPast && handleSlotSelect(slot)}
                              disabled={isPast}
                            >
                              <MaterialCommunityIcons 
                                name="clock-outline" 
                                size={20} 
                                color={isPast ? '#ccc' : Colors.primary} 
                              />
                              <Text style={[styles.slotText, isPast && styles.slotTextDisabled]}>
                                {`${slot.startTime} - ${slot.endTime}`}
                              </Text>
                              {isPast && (
                                <Text style={styles.pastLabel}>Past</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <Text style={styles.noSlotsText}>No available slots for today</Text>
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReasonModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '50%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowReasonModal(false);
                setTimeout(() => setShowDoctorProfileModal(true), 300);
              }}>
                <Feather name="arrow-left" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Why do you need this appointment?</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Describe your symptoms or reason for visit..."
                value={appointmentReason}
                onChangeText={setAppointmentReason}
                multiline
                numberOfLines={4}
                maxLength={500}
                placeholderTextColor="#999"
              />
              <Text style={styles.charCount}>{appointmentReason.length}/500</Text>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookAppointment}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={24} color="#fff" />
                    <Text style={styles.bookButtonText}>Book Appointment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        visible={showCancelModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '50%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Feather name="arrow-left" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Cancel Appointment</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Why are you cancelling this appointment?</Text>
              <Text style={styles.reasonSubLabel}>This reason will be sent to the doctor</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Please provide a reason..."
                value={cancellationReason}
                onChangeText={setCancellationReason}
                multiline
                numberOfLines={4}
                maxLength={500}
                placeholderTextColor="#999"
              />
              <Text style={styles.charCount}>{cancellationReason.length}/500</Text>

              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: '#F44336' }]}
                onPress={() => {
                  if (!cancellationReason.trim()) {
                    setCustomAlert({
                      visible: true,
                      type: 'warning',
                      title: 'Required',
                      message: 'Please provide a reason for cancellation',
                      buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
                    });
                    return;
                  }
                  confirmCancelAppointment(cancellationReason);
                }}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.bookButtonText}>Confirm Cancellation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onClose={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
      />
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
    paddingTop: 200,
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
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorExpertise: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  markDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#F1F8F4',
    gap: 6,
  },
  markDoneButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDD',
    gap: 6,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  scheduleButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 10,
    marginBottom: 10,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  doctorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  doctorCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doctorCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorCardExpertise: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  doctorCardLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyDoctors: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDoctorsText: {
    fontSize: 16,
    color: '#999',
  },
  profileScrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileExpertise: {
    fontSize: 16,
    color: Colors.primary,
    marginTop: 5,
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  profileSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  profileAbout: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  profileDetailText: {
    fontSize: 15,
    color: '#666',
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: 6,
  },
  slotButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  slotTextDisabled: {
    color: '#999',
  },
  pastLabel: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  reasonContainer: {
    flex: 1,
    padding: 20,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonSubLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  reasonInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppointmentsScreen;