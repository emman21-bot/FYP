import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { userProfileAPI } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';
import { Feather } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
  });

  // Profile State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');

  // Medical State
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasHypertension, setHasHypertension] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [allergies, setAllergies] = useState('');

  // Notification Switches
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [medReminders, setMedReminders] = useState(true);
  const [apptReminders, setApptReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userProfileAPI.getProfile();
      
      if (response.success) {
        const { profile, medical, notifications } = response.data;
        
        // Set profile data
        setFullName(profile.fullName || '');
        setPhone(profile.phone || '');
        if (profile.dateOfBirth) {
          setDob(new Date(profile.dateOfBirth));
        }
        setGender(profile.gender || '');
        
        // Set medical data
        setHeight(medical.height ? medical.height.toString() : '');
        setWeight(medical.weight ? medical.weight.toString() : '');
        setBloodType(medical.bloodType || '');
        setEmergencyName(medical.emergencyContact.name || '');
        setEmergencyPhone(medical.emergencyContact.phone || '');
        setHasDiabetes(medical.medicalConditions.diabetes || false);
        setHasHypertension(medical.medicalConditions.hypertension || false);
        setMedicalHistory(medical.medicalHistory || '');
        setCurrentMeds(medical.currentMedications || '');
        setAllergies(medical.allergies || '');
        
        // Set notification preferences
        setHealthAlerts(notifications.healthAlerts ?? true);
        setMedReminders(notifications.medReminders ?? true);
        setApptReminders(notifications.apptReminders ?? true);
        setWeeklyReports(notifications.weeklyReports ?? true);
        setSecurityAlerts(notifications.securityAlerts ?? true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load profile data',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    if (!fullName.trim()) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Full Name is required.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return false;
    }
    if (!phone.trim() || !/^\+?\d{10,15}$/.test(phone)) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Please enter a valid phone number.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return false;
    }
    if (!gender) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Gender is required.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return false;
    }
    return true;
  };

  const validateMedical = () => {
    if (height && isNaN(parseFloat(height))) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Height must be a number.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return false;
    }
    if (weight && isNaN(parseFloat(weight))) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Weight must be a number.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return false;
    }
    if (!bloodType) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Blood Type is required.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (validateProfile()) {
      try {
        setSaving(true);
        const response = await userProfileAPI.updateProfile({
          fullName,
          phone,
          dateOfBirth: dob.toISOString(),
          gender
        });
        
        if (response.success) {
          setAlertConfig({
            visible: true,
            type: 'success',
            title: 'Success',
            message: 'Profile saved successfully!',
            onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          });
        }
      } catch (error) {
        console.error('Error saving profile:', error);
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Error',
          message: error.response?.data?.message || 'Failed to save profile',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveMedical = async () => {
    if (validateMedical()) {
      try {
        setSaving(true);
        const response = await userProfileAPI.updateMedicalInfo({
          height: height ? parseFloat(height) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
          bloodType,
          emergencyName,
          emergencyPhone,
          hasDiabetes,
          hasHypertension,
          medicalHistory,
          currentMedications: currentMeds,
          allergies
        });
        
        if (response.success) {
          setAlertConfig({
            visible: true,
            type: 'success',
            title: 'Success',
            message: 'Medical profile saved successfully!',
            onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          });
        }
      } catch (error) {
        console.error('Error saving medical info:', error);
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Error',
          message: error.response?.data?.message || 'Failed to save medical information',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      const response = await userProfileAPI.updateNotificationPreferences({
        healthAlerts,
        medReminders,
        apptReminders,
        weeklyReports,
        securityAlerts
      });
      
      if (response.success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Notification preferences saved successfully!',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save notification preferences',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dob;
    setShowDatePicker(Platform.OS === 'ios');
    setDob(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <Text style={styles.sectionDescription}>Update your personal details</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter full name"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity onPress={showDatepicker} style={styles.input}>
            <Text style={styles.dateText}>
              {formatDate(dob)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={dob}
              mode="date"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
        </View>

        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={(itemValue) => setGender(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
              <Picker.Item label="Prefer not to say" value="prefer_not_to_say" />
            </Picker>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
        onPress={handleSaveProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderMedicalTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Medical Information</Text>
      <Text style={styles.sectionDescription}>Update your medical profile and health details</Text>

      <View style={styles.row}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            placeholder="e.g., 175"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g., 70"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Blood Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={bloodType}
            onValueChange={(itemValue) => setBloodType(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select blood type" value="" />
            <Picker.Item label="A+" value="A+" />
            <Picker.Item label="A-" value="A-" />
            <Picker.Item label="B+" value="B+" />
            <Picker.Item label="B-" value="B-" />
            <Picker.Item label="AB+" value="AB+" />
            <Picker.Item label="AB-" value="AB-" />
            <Picker.Item label="O+" value="O+" />
            <Picker.Item label="O-" value="O-" />
          </Picker>
        </View>
      </View>

      <Text style={styles.subSectionTitle}>Emergency Contact</Text>
      <View style={styles.row}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput
            style={styles.input}
            value={emergencyName}
            onChangeText={setEmergencyName}
            placeholder="Ali Ameer"
          />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="0300xxxxxxx"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <Text style={styles.subSectionTitle}>Medical Conditions</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Diabetes</Text>
        <Switch value={hasDiabetes} onValueChange={setHasDiabetes} />
      </View>
      <View style={[styles.switchRow, { marginTop: 0 }]}>
        <Text style={styles.switchLabel}>Hypertension</Text>
        <Switch value={hasHypertension} onValueChange={setHasHypertension} />
      </View>

      <Text style={styles.subSectionTitle}>Medical History</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={medicalHistory}
        onChangeText={setMedicalHistory}
        placeholder="List any past conditions, surgeries..."
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        value={currentMeds}
        onChangeText={setCurrentMeds}
        placeholder="Current medications..."
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        value={allergies}
        onChangeText={setAllergies}
        placeholder="Allergies (medications, food, etc.)..."
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
        onPress={handleSaveMedical}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Medical Profile</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      <Text style={styles.sectionDescription}>Manage how you receive alerts and updates</Text>

      <View style={styles.notificationItem}>
        <View>
          <Text style={styles.notifTitle}>Health Alerts</Text>
          <Text style={styles.notifDesc}>Receive notifications about abnormal readings</Text>
        </View>
        <Switch value={healthAlerts} onValueChange={setHealthAlerts} />
      </View>

      <View style={styles.notificationItem}>
        <View>
          <Text style={styles.notifTitle}>Medication Reminders</Text>
          <Text style={styles.notifDesc}>Get reminders for your medication schedule</Text>
        </View>
        <Switch value={medReminders} onValueChange={setMedReminders} />
      </View>

      <View style={styles.notificationItem}>
        <View>
          <Text style={styles.notifTitle}>Appointment Reminders</Text>
          <Text style={styles.notifDesc}>Receive reminders for upcoming appointments</Text>
        </View>
        <Switch value={apptReminders} onValueChange={setApptReminders} />
      </View>

      <View style={styles.notificationItem}>
        <View>
          <Text style={styles.notifTitle}>Weekly Reports</Text>
          <Text style={styles.notifDesc}>Get weekly summaries of your health data</Text>
        </View>
        <Switch value={weeklyReports} onValueChange={setWeeklyReports} />
      </View>

      <View style={styles.notificationItem}>
        <View>
          <Text style={styles.notifTitle}>Security Alerts</Text>
          <Text style={styles.notifDesc}>Be notified of security-related events</Text>
        </View>
        <Switch value={securityAlerts} onValueChange={setSecurityAlerts} />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
        onPress={handleSaveNotifications}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="Settings"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary || '#007AFF'} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <>
      {/* Header with Integrated Title */}
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
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medical' && styles.activeTab]}
          onPress={() => setActiveTab('medical')}
        >
          <Text style={[styles.tabText, activeTab === 'medical' && styles.activeTabText]}>Medical</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'medical' && renderMedicalTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={alertConfig.onClose}
      />
      </>
      )}
    </SafeAreaView>
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
    fontFamily: 'Montserrat-Regular',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.background,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 0,
    paddingHorizontal: 20,
    marginTop: 25,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontFamily: 'Montserrat-SemiBold',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tabContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: '#000',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontFamily: 'Montserrat-Regular',
  },
  subSectionTitle: {
    fontSize: 17,
    fontFamily: 'Montserrat-Bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Montserrat-Medium',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    fontFamily: 'Montserrat-Regular',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Montserrat-Regular',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
    marginBottom: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    color: '#333',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notifTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#000',
  },
  notifDesc: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Montserrat-SemiBold',
  },
});

export default SettingsScreen;