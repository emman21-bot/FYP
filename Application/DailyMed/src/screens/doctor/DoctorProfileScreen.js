import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import CustomAlert from '../../components/CustomAlert';
import DoctorDrawer from '../../components/DoctorDrawer';

const API_URL = 'http://192.168.10.6:5000/api';

const DoctorProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });
  
  const [formData, setFormData] = useState({
    fullName: '',
    expertise: '',
    city: '',
    country: 'Pakistan',
    address: '',
    about: '',
    qualifications: '',
    experience: '',
    consultationFee: '',
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const timeSlots = [
    '12am-1am', '1am-2am', '2am-3am', '3am-4am', '4am-5am', '5am-6am',
    '6am-7am', '7am-8am', '8am-9am', '9am-10am', '10am-11am', '11am-12pm',
    '12pm-1pm', '1pm-2pm', '2pm-3pm', '3pm-4pm', '4pm-5pm', '5pm-6pm',
    '6pm-7pm', '7pm-8pm', '8pm-9pm', '9pm-10pm', '10pm-11pm', '11pm-12am'
  ];

  const [availability, setAvailability] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      if (!token) {
        console.log('No token found');
        return;
      }
      
      const response = await axios.get(`${API_URL}/doctor-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data) {
        const profileData = response.data.data;
        setProfile(profileData);
        
        setFormData({
          fullName: profileData.fullName || '',
          expertise: profileData.expertise || '',
          city: profileData.location?.city || '',
          country: profileData.location?.country || 'Pakistan',
          address: profileData.location?.address || '',
          about: profileData.about || '',
          qualifications: profileData.qualifications?.join(', ') || '',
          experience: profileData.experience?.toString() || '',
          consultationFee: profileData.consultationFee?.toString() || '',
        });

        // Convert availability to time slot format
        if (profileData.availability) {
          const availabilityMap = {};
          profileData.availability.forEach(dayData => {
            availabilityMap[dayData.day] = dayData.slots
              .filter(slot => slot.isAvailable)
              .map(slot => {
                // Convert 24hr format back to button format (e.g., "09:00" -> "9am")
                const startHour = parseInt(slot.startTime.split(':')[0]);
                const endHour = parseInt(slot.endTime.split(':')[0]);
                const startPeriod = startHour >= 12 ? 'pm' : 'am';
                const endPeriod = endHour >= 12 ? 'pm' : 'am';
                const start12 = startHour > 12 ? startHour - 12 : (startHour === 0 ? 12 : startHour);
                const end12 = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour);
                return `${start12}${startPeriod}-${end12}${endPeriod}`;
              });
          });
          setAvailability(availabilityMap);
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // Profile doesn't exist yet, that's okay - user can create one
        console.log('No profile found, user can create one');
      } else {
        console.error('Error fetching profile:', error.response?.data?.message || error.message);
      }
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
    fetchProfile();
  };

  const handleSaveProfile = async () => {
    // Validation
    if (!formData.fullName || !formData.expertise || !formData.about) {
      setAlertConfig({
        type: 'warning',
        title: 'Required Fields',
        message: 'Please fill in Name, Expertise, and About section',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      if (!token) {
        setAlertConfig({
          type: 'error',
          title: 'Authentication Error',
          message: 'Please login again',
          buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        return;
      }
      
      const payload = {
        fullName: formData.fullName.trim(),
        expertise: formData.expertise.trim(),
        location: {
          city: formData.city.trim(),
          country: formData.country.trim(),
          address: formData.address.trim(),
        },
        about: formData.about.trim(),
        qualifications: formData.qualifications.split(',').map(q => q.trim()).filter(q => q),
        experience: formData.experience ? parseInt(formData.experience) : 0,
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : 0,
      };

      const response = await axios.post(`${API_URL}/doctor-profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: 'Profile saved successfully!',
          buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        fetchProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save profile',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      if (!token) {
        setAlertConfig({
          type: 'error',
          title: 'Authentication Error',
          message: 'Please login again',
          buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        setSaving(false);
        return;
      }
      
      // Convert availability map to API format
      const availabilityArray = Object.keys(availability).map(day => ({
        day,
        slots: availability[day].map(slot => {
          const [start, end] = slot.split('-');
          return {
            startTime: convertTo24Hour(start),
            endTime: convertTo24Hour(end),
            isAvailable: true
          };
        })
      }));

      const response = await axios.put(`${API_URL}/doctor-profile/availability`, 
        { availability: availabilityArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: 'Availability updated successfully!',
          buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        setShowAvailabilityModal(false);
        fetchProfile();
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save availability',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const convertTo24Hour = (time) => {
    const match = time.match(/(\d+)(am|pm)/);
    if (!match) return '00:00';
    
    let hour = parseInt(match[1]);
    const period = match[2];
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const toggleTimeSlot = (slot) => {
    setAvailability(prev => {
      const daySlots = prev[selectedDay] || [];
      if (daySlots.includes(slot)) {
        return {
          ...prev,
          [selectedDay]: daySlots.filter(s => s !== slot)
        };
      } else {
        return {
          ...prev,
          [selectedDay]: [...daySlots, slot]
        };
      }
    });
  };

  const handleToggleStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      if (!token) {
        setAlertConfig({
          type: 'error',
          title: 'Authentication Error',
          message: 'Please login again',
          buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        return;
      }
      
      const response = await axios.patch(`${API_URL}/doctor-profile/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: `Profile ${profile?.isActive ? 'deactivated' : 'activated'} successfully!`,
          buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        fetchProfile();
      }
    } catch (error) {
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to toggle profile status',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <DoctorDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="DoctorProfile"
      />

      {/* Header */}
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
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your professional profile</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
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
        {/* Profile Status Card */}
        {profile && (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons 
                name={profile.isProfileComplete ? "check-circle" : "alert-circle"} 
                size={24} 
                color={profile.isProfileComplete ? Colors.success : Colors.warning} 
              />
              <Text style={styles.statusText}>
                Profile {profile.isProfileComplete ? 'Complete' : 'Incomplete'}
              </Text>
            </View>
            {!profile.isProfileComplete && (
              <View style={styles.incompleteDetails}>
                <Text style={styles.incompleteTitle}>Missing Information:</Text>
                {!formData.fullName && <Text style={styles.incompleteItem}>• Full Name</Text>}
                {!formData.expertise && <Text style={styles.incompleteItem}>• Expertise/Specialization</Text>}
                {!formData.city && <Text style={styles.incompleteItem}>• City</Text>}
                {!formData.country && <Text style={styles.incompleteItem}>• Country</Text>}
                {!formData.about && <Text style={styles.incompleteItem}>• About Section</Text>}
              </View>
            )}
            <View style={[styles.statusRow, { marginTop: 10 }]}>
              <MaterialCommunityIcons 
                name={profile.isActive ? "eye" : "eye-off"} 
                size={24} 
                color={profile.isActive ? Colors.success : Colors.error} 
              />
              <Text style={styles.statusText}>
                {profile.isActive ? 'Active - Visible to Patients' : 'Inactive - Hidden from Patients'}
              </Text>
            </View>
          </View>
        )}

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Dr. John Doe"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expertise/Specialization *</Text>
            <TextInput
              style={styles.input}
              value={formData.expertise}
              onChangeText={(text) => setFormData({ ...formData, expertise: text })}
              placeholder="e.g., Cardiologist, Surgeon, Physician"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>About Me *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.about}
              onChangeText={(text) => setFormData({ ...formData, about: text })}
              placeholder="Brief description about yourself and your practice"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Qualifications (comma-separated)</Text>
            <TextInput
              style={styles.input}
              value={formData.qualifications}
              onChangeText={(text) => setFormData({ ...formData, qualifications: text })}
              placeholder="MBBS, FCPS, MD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Experience (years)</Text>
              <TextInput
                style={styles.input}
                value={formData.experience}
                onChangeText={(text) => setFormData({ ...formData, experience: text })}
                placeholder="10"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Consultation Fee (PKR)</Text>
              <TextInput
                style={styles.input}
                value={formData.consultationFee}
                onChangeText={(text) => setFormData({ ...formData, consultationFee: text })}
                placeholder="2000"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Karachi"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
                placeholder="Pakistan"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Clinic/Hospital address"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Availability Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Availability</Text>
          <Text style={styles.sectionDescription}>
            Set your available time slots for each day of the week
          </Text>
          
          <TouchableOpacity 
            style={styles.availabilityButton}
            onPress={() => setShowAvailabilityModal(true)}
          >
            <MaterialCommunityIcons name="calendar-clock" size={24} color="#fff" />
            <Text style={styles.availabilityButtonText}>Manage Availability</Text>
          </TouchableOpacity>

          {/* Show current availability summary */}
          {Object.keys(availability).some(day => availability[day].length > 0) && (
            <View style={styles.availabilitySummary}>
              {daysOfWeek.map(day => (
                availability[day]?.length > 0 && (
                  <View key={day} style={styles.daySlotRow}>
                    <Text style={styles.dayName}>{day}:</Text>
                    <Text style={styles.slotCount}>{availability[day].length} slots</Text>
                  </View>
                )
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>

          {profile && (
            <TouchableOpacity 
              style={[styles.toggleButton, { backgroundColor: profile.isActive ? Colors.error : Colors.success }]}
              onPress={handleToggleStatus}
            >
              <Feather name={profile.isActive ? "eye-off" : "eye"} size={20} color="#fff" />
              <Text style={styles.toggleButtonText}>
                {profile.isActive ? 'Deactivate' : 'Activate'} Profile
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvailabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Availability</Text>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Day Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
              {daysOfWeek.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                  {availability[day]?.length > 0 && (
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{availability[day].length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time Slots Grid */}
            <ScrollView style={styles.slotsContainer} contentContainerStyle={styles.slotsGrid}>
              {timeSlots.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.timeSlotButton,
                    availability[selectedDay]?.includes(slot) && styles.timeSlotButtonActive
                  ]}
                  onPress={() => toggleTimeSlot(slot)}
                >
                  <Text style={[
                    styles.timeSlotText,
                    availability[selectedDay]?.includes(slot) && styles.timeSlotTextActive
                  ]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setAvailability({ ...availability, [selectedDay]: [] })}
              >
                <Text style={styles.clearButtonText}>Clear {selectedDay}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveAvailabilityButton}
                onPress={handleSaveAvailability}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveAvailabilityButtonText}>Save Availability</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
    backgroundColor: Colors.background,
    marginTop: StatusBar.currentHeight || 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  incompleteDetails: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  incompleteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  incompleteItem: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 5,
    marginVertical: 2,
  },
  toggleButton: {
    marginLeft: 'auto',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  availabilityButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  availabilityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  availabilitySummary: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  daySlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  slotCount: {
    fontSize: 14,
    color: Colors.primary,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
  },
  toggleButtonText: {
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
    paddingTop: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  daySelector: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  dayTabActive: {
    backgroundColor: Colors.primary,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayTabTextActive: {
    color: '#fff',
  },
  dayBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  slotsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 15,
  },
  timeSlotButton: {
    width: '31%',
    marginRight: '2.5%',
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  timeSlotButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  timeSlotTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clearButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveAvailabilityButton: {
    flex: 2,
    padding: 15,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveAvailabilityButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DoctorProfileScreen;
