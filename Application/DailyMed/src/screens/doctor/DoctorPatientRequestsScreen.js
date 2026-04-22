import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import CustomAlert from '../../components/CustomAlert';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthDataAPI } from '../../services/healthDataAPI';

const DoctorPatientRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [patientHealthData, setPatientHealthData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await careRelationshipAPI.getCareRelationships('requested');
      
      // Filter for requests where current user is the doctor
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData);
      const doctorRequests = data.filter(req => req.doctorEmail === user.email);
      
      setRequests(doctorRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to load patient requests',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const fetchPatientHistory = async (request) => {
    try {
      setLoadingHistory(true);
      setSelectedRequest(request);
      setHistoryModalVisible(true);
      
      // Fetch patient's health data
      const healthData = await healthDataAPI.getHealthData(request.patientEmail);
      
      // Get latest readings
      const latestGlucose = healthData
        .filter(d => d.type === 'glucose')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      const latestBP = healthData
        .filter(d => d.type === 'bloodPressure')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      const latestHeartRate = healthData
        .filter(d => d.type === 'heartRate')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      const latestWeight = healthData
        .filter(d => d.type === 'weight')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      // Calculate averages for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentGlucose = healthData.filter(
        d => d.type === 'glucose' && new Date(d.timestamp) > thirtyDaysAgo
      );
      const avgGlucose = recentGlucose.length > 0
        ? recentGlucose.reduce((sum, d) => sum + d.value, 0) / recentGlucose.length
        : null;
      
      const recentBP = healthData.filter(
        d => d.type === 'bloodPressure' && new Date(d.timestamp) > thirtyDaysAgo
      );
      const avgSystolic = recentBP.length > 0
        ? recentBP.reduce((sum, d) => sum + d.systolic, 0) / recentBP.length
        : null;
      const avgDiastolic = recentBP.length > 0
        ? recentBP.reduce((sum, d) => sum + d.diastolic, 0) / recentBP.length
        : null;
      
      setPatientHealthData({
        latestGlucose,
        latestBP,
        latestHeartRate,
        latestWeight,
        avgGlucose,
        avgSystolic,
        avgDiastolic,
        totalRecords: healthData.length,
      });
    } catch (error) {
      console.error('Error fetching patient history:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to load patient medical history',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    if (!showNotesInput) {
      setShowNotesInput(true);
      return;
    }
    
    try {
      await careRelationshipAPI.approvePatientRequest(
        selectedRequest._id,
        responseNotes || 'Request approved by doctor'
      );
      
      setAlertConfig({
        type: 'success',
        title: 'Success',
        message: `You are now connected with ${selectedRequest.patientName}`,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              setAlertVisible(false);
              setHistoryModalVisible(false);
              setResponseNotes('');
              setShowNotesInput(false);
              fetchRequests();
            },
          },
        ]
      });
      setAlertVisible(true);
    } catch (error) {
      console.error('Error approving request:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to approve request',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!showRejectionInput) {
      setShowRejectionInput(true);
      return;
    }
    
    if (!rejectionReason.trim()) {
      setAlertConfig({
        type: 'warning',
        title: 'Required',
        message: 'Please provide a reason for rejection',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    
    try {
      await careRelationshipAPI.rejectPatientRequest(
        selectedRequest._id,
        rejectionReason
      );
      
      setAlertConfig({
        type: 'info',
        title: 'Request Rejected',
        message: `${selectedRequest.patientName}'s request has been declined`,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              setAlertVisible(false);
              setHistoryModalVisible(false);
              setRejectionReason('');
              setShowRejectionInput(false);
              fetchRequests();
            },
          },
        ]
      });
      setAlertVisible(true);
    } catch (error) {
      console.error('Error rejecting request:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to reject request',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getGlucoseStatus = (value) => {
    if (!value) return { status: 'Unknown', color: Colors.gray };
    if (value < 70) return { status: 'Low', color: Colors.error };
    if (value <= 140) return { status: 'Normal', color: Colors.success };
    if (value <= 180) return { status: 'Elevated', color: Colors.warning };
    return { status: 'High', color: Colors.error };
  };

  const getBPStatus = (systolic, diastolic) => {
    if (!systolic || !diastolic) return { status: 'Unknown', color: Colors.gray };
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: Colors.success };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: Colors.warning };
    if (systolic < 140 || diastolic < 90) return { status: 'High Stage 1', color: Colors.warning };
    return { status: 'High Stage 2', color: Colors.error };
  };

  const renderRequestCard = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => fetchPatientHistory(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.patientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientEmail}>{item.patientEmail}</Text>
          <Text style={styles.requestDate}>
            Requested: {formatDate(item.requestedAt)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => fetchPatientHistory(item)}
        >
          <Text style={styles.viewButtonText}>View History</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHealthCard = (title, value, unit, icon, status) => (
    <View style={styles.healthCard}>
      <View style={styles.healthCardHeader}>
        <Text style={styles.healthCardIcon}>{icon}</Text>
        <Text style={styles.healthCardTitle}>{title}</Text>
      </View>
      <View style={styles.healthCardContent}>
        <Text style={styles.healthCardValue}>
          {value ? value : 'N/A'}
          {value && unit ? ` ${unit}` : ''}
        </Text>
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.status}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Patient Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Patient History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setHistoryModalVisible(false);
          setShowNotesInput(false);
          setShowRejectionInput(false);
          setResponseNotes('');
          setRejectionReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Medical History</Text>
              <TouchableOpacity
                onPress={() => {
                  setHistoryModalVisible(false);
                  setShowNotesInput(false);
                  setShowRejectionInput(false);
                  setResponseNotes('');
                  setRejectionReason('');
                }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingHistory ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading patient data...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {selectedRequest && (
                  <View style={styles.patientInfoSection}>
                    <View style={styles.largeAvatar}>
                      <Text style={styles.largeAvatarText}>
                        {selectedRequest.patientName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalPatientName}>
                      {selectedRequest.patientName}
                    </Text>
                    <Text style={styles.modalPatientEmail}>
                      {selectedRequest.patientEmail}
                    </Text>
                  </View>
                )}

                {patientHealthData && (
                  <View style={styles.healthDataSection}>
                    <Text style={styles.sectionTitle}>Latest Readings</Text>
                    
                    {renderHealthCard(
                      'Blood Glucose',
                      patientHealthData.latestGlucose?.value.toFixed(1),
                      'mg/dL',
                      '🩸',
                      patientHealthData.latestGlucose
                        ? getGlucoseStatus(patientHealthData.latestGlucose.value)
                        : null
                    )}

                    {renderHealthCard(
                      'Blood Pressure',
                      patientHealthData.latestBP
                        ? `${Math.round(patientHealthData.latestBP.systolic)}/${Math.round(patientHealthData.latestBP.diastolic)}`
                        : null,
                      'mmHg',
                      '💓',
                      patientHealthData.latestBP
                        ? getBPStatus(
                            patientHealthData.latestBP.systolic,
                            patientHealthData.latestBP.diastolic
                          )
                        : null
                    )}

                    {renderHealthCard(
                      'Heart Rate',
                      patientHealthData.latestHeartRate?.value
                        ? Math.round(patientHealthData.latestHeartRate.value)
                        : null,
                      'bpm',
                      '❤️',
                      null
                    )}

                    {renderHealthCard(
                      'Weight',
                      patientHealthData.latestWeight?.value.toFixed(1),
                      'kg',
                      '⚖️',
                      null
                    )}

                    <Text style={styles.sectionTitle}>30-Day Averages</Text>
                    
                    {renderHealthCard(
                      'Avg Blood Glucose',
                      patientHealthData.avgGlucose?.toFixed(1),
                      'mg/dL',
                      '📊',
                      patientHealthData.avgGlucose
                        ? getGlucoseStatus(patientHealthData.avgGlucose)
                        : null
                    )}

                    {renderHealthCard(
                      'Avg Blood Pressure',
                      patientHealthData.avgSystolic && patientHealthData.avgDiastolic
                        ? `${Math.round(patientHealthData.avgSystolic)}/${Math.round(patientHealthData.avgDiastolic)}`
                        : null,
                      'mmHg',
                      '📈',
                      patientHealthData.avgSystolic && patientHealthData.avgDiastolic
                        ? getBPStatus(
                            patientHealthData.avgSystolic,
                            patientHealthData.avgDiastolic
                          )
                        : null
                    )}

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryText}>
                        Total Health Records: {patientHealthData.totalRecords}
                      </Text>
                    </View>
                  </View>
                )}

                {showNotesInput && (
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Approval Notes (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Add notes for the patient..."
                      value={responseNotes}
                      onChangeText={setResponseNotes}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                {showRejectionInput && (
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Rejection Reason (Required)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Explain why you're declining this request..."
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={handleReject}
                disabled={loadingHistory}
              >
                <Text style={styles.rejectButtonText}>
                  {showRejectionInput ? 'Confirm Reject' : 'Reject'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={handleApprove}
                disabled={loadingHistory}
              >
                <Text style={styles.approveButtonText}>
                  {showNotesInput ? 'Confirm Accept' : 'Accept'}
                </Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 28,
    color: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  listContent: {
    padding: 20,
  },
  requestCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  cardInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  viewButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    fontSize: 24,
    color: Colors.textLight,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
  modalScroll: {
    maxHeight: '75%',
  },
  patientInfoSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
  },
  modalPatientName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalPatientEmail: {
    fontSize: 16,
    color: Colors.textLight,
  },
  healthDataSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  healthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthCardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  healthCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  healthCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  approveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DoctorPatientRequestsScreen;
