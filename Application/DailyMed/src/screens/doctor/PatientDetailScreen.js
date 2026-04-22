import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.100.6:5000/api';
const { width } = Dimensions.get('window');

const PatientDetailScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);

  useEffect(() => {
    fetchPatientDetails();
  }, []);

  const fetchPatientDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/doctors/patient/${patient.email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatientData(response.data);
    } catch (error) {
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHealthDataChart = () => {
    if (!patientData || !patientData.healthData || patientData.healthData.length === 0) {
      return null;
    }

    const glucoseData = patientData.healthData
      .filter(d => d.bloodSugar)
      .reverse()
      .slice(-7);

    const bpData = patientData.healthData
      .filter(d => d.bloodPressure)
      .reverse()
      .slice(-7);

    return (
      <View>
        {glucoseData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Blood Glucose Trend (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: glucoseData.map((_, i) => `D${i + 1}`),
                datasets: [{
                  data: glucoseData.map(d => 
                    d.bloodSugar.fasting || d.bloodSugar.random || d.bloodSugar.postMeal || 100
                  )
                }]
              }}
              width={width - 60}
              height={200}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#4A90E2'
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {bpData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Blood Pressure Trend (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: bpData.map((_, i) => `D${i + 1}`),
                datasets: [
                  {
                    data: bpData.map(d => d.bloodPressure.systolic),
                    color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                    strokeWidth: 2
                  },
                  {
                    data: bpData.map(d => d.bloodPressure.diastolic),
                    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                    strokeWidth: 2
                  }
                ]
              }}
              width={width - 60}
              height={200}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 }
              }}
              bezier
              style={styles.chart}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E74C3C' }]} />
                <Text style={styles.legendText}>Systolic</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3498DB' }]} />
                <Text style={styles.legendText}>Diastolic</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderPredictions = () => {
    if (!patientData || !patientData.predictions || patientData.predictions.length === 0) {
      return null;
    }

    return (
      <View style={styles.predictionsCard}>
        <Text style={styles.sectionTitle}>AI Predictions</Text>
        {patientData.predictions.map((prediction, index) => (
          <View key={index} style={styles.predictionItem}>
            <View style={styles.predictionHeader}>
              <Ionicons name="analytics" size={20} color="#9B59B6" />
              <Text style={styles.predictionModel}>
                {prediction.modelName.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.predictionDate}>
              {new Date(prediction.createdAt).toLocaleDateString()}
            </Text>
            {prediction.output && (
              <Text style={styles.predictionOutput}>
                {JSON.stringify(prediction.output, null, 2).substring(0, 100)}...
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {patientData?.patient?.fullName || patient.fullName || patient.email}
          </Text>
          <Text style={styles.headerSubtitle}>{patient.email}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Patient Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color="#4A90E2" />
            <Text style={styles.infoText}>{patient.email}</Text>
          </View>
          
          {patient.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color="#4A90E2" />
              <Text style={styles.infoText}>{patient.phone}</Text>
            </View>
          )}
          
          {patient.medicalConditions && (
            <View style={styles.conditionsContainer}>
              <Text style={styles.conditionsLabel}>Conditions:</Text>
              {patient.medicalConditions.diabetes && (
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionText}>Diabetes</Text>
                </View>
              )}
              {patient.medicalConditions.hypertension && (
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionText}>Hypertension</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Latest Readings */}
        {patient.latestReading && (
          <View style={styles.readingsCard}>
            <Text style={styles.sectionTitle}>Latest Readings</Text>
            
            {patient.latestReading.bloodSugar && (
              <View style={styles.readingItem}>
                <Ionicons name="water" size={24} color="#4A90E2" />
                <View style={styles.readingDetails}>
                  <Text style={styles.readingLabel}>Blood Glucose</Text>
                  <Text style={styles.readingValue}>
                    {patient.latestReading.bloodSugar.fasting || 
                     patient.latestReading.bloodSugar.random || 
                     patient.latestReading.bloodSugar.postMeal} mg/dL
                  </Text>
                </View>
              </View>
            )}
            
            {patient.latestReading.bloodPressure && (
              <View style={styles.readingItem}>
                <Ionicons name="heart" size={24} color="#E74C3C" />
                <View style={styles.readingDetails}>
                  <Text style={styles.readingLabel}>Blood Pressure</Text>
                  <Text style={styles.readingValue}>
                    {patient.latestReading.bloodPressure.systolic}/
                    {patient.latestReading.bloodPressure.diastolic} mmHg
                  </Text>
                </View>
              </View>
            )}
            
            <Text style={styles.readingDate}>
              Last updated: {new Date(patient.latestReading.date).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Health Data Charts */}
        {renderHealthDataChart()}

        {/* AI Predictions */}
        {renderPredictions()}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateTreatmentPlan', { patient })}
          >
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Treatment Plan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('DosageReview', { patient })}
          >
            <Ionicons name="medkit" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Review Dosage</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    marginRight: 15
  },
  headerInfo: {
    flex: 1
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8F4FD',
    marginTop: 4
  },
  content: {
    padding: 15
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  infoText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#34495E'
  },
  conditionsContainer: {
    marginTop: 10
  },
  conditionsLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8
  },
  conditionBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginRight: 8,
    marginTop: 4
  },
  conditionText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600'
  },
  readingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2
  },
  readingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  readingDetails: {
    marginLeft: 15,
    flex: 1
  },
  readingLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4
  },
  readingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  readingDate: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 10,
    fontStyle: 'italic'
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6
  },
  legendText: {
    fontSize: 13,
    color: '#7F8C8D'
  },
  predictionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2
  },
  predictionItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#9B59B6',
    paddingLeft: 15,
    paddingVertical: 10,
    marginBottom: 15
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  predictionModel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9B59B6'
  },
  predictionDate: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 8
  },
  predictionOutput: {
    fontSize: 12,
    color: '#34495E',
    fontFamily: 'monospace'
  },
  actionsContainer: {
    marginTop: 10,
    marginBottom: 20
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12
  },
  secondaryButton: {
    backgroundColor: '#27AE60'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  }
});

export default PatientDetailScreen;
