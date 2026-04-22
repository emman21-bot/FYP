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
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import CustomAlert from '../../components/CustomAlert';
import DoctorDrawer from '../../components/DoctorDrawer';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import { healthDataAPI } from '../../services/healthDataAPI';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const DoctorMyPatientsScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [recordsModalVisible, setRecordsModalVisible] = useState(false);
  const [patientHealthData, setPatientHealthData] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'error',
    title: '',
    message: '',
    buttons: []
  });

  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, [])
  );

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await careRelationshipAPI.getCareRelationships('active');
      
      // Filter for relationships where current user is the doctor
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData);
      const myPatients = data.filter(rel => rel.doctorEmail === user.email);
      
      setPatients(myPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to load your patients',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  };

  const fetchPatientRecords = async (patient) => {
    try {
      setLoadingRecords(true);
      setSelectedPatient(patient);
      setRecordsModalVisible(true);
      
      // Fetch patient's health data
      const healthData = await healthDataAPI.getHealthData(patient.patientEmail);
      
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
      
      const latestInsulin = healthData
        .filter(d => d.type === 'insulin')
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
      
      const recentHeartRate = healthData.filter(
        d => d.type === 'heartRate' && new Date(d.timestamp) > thirtyDaysAgo
      );
      const avgHeartRate = recentHeartRate.length > 0
        ? recentHeartRate.reduce((sum, d) => sum + d.value, 0) / recentHeartRate.length
        : null;
      
      // Get glucose trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekGlucose = healthData.filter(
        d => d.type === 'glucose' && new Date(d.timestamp) > sevenDaysAgo
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setPatientHealthData({
        latestGlucose,
        latestBP,
        latestHeartRate,
        latestWeight,
        latestInsulin,
        avgGlucose,
        avgSystolic,
        avgDiastolic,
        avgHeartRate,
        totalRecords: healthData.length,
        weekGlucose,
        allData: healthData,
      });
    } catch (error) {
      console.error('Error fetching patient records:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to load patient medical records',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setLoadingRecords(false);
    }
  };

  const generatePDF = async () => {
    if (!selectedPatient || !patientHealthData) return;
    
    try {
      setGeneratingPDF(true);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: ${Colors.primary};
              border-bottom: 2px solid ${Colors.primary};
              padding-bottom: 10px;
            }
            h2 {
              color: ${Colors.primary};
              margin-top: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .patient-info {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .health-card {
              background: white;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
            }
            .metric {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
            }
            .metric-label {
              font-weight: bold;
              color: #666;
            }
            .metric-value {
              color: #333;
              font-size: 18px;
            }
            .status {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              color: white;
            }
            .status-normal { background: ${Colors.success}; }
            .status-elevated { background: ${Colors.warning}; }
            .status-high { background: ${Colors.error}; }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DailyMed - Patient Medical Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="patient-info">
            <h2>Patient Information</h2>
            <p><strong>Name:</strong> ${selectedPatient.patientName}</p>
            <p><strong>Email:</strong> ${selectedPatient.patientEmail}</p>
            <p><strong>Care Relationship Since:</strong> ${new Date(selectedPatient.approvedAt).toLocaleDateString()}</p>
          </div>
          
          <h2>Latest Vital Signs</h2>
          
          <div class="health-card">
            <h3>🩸 Blood Glucose</h3>
            ${patientHealthData.latestGlucose ? `
              <div class="metric">
                <span class="metric-label">Current Reading:</span>
                <span class="metric-value">${patientHealthData.latestGlucose.value.toFixed(1)} mg/dL</span>
              </div>
              <div class="metric">
                <span class="metric-label">Status:</span>
                <span class="status ${
                  patientHealthData.latestGlucose.value < 70 ? 'status-high' :
                  patientHealthData.latestGlucose.value <= 140 ? 'status-normal' : 'status-elevated'
                }">${
                  patientHealthData.latestGlucose.value < 70 ? 'Low' :
                  patientHealthData.latestGlucose.value <= 140 ? 'Normal' : 'Elevated'
                }</span>
              </div>
              <div class="metric">
                <span class="metric-label">Timestamp:</span>
                <span>${new Date(patientHealthData.latestGlucose.timestamp).toLocaleString()}</span>
              </div>
            ` : '<p>No data available</p>'}
          </div>
          
          <div class="health-card">
            <h3>💓 Blood Pressure</h3>
            ${patientHealthData.latestBP ? `
              <div class="metric">
                <span class="metric-label">Current Reading:</span>
                <span class="metric-value">${Math.round(patientHealthData.latestBP.systolic)}/${Math.round(patientHealthData.latestBP.diastolic)} mmHg</span>
              </div>
              <div class="metric">
                <span class="metric-label">Status:</span>
                <span class="status ${
                  patientHealthData.latestBP.systolic < 120 && patientHealthData.latestBP.diastolic < 80 ? 'status-normal' : 'status-elevated'
                }">${
                  patientHealthData.latestBP.systolic < 120 && patientHealthData.latestBP.diastolic < 80 ? 'Normal' : 'Elevated'
                }</span>
              </div>
              <div class="metric">
                <span class="metric-label">Timestamp:</span>
                <span>${new Date(patientHealthData.latestBP.timestamp).toLocaleString()}</span>
              </div>
            ` : '<p>No data available</p>'}
          </div>
          
          <div class="health-card">
            <h3>❤️ Heart Rate</h3>
            ${patientHealthData.latestHeartRate ? `
              <div class="metric">
                <span class="metric-label">Current Reading:</span>
                <span class="metric-value">${Math.round(patientHealthData.latestHeartRate.value)} bpm</span>
              </div>
              <div class="metric">
                <span class="metric-label">Timestamp:</span>
                <span>${new Date(patientHealthData.latestHeartRate.timestamp).toLocaleString()}</span>
              </div>
            ` : '<p>No data available</p>'}
          </div>
          
          ${patientHealthData.latestWeight ? `
            <div class="health-card">
              <h3>⚖️ Weight</h3>
              <div class="metric">
                <span class="metric-label">Current Weight:</span>
                <span class="metric-value">${patientHealthData.latestWeight.value.toFixed(1)} kg</span>
              </div>
              <div class="metric">
                <span class="metric-label">Timestamp:</span>
                <span>${new Date(patientHealthData.latestWeight.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ` : ''}
          
          <h2>30-Day Averages</h2>
          
          <div class="health-card">
            ${patientHealthData.avgGlucose ? `
              <div class="metric">
                <span class="metric-label">Average Blood Glucose:</span>
                <span class="metric-value">${patientHealthData.avgGlucose.toFixed(1)} mg/dL</span>
              </div>
            ` : ''}
            ${patientHealthData.avgSystolic && patientHealthData.avgDiastolic ? `
              <div class="metric">
                <span class="metric-label">Average Blood Pressure:</span>
                <span class="metric-value">${Math.round(patientHealthData.avgSystolic)}/${Math.round(patientHealthData.avgDiastolic)} mmHg</span>
              </div>
            ` : ''}
            ${patientHealthData.avgHeartRate ? `
              <div class="metric">
                <span class="metric-label">Average Heart Rate:</span>
                <span class="metric-value">${Math.round(patientHealthData.avgHeartRate)} bpm</span>
              </div>
            ` : ''}
            <div class="metric">
              <span class="metric-label">Total Health Records:</span>
              <span class="metric-value">${patientHealthData.totalRecords}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>This report is confidential and intended for medical professionals only.</p>
            <p>&copy; ${new Date().getFullYear()} DailyMed. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${selectedPatient.patientName} - Medical Report`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        setAlertConfig({
          type: 'success',
          title: 'Success',
          message: 'PDF generated successfully!',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF report',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleTerminateRelationship = async (patient) => {
    setAlertConfig({
      type: 'warning',
      title: 'Terminate Care Relationship',
      message: `Are you sure you want to end your care relationship with ${patient.patientName}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => setAlertVisible(false) },
        {
          text: 'Terminate',
          style: 'primary',
          onPress: async () => {
            setAlertVisible(false);
            try {
              await careRelationshipAPI.terminateCareRelationship(
                patient._id,
                'Care relationship ended by doctor'
              );
              setAlertConfig({
                type: 'success',
                title: 'Success',
                message: 'Care relationship has been terminated',
                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
              });
              setAlertVisible(true);
              fetchPatients();
            } catch (error) {
              console.error('Error terminating relationship:', error);
              setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'Failed to terminate care relationship',
                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
              });
              setAlertVisible(true);
            }
          },
        },
      ]
    });
    setAlertVisible(true);
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

  const renderPatientCard = ({ item }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => fetchPatientRecords(item)}
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
          <Text style={styles.relationshipDate}>
            Connected: {formatDate(item.approvedAt)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewRecordsButton}
          onPress={() => fetchPatientRecords(item)}
        >
          <Text style={styles.viewRecordsButtonText}>View Medical Records</Text>
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
      <DoctorDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="MyPatients"
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
            <Text style={styles.headerTitle}>Patients</Text>
            <Text style={styles.headerSubtitle}>Manage your patient records</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No active patients</Text>
          <Text style={styles.emptySubtext}>
            Patient requests will appear in the Patient Requests screen
          </Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          renderItem={renderPatientCard}
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

      {/* Patient Medical Records Modal */}
      <Modal
        visible={recordsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRecordsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Medical Records</Text>
              <TouchableOpacity onPress={() => setRecordsModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingRecords ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading medical records...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {selectedPatient && (
                  <View style={styles.patientInfoSection}>
                    <View style={styles.largeAvatar}>
                      <Text style={styles.largeAvatarText}>
                        {selectedPatient.patientName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalPatientName}>
                      {selectedPatient.patientName}
                    </Text>
                    <Text style={styles.modalPatientEmail}>
                      {selectedPatient.patientEmail}
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

                    {patientHealthData.latestWeight && renderHealthCard(
                      'Weight',
                      patientHealthData.latestWeight.value.toFixed(1),
                      'kg',
                      '⚖️',
                      null
                    )}

                    {patientHealthData.latestInsulin && renderHealthCard(
                      'Latest Insulin Dose',
                      patientHealthData.latestInsulin.dose?.toFixed(1),
                      'units',
                      '💉',
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

                    {patientHealthData.avgHeartRate && renderHealthCard(
                      'Avg Heart Rate',
                      Math.round(patientHealthData.avgHeartRate),
                      'bpm',
                      '💗',
                      null
                    )}

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryText}>
                        Total Health Records: {patientHealthData.totalRecords}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={generatePDF}
                disabled={loadingRecords || generatingPDF}
              >
                <Text style={styles.pdfButtonText}>
                  {generatingPDF ? 'Generating...' : '📄 Download PDF'}
                </Text>
              </TouchableOpacity>
              
              {selectedPatient && (
                <TouchableOpacity
                  style={styles.terminateButton}
                  onPress={() => {
                    setRecordsModalVisible(false);
                    setTimeout(() => handleTerminateRelationship(selectedPatient), 300);
                  }}
                  disabled={loadingRecords}
                >
                  <Text style={styles.terminateButtonText}>End Care</Text>
                </TouchableOpacity>
              )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.background,
    marginTop: StatusBar.currentHeight || 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  patientCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
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
  relationshipDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  viewRecordsButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewRecordsButtonText: {
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
    maxHeight: '70%',
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
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  pdfButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  terminateButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  terminateButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DoctorMyPatientsScreen;
