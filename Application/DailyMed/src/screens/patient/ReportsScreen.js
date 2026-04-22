import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import CustomAlert from '../../components/CustomAlert';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { healthDataAPI } from '../../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_URL = 'http://192.168.1.71:5000/api';
const { width } = Dimensions.get('window');

const ReportsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const authData = await AsyncStorage.getItem('@dailymed_token');
      if (!authData) {
        setLoading(false);
        return;
      }

      let token;
      try {
        const parsed = JSON.parse(authData);
        token = parsed.token || authData;
      } catch {
        token = authData;
      }

      // Get all health data for summary
      const response = await healthDataAPI.getHealthData(1, 100);
      
      if (response.success && response.data.length > 0) {
        const data = response.data;
        
        // Calculate averages
        const glucoseReadings = data.filter(d => d.bloodSugar?.fasting || d.bloodSugar?.random || d.bloodSugar?.postMeal);
        const bpReadings = data.filter(d => d.bloodPressure?.systolic && d.bloodPressure?.diastolic);
        
        const avgGlucose = glucoseReadings.reduce((sum, d) => {
          const avg = (
            (d.bloodSugar?.fasting || 0) + 
            (d.bloodSugar?.random || 0) + 
            (d.bloodSugar?.postMeal || 0)
          ) / (
            (d.bloodSugar?.fasting ? 1 : 0) + 
            (d.bloodSugar?.random ? 1 : 0) + 
            (d.bloodSugar?.postMeal ? 1 : 0)
          );
          return sum + avg;
        }, 0) / glucoseReadings.length;

        const avgSystolic = bpReadings.reduce((sum, d) => sum + d.bloodPressure.systolic, 0) / bpReadings.length;
        const avgDiastolic = bpReadings.reduce((sum, d) => sum + d.bloodPressure.diastolic, 0) / bpReadings.length;

        setSummary({
          totalReadings: data.length,
          avgGlucose: avgGlucose || 0,
          avgSystolic: avgSystolic || 0,
          avgDiastolic: avgDiastolic || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
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
    fetchSummary();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateReport = async (type) => {
    try {
      setGeneratingPDF(true);
      
      // Fetch data based on type
      let daysBack = type === 'weekly' ? 7 : 30;
      const response = await healthDataAPI.getHealthData(1, 100);
      
      if (!response.success || response.data.length === 0) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'No Data',
          message: 'No health records found',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
        setGeneratingPDF(false);
        return;
      }

      const allData = response.data;
      
      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      const filteredData = allData.filter(item => {
        const recordDate = new Date(item.readingDate);
        return recordDate >= cutoffDate;
      });

      if (filteredData.length === 0) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'No Data',
          message: `No health records found for the last ${daysBack} days`,
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
        setGeneratingPDF(false);
        return;
      }

      // Generate HTML for PDF
      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1e90ff; text-align: center; }
              h2 { color: #333; margin-top: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #1e90ff; color: white; padding: 10px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .notes { font-style: italic; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${type === 'weekly' ? 'Weekly' : 'Monthly'} Health Report</h1>
              <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p>
              <p><strong>Period:</strong> Last ${daysBack} days (${filteredData.length} records)</p>
            </div>
            <table>
              <tr>
                <th>Date & Time</th>
                <th>Fasting</th>
                <th>Random</th>
                <th>Post Meal</th>
                <th>BP</th>
                <th>Heart Rate</th>
                <th>Weight</th>
                <th>Notes</th>
              </tr>
      `;

      filteredData.forEach(item => {
        htmlContent += `
          <tr>
            <td>${formatDate(item.readingDate)}</td>
            <td>${item.bloodSugar?.fasting ? item.bloodSugar.fasting + ' mg/dL' : '-'}</td>
            <td>${item.bloodSugar?.random ? item.bloodSugar.random + ' mg/dL' : '-'}</td>
            <td>${item.bloodSugar?.postMeal ? item.bloodSugar.postMeal + ' mg/dL' : '-'}</td>
            <td>${item.bloodPressure?.systolic && item.bloodPressure?.diastolic ? item.bloodPressure.systolic + '/' + item.bloodPressure.diastolic + ' mmHg' : '-'}</td>
            <td>${item.heartRate ? item.heartRate + ' bpm' : '-'}</td>
            <td>${item.weight ? item.weight + ' kg' : '-'}</td>
            <td class="notes">${item.notes || '-'}</td>
          </tr>
        `;
      });

      htmlContent += `
            </table>
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${type === 'weekly' ? 'Weekly' : 'Monthly'} Health Report`,
          UTI: 'com.adobe.pdf'
        });
      }

      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Report generated successfully!',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } catch (error) {
      console.error('Error generating report:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to generate report',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="Reports"
      />

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={alertConfig.onClose}
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
            <Text style={styles.headerTitle}>Health Reports</Text>
            <Text style={styles.headerSubtitle}>View and download your health summaries</Text>
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
          </View>
        ) : (
          <>
            {/* 30-Day Health Summary Section */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Your Health Summary</Text>
              <Text style={styles.sectionSubtitle}>Your health metrics over the past month</Text>
              
              <View style={styles.cardsGrid}>
                {/* Total Readings Card */}
                <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="document-text" size={32} color="#1E90FF" />
                  <Text style={styles.cardValue}>{summary?.totalReadings || 0}</Text>
                  <Text style={styles.cardLabel}>Total Readings</Text>
                </View>

                {/* Avg Glucose Card */}
                <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
                  <MaterialCommunityIcons name="chart-line" size={32} color="#9C27B0" />
                  <Text style={styles.cardValue}>{summary?.avgGlucose ? summary.avgGlucose.toFixed(1) : '0'}</Text>
                  <Text style={styles.cardLabel}>Avg Glucose (mg/dL)</Text>
                </View>

                {/* Avg Systolic Card */}
                <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="heart" size={32} color="#E74C3C" />
                  <Text style={styles.cardValue}>{summary?.avgSystolic ? Math.round(summary.avgSystolic) : '0'}</Text>
                  <Text style={styles.cardLabel}>Avg Systolic (mmHg)</Text>
                </View>

                {/* Avg Diastolic Card */}
                <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="heart" size={32} color="#FF9800" />
                  <Text style={styles.cardValue}>{summary?.avgDiastolic ? Math.round(summary.avgDiastolic) : '0'}</Text>
                  <Text style={styles.cardLabel}>Avg Diastolic (mmHg)</Text>
                </View>
              </View>
            </View>

            {/* Generated Reports Section */}
            <View style={styles.reportsSection}>
              <Text style={styles.sectionTitle}>Generated Reports</Text>
              <Text style={styles.sectionSubtitle}>Download your previous health reports</Text>
              
              {/* Weekly Report Card */}
              <View style={styles.reportCard}>
                <View style={styles.reportCardLeft}>
                  <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>Weekly Report</Text>
                    <Text style={styles.reportDate}>Nov 09 - Nov 16, 2025</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.downloadButton, generatingPDF && styles.buttonDisabled]}
                  onPress={() => generateReport('weekly')}
                  disabled={generatingPDF}
                >
                  <Ionicons name="download-outline" size={20} color={Colors.primary} />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              </View>

              {/* Monthly Report Card */}
              <View style={styles.reportCard}>
                <View style={styles.reportCardLeft}>
                  <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>Monthly Report</Text>
                    <Text style={styles.reportDate}>Oct 17 - Nov 16, 2025</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.downloadButton, generatingPDF && styles.buttonDisabled]}
                  onPress={() => generateReport('monthly')}
                  disabled={generatingPDF}
                >
                  <Ionicons name="download-outline" size={20} color={Colors.primary} />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
    marginBottom: 20,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    marginBottom: 15,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    marginTop: 10,
  },
  cardLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  reportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 13,
    color: '#95A5A6',
    fontFamily: 'Montserrat',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Montserrat',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ReportsScreen;