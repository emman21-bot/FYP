import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import CustomAlert from '../../components/CustomAlert';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { medicationsAPI } from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const MedicationsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  const [form, setForm] = useState({
    medicineName: '',
    dosageValue: '',
    dosageUnit: 'mg',
    frequency: 1,
    reminderTimings: [{ time: '08:00', period: 'AM' }],
  });

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const response = await medicationsAPI.getMedications();
      if (response.success) {
        // Sort by status (active first) and then by creation date
        const sorted = response.data.sort((a, b) => {
          if (a.status === b.status) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return a.status === 'active' ? -1 : 1;
        });
        setMedications(sorted);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load medications',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
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
    loadMedications();
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      medicineName: '',
      dosageValue: '',
      dosageUnit: 'mg',
      frequency: 1,
      reminderTimings: [{ time: '08:00', period: 'AM' }],
    });
    setModalVisible(true);
  };

  const openEditModal = (medication) => {
    setEditingId(medication._id);
    setForm({
      medicineName: medication.medicineName,
      dosageValue: medication.dosage.value.toString(),
      dosageUnit: medication.dosage.unit,
      frequency: medication.frequency,
      reminderTimings: medication.reminderTimings,
    });
    setModalVisible(true);
  };

  const handleFrequencyChange = (freq) => {
    const timings = [];
    for (let i = 0; i < freq; i++) {
      if (form.reminderTimings[i]) {
        timings.push(form.reminderTimings[i]);
      } else {
        const defaultTimes = ['08:00', '14:00', '20:00'];
        timings.push({ time: defaultTimes[i] || '08:00', period: 'AM' });
      }
    }
    setForm({ ...form, frequency: freq, reminderTimings: timings });
  };

  const updateReminderTime = (index, field, value) => {
    const newTimings = [...form.reminderTimings];
    newTimings[index][field] = value;
    setForm({ ...form, reminderTimings: newTimings });
  };

  const openTimePicker = (index) => {
    setSelectedTimeIndex(index);
    setShowTimePicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate && selectedTimeIndex !== null) {
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const timeString = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      const newTimings = [...form.reminderTimings];
      newTimings[selectedTimeIndex] = { time: timeString, period };
      setForm({ ...form, reminderTimings: newTimings });
    }
    
    if (Platform.OS === 'ios') {
      // Keep picker open for iOS
    }
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
    setSelectedTimeIndex(null);
  };

  const getDateFromTime = (time, period) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    date.setHours(hour24, minutes, 0, 0);
    return date;
  };

  const handleSave = async () => {
    if (!form.medicineName.trim()) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Please enter medicine name',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    if (!form.dosageValue || parseFloat(form.dosageValue) <= 0) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: 'Please enter valid dosage',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    try {
      const medicationData = {
        medicineName: form.medicineName,
        dosage: {
          value: parseFloat(form.dosageValue),
          unit: form.dosageUnit,
        },
        frequency: form.frequency,
        reminderTimings: form.reminderTimings,
      };

      let response;
      if (editingId) {
        response = await medicationsAPI.updateMedication(editingId, medicationData);
      } else {
        response = await medicationsAPI.addMedication(medicationData);
      }

      if (response.success) {
        setModalVisible(false);
        loadMedications();
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Success',
          message: editingId ? 'Medication updated successfully' : 'Medication added successfully',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error('Error saving medication:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save medication',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await medicationsAPI.updateMedicationStatus(id, newStatus);
      if (response.success) {
        loadMedications();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update status',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    }
  };

  const confirmDelete = (id, medicineName) => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Delete Medication',
      message: `Are you sure you want to delete "${medicineName}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            handleDelete(id);
          },
          style: 'destructive'
        }
      ]
    });
  };

  const handleDelete = async (id) => {
    try {
      const response = await medicationsAPI.deleteMedication(id);
      if (response.success) {
        loadMedications();
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Deleted',
          message: 'Medication deleted successfully',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete medication',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="Medications"
      />

      {/* Header without borders */}
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
            <Text style={styles.headerTitle}>Medications</Text>
            <Text style={styles.headerSubtitle}>Manage your medication schedule and reminders</Text>
          </View>
        </View>
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : medications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="pill-off" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No medications added yet</Text>
            <Text style={styles.emptySubtext}>Tap the button below to add your first medication</Text>
          </View>
        ) : (
          medications.map((med) => (
            <View key={med._id} style={styles.medicationCard}>
              <View style={styles.cardRow}>
                {/* Left: Pill Icon */}
                <MaterialCommunityIcons name="pill" size={32} color="#666" style={styles.pillIcon} />
                
                {/* Center: Medicine Info */}
                <View style={styles.medicineInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.medicineName}>{med.medicineName}</Text>
                    <View style={[styles.statusPill, { backgroundColor: med.status === 'active' ? '#4CAF50' : '#999' }]}>
                      <Text style={styles.statusPillText}>
                        {med.status.charAt(0).toUpperCase() + med.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Dosage:</Text> {`${med.dosage.value} ${med.dosage.unit}`}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Frequency:</Text> {med.frequency === 1 ? 'once' : med.frequency === 2 ? 'twice' : 'thrice'} a day
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Reminder:</Text> {med.reminderTimings.map(t => `${t.time}${t.period}`).join(', ')}
                  </Text>
                </View>

                {/* Right: Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, med.status === 'active' ? styles.deactivateButton : styles.activateButton]}
                    onPress={() => toggleStatus(med._id, med.status)}
                  >
                    <Text style={[styles.actionButtonText, med.status === 'active' ? styles.deactivateText : styles.activateText]}>
                      {med.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(med)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => confirmDelete(med._id, med.medicineName)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Medication Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Feather name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Medication</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Medication' : 'Add Medication'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Medicine Name */}
              <Text style={styles.label}>Medicine Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter medicine name"
                value={form.medicineName}
                onChangeText={(text) => setForm({ ...form, medicineName: text })}
              />

              {/* Dosage */}
              <Text style={styles.label}>Dosage</Text>
              <View style={styles.dosageContainer}>
                <TextInput
                  style={styles.dosageInput}
                  placeholder="Enter dosage"
                  keyboardType="numeric"
                  value={form.dosageValue}
                  onChangeText={(text) => setForm({ ...form, dosageValue: text })}
                />
                <TouchableOpacity
                  style={[styles.unitButton, form.dosageUnit === 'mg' && styles.unitButtonActive]}
                  onPress={() => setForm({ ...form, dosageUnit: 'mg' })}
                >
                  <Text style={styles.unitButtonText}>mg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, form.dosageUnit === 'tspn' && styles.unitButtonActive]}
                  onPress={() => setForm({ ...form, dosageUnit: 'tspn' })}
                >
                  <Text style={styles.unitButtonText}>tspn</Text>
                </TouchableOpacity>
              </View>

              {/* Frequency */}
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {[1, 2, 3].map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[styles.frequencyButton, form.frequency === freq && styles.frequencyButtonActive]}
                    onPress={() => handleFrequencyChange(freq)}
                  >
                    <Text style={styles.frequencyButtonText}>
                      {freq === 1 ? 'Once a day' : freq === 2 ? 'Twice a day' : 'Thrice a day'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reminder Timings */}
              <Text style={styles.label}>Reminder Timings</Text>
              {form.reminderTimings.map((timing, index) => (
                <View key={index} style={styles.timingRow}>
                  <Text style={styles.timingLabel}>Time {index + 1}:</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => openTimePicker(index)}
                  >
                    <Feather name="clock" size={18} color={Colors.primary} />
                    <Text style={styles.timePickerText}>
                      {`${timing.time} ${timing.period}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Medication</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      {showTimePicker && selectedTimeIndex !== null && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              visible={showTimePicker}
              transparent={true}
              animationType="fade"
              onRequestClose={closeTimePicker}
            >
              <View style={styles.timePickerModalOverlay}>
                <View style={styles.timePickerModalContent}>
                  <View style={styles.timePickerHeader}>
                    <Text style={styles.timePickerTitle}>Select Time</Text>
                    <TouchableOpacity onPress={closeTimePicker}>
                      <Text style={styles.timePickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={getDateFromTime(form.reminderTimings[selectedTimeIndex].time, form.reminderTimings[selectedTimeIndex].period)}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={getDateFromTime(form.reminderTimings[selectedTimeIndex].time, form.reminderTimings[selectedTimeIndex].period)}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onTimeChange}
            />
          )}
        </>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={alertConfig.onClose}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
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
  medicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pillIcon: {
    marginTop: 5,
    marginRight: 4,
  },
  medicineInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: Colors.textDark,
  },
  actionButtons: {
    minWidth: 110,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  deactivateButton: {
    backgroundColor: '#95A5A6',
  },
  activateButton: {
    backgroundColor: '#27AE60',
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  deactivateText: {
    color: '#fff',
  },
  activateText: {
    color: '#fff',
  },
  addButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '95%',
    maxHeight: '80%',
    padding: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 23,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 15,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Montserrat',
    backgroundColor: '#fff',
  },
  dosageContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dosageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 15,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Montserrat',
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  unitButtonActive: {
    borderColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Montserrat',
  },
  frequencyContainer: {
    gap: 10,
  },
  frequencyButton: {
    padding: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: Colors.primary,
  },
  frequencyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Montserrat',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  timingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    width: 60,
  },
  timePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  timePickerText: {
    fontSize: 15,
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  timePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Montserrat',
  },
  timePicker: {
    width: '100%',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  periodButtonActive: {
    borderColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Montserrat',
  },
  saveButton: {
    margin: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
});

export default MedicationsScreen;