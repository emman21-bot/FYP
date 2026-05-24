import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '../../components/CustomAlert';

const API_URL = 'http://192.168.10.6:5000/api';

const DoctorsScreen = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myDoctor, setMyDoctor] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  
  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });
  
  // Input modal state
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    fetchDoctors();
    fetchMyRelationships();
  }, []);

  const fetchDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery, limit: 50 }
      });
      setDoctors(response.data.doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch doctors',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMyRelationships = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/care-relationships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const active = response.data.relationships.find(r => r.status === 'active');
      const pending = response.data.relationships.find(r => r.status === 'requested');
      
      setMyDoctor(active || null);
      setPendingRequest(pending || null);
    } catch (error) {
      console.error('Error fetching relationships:', error);
    }
  };

  const handleSendRequest = async (doctor) => {
    setSelectedDoctor(doctor);
    setRequestMessage('');
    setInputModalVisible(true);
  };
  
  const sendRequestToDoctor = async () => {
    if (!requestMessage || requestMessage.trim() === '') {
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Please provide a message',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    
    try {
      setInputModalVisible(false);
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/care-relationships/request`,
        {
          doctorEmail: selectedDoctor.email,
          requestMessage: requestMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAlertConfig({
        type: 'success',
        title: 'Success',
        message: 'Request sent to doctor!',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      fetchMyRelationships();
    } catch (error) {
      console.error('Error sending request:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to send request',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctors();
    fetchMyRelationships();
  };

  const renderDoctor = ({ item }) => {
    const isMyDoctor = myDoctor && myDoctor.doctorEmail === item.email;
    const isPending = pendingRequest && pendingRequest.doctorEmail === item.email;
    
    return (
      <TouchableOpacity
        style={[
          styles.doctorCard,
          isMyDoctor && styles.myDoctorCard
        ]}
        onPress={() => navigation.navigate('DoctorProfile', { doctor: item })}
      >
        <View style={styles.doctorIcon}>
          <Ionicons name="person-circle" size={50} color="#4A90E2" />
        </View>
        
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>
            {item.fullName || item.email}
          </Text>
          
          {item.doctorProfile?.specialization && (
            <Text style={styles.specialization}>
              {item.doctorProfile.specialization}
            </Text>
          )}
          
          {item.doctorProfile?.yearsOfExperience && (
            <Text style={styles.experience}>
              {item.doctorProfile.yearsOfExperience} years experience
            </Text>
          )}
          
          <Text style={styles.email}>{item.email}</Text>
          
          {isMyDoctor && (
            <View style={styles.myDoctorBadge}>
              <Text style={styles.myDoctorText}>My Doctor</Text>
            </View>
          )}
          
          {isPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Request Pending</Text>
            </View>
          )}
        </View>
        
        {!isMyDoctor && !isPending && (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => handleSendRequest(item)}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Doctor</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, specialty..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchDoctors}
        />
      </View>
      
      {myDoctor && (
        <View style={styles.currentDoctorBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
          <Text style={styles.bannerText}>
            Your doctor: Dr. {myDoctor.doctorName || myDoctor.doctorEmail}
          </Text>
        </View>
      )}
      
      <FlatList
        data={doctors}
        keyExtractor={(item) => item._id || item.email}
        renderItem={renderDoctor}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No doctors found</Text>
          </View>
        }
      />
      
      {/* Input Modal for Doctor Request */}
      <Modal
        visible={inputModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Request Doctor</Text>
            <Text style={styles.modalMessage}>
              Why do you want Dr. {selectedDoctor?.fullName || selectedDoctor?.email} as your doctor?
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your message..."
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setInputModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendRequestToDoctor}
              >
                <Text style={styles.sendButtonText}>Send Request</Text>
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
    backgroundColor: '#F5F7FA'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16
  },
  currentDoctorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8
  },
  bannerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#155724',
    fontWeight: '600'
  },
  listContainer: {
    padding: 15
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  myDoctorCard: {
    borderWidth: 2,
    borderColor: '#27AE60'
  },
  doctorIcon: {
    marginRight: 15
  },
  doctorInfo: {
    flex: 1
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5
  },
  specialization: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 3
  },
  experience: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 3
  },
  email: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 5
  },
  myDoctorBadge: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  myDoctorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  pendingBadge: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  pendingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  requestButton: {
    backgroundColor: '#4A90E2',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12
  },
  modalMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 20
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontWeight: '600'
  },
  sendButton: {
    backgroundColor: '#4A90E2'
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default DoctorsScreen;
