import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import axios from 'axios';
import CustomAlert from '../../components/CustomAlert';

const API_URL = 'http://192.168.1.71:5000/api';

const FindDoctorScreen = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });

  useEffect(() => {
    fetchAvailableDoctors();
  }, []);

  const fetchAvailableDoctors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/doctor-profile/all`);

      if (response.data.success) {
        setDoctors(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to load doctors. Please make sure the backend server is running.',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
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
    fetchAvailableDoctors();
  };

  const handleDoctorPress = (doctor) => {
    // Set doctor first, then open modal with slight delay to ensure state is ready
    setSelectedDoctor(doctor);
    // Use setTimeout to ensure the state update has propagated before opening modal
    setTimeout(() => {
      setModalVisible(true);
    }, 100);
  };

  const handleSendRequest = async () => {
    if (!selectedDoctor) return;

    setAlertConfig({
      type: 'info',
      title: 'Send Request',
      message: `Send "Be My Doctor" request to Dr. ${selectedDoctor.fullName}?`,
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => setAlertVisible(false) },
        {
          text: 'Send',
          style: 'primary',
          onPress: async () => {
            setAlertVisible(false);
            try {
              setSending(true);
              const result = await careRelationshipAPI.sendDoctorRequest(selectedDoctor.userId);
              if (result.success) {
                setAlertConfig({
                  type: 'success',
                  title: 'Success',
                  message: 'Request sent successfully!',
                  buttons: [{
                    text: 'OK',
                    onPress: () => {
                      setAlertVisible(false);
                      setModalVisible(false);
                      setSelectedDoctor(null);
                    }
                  }]
                });
                setAlertVisible(true);
              }
            } catch (error) {
              const message = error.response?.data?.message || 'Failed to send request';
              setAlertConfig({
                type: 'error',
                title: 'Error',
                message: message,
                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
              });
              setAlertVisible(true);
            } finally {
              setSending(false);
            }
          }
        }
      ]
    });
    setAlertVisible(true);
  };

  const renderDoctorCard = ({ item }) => {
    const doctor = item.userId ? item : { ...item, userId: { _id: item._id } };

    return (
      <TouchableOpacity
        style={styles.doctorCard}
        onPress={() => handleDoctorPress(doctor)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            {doctor.profilePicture ? (
              <Image source={{ uri: doctor.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>Dr. {doctor.fullName || 'Unknown'}</Text>
            <Text style={styles.specialty}>{doctor.specialization || 'General Physician'}</Text>

            <View style={styles.detailsRow}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.detailText}>{doctor.clinicAddress || 'Not specified'}</Text>
            </View>

            <View style={styles.detailsRow}>
              <MaterialCommunityIcons name="certificate" size={14} color="#666" />
              <Text style={styles.detailText}>{doctor.experience || 0} years exp</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={16} color="#3498DB" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDoctorProfileModal = () => {
    if (!selectedDoctor) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Doctor Profile</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Doctor Header */}
              <View style={styles.profileHeader}>
                {selectedDoctor.profilePicture ? (
                  <Image source={{ uri: selectedDoctor.profilePicture }} style={styles.modalAvatar} />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarText}>
                      {selectedDoctor.fullName?.charAt(0) || 'D'}
                    </Text>
                  </View>
                )}
                <Text style={styles.profileName}>Dr. {selectedDoctor.fullName}</Text>
                <Text style={styles.profileSpecialty}>{selectedDoctor.expertise || selectedDoctor.specialization}</Text>
                {selectedDoctor.location && (
                  <Text style={styles.profileLocation}>
                    📍 {selectedDoctor.location.city}, {selectedDoctor.location.country}
                  </Text>
                )}
              </View>

              {/* About Section */}
              {selectedDoctor.about && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{selectedDoctor.about}</Text>
                </View>
              )}

              {/* Info Cards */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Professional Details</Text>

                {selectedDoctor.experience > 0 && (
                  <View style={styles.infoCard}>
                    <Ionicons name="briefcase" size={20} color="#3498DB" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Experience</Text>
                      <Text style={styles.infoValue}>{selectedDoctor.experience} years</Text>
                    </View>
                  </View>
                )}

                {selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
                  <View style={styles.infoCard}>
                    <Ionicons name="school" size={20} color="#3498DB" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Qualifications</Text>
                      <Text style={styles.infoValue}>{selectedDoctor.qualifications.join(', ')}</Text>
                    </View>
                  </View>
                )}

                {selectedDoctor.consultationFee > 0 && (
                  <View style={styles.infoCard}>
                    <Ionicons name="cash" size={20} color="#3498DB" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Consultation Fee</Text>
                      <Text style={styles.infoValue}>PKR {selectedDoctor.consultationFee}</Text>
                    </View>
                  </View>
                )}

                {selectedDoctor.hospitalAffiliation && (
                  <View style={styles.infoCard}>
                    <Ionicons name="business" size={20} color="#3498DB" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Hospital</Text>
                      <Text style={styles.infoValue}>{selectedDoctor.hospitalAffiliation}</Text>
                    </View>
                  </View>
                )}

                {selectedDoctor.contactNumber && (
                  <View style={styles.infoCard}>
                    <Ionicons name="call" size={20} color="#3498DB" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Contact</Text>
                      <Text style={styles.infoValue}>{selectedDoctor.contactNumber}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Languages */}
              {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                <View style={styles.languagesSection}>
                  <Text style={styles.sectionTitle}>Languages</Text>
                  <View style={styles.languagesList}>
                    {selectedDoctor.languages.map((lang, index) => (
                      <View key={index} style={styles.languageChip}>
                        <Text style={styles.languageText}>{lang}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Send Request Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.requestButton, sending && styles.requestButtonDisabled]}
                onPress={handleSendRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="doctor" size={20} color="#fff" />
                    <Text style={styles.requestButtonText}>Be My Doctor</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading doctors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Doctor</Text>
        <View style={{ width: 24 }} />
      </View>

      {doctors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="doctor" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No doctors available</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item) => item._id || item.userId?._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#3498DB']}
              tintColor={'#3498DB'}
            />
          }
        />
      )}

      {renderDoctorProfileModal()}
      
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
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  },
  listContent: {
    padding: 16
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    marginRight: 16
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  doctorInfo: {
    flex: 1
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  specialty: {
    fontSize: 14,
    color: '#3498DB',
    marginBottom: 8
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666'
  },
  cardActions: {
    marginLeft: 8
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EBF5FB',
    borderRadius: 8
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498DB',
    marginRight: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  modalBody: {
    flexGrow: 1,
    flexShrink: 1,
    padding: 20
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12
  },
  modalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  modalAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff'
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  profileSpecialty: {
    fontSize: 16,
    color: '#3498DB',
    marginBottom: 8
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  infoSection: {
    marginBottom: 24
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  infoContent: {
    marginLeft: 16,
    flex: 1
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  bioSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22
  },
  languagesSection: {
    marginBottom: 24
  },
  languagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  languageChip: {
    backgroundColor: '#EBF5FB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  languageText: {
    fontSize: 13,
    color: '#3498DB',
    fontWeight: '500'
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8
  },
  requestButtonDisabled: {
    backgroundColor: '#95A5A6'
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff'
  }
});

export default FindDoctorScreen;
