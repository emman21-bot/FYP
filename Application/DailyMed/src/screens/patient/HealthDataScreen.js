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
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import CustomAlert from '../../components/CustomAlert';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { healthDataAPI } from '../../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const HealthDataScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('add');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasDataToday, setHasDataToday] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Function to get formatted current date/time in local timezone
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [form, setForm] = useState({
    readingDate: getCurrentDateTime(),
    fasting: '',
    random: '',
    postMeal: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    weight: '',
    notes: '',
  });

  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
  });

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
  });

  useEffect(() => {
    if (activeTab === 'history') {
      loadHealthData(1);
    } else if (activeTab === 'add') {
      // Update date/time to current
      setForm(prev => ({ ...prev, readingDate: getCurrentDateTime() }));
      // Check if data exists for today
      checkTodayData();
    }
  }, [activeTab]);

  const checkTodayData = async () => {
    try {
      const response = await healthDataAPI.getHealthData(1, 1);
      if (response.success && response.data.length > 0) {
        const latestRecord = response.data[0];
        const recordDate = new Date(latestRecord.readingDate);
        const today = new Date();
        
        // Check if latest record is from today (GMT+5)
        const recordDateStr = recordDate.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' });
        const todayStr = today.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' });
        
        if (recordDateStr === todayStr) {
          setHasDataToday(true);
          setShowTodayModal(true);
        } else {
          setHasDataToday(false);
          setShowTodayModal(false);
        }
      } else {
        setHasDataToday(false);
        setShowTodayModal(false);
      }
    } catch (error) {
      console.error('Error checking today data:', error);
    }
  };

  const loadHealthData = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await healthDataAPI.getHealthData(page, 10);
      
      if (response.success) {
        if (page === 1) {
          setHistory(response.data);
        } else {
          setHistory(prev => [...prev, ...response.data]);
        }
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load health data',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    if (activeTab === 'history') {
      loadHealthData(1);
    } else {
      checkTodayData();
    }
  };

  // Helper to validate and limit numeric input
  const handleNumericInput = (value, field, maxValue, fieldName) => {
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    
    // Limit to 3 digits before decimal for most values
    if (sanitized.length > 0 && !sanitized.includes('.')) {
      if (sanitized.length > 3) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Invalid Input',
          message: `${fieldName} cannot exceed ${maxValue}`,
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
        return;
      }
    }
    
    // Check if value exceeds max when entered
    const numValue = parseFloat(sanitized);
    if (!isNaN(numValue) && numValue > maxValue) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Value Too High',
        message: `${fieldName} cannot be more than ${maxValue}`,
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return;
    }
    
    setForm({ ...form, [field]: sanitized });
  };

  const validateHealthData = () => {
    // Validate at least one field is filled
    const hasData = form.fasting || form.random || form.postMeal || 
                    form.systolic || form.diastolic || form.heartRate || 
                    form.weight;

    if (!hasData) {
      return { valid: false, message: 'Please enter at least one health measurement' };
    }

    // Validate blood sugar ranges (40-600 mg/dL)
    if (form.fasting && (parseFloat(form.fasting) < 40 || parseFloat(form.fasting) > 600)) {
      return { valid: false, message: 'Fasting blood sugar must be between 40-600 mg/dL' };
    }
    if (form.random && (parseFloat(form.random) < 40 || parseFloat(form.random) > 600)) {
      return { valid: false, message: 'Random blood sugar must be between 40-600 mg/dL' };
    }
    if (form.postMeal && (parseFloat(form.postMeal) < 40 || parseFloat(form.postMeal) > 600)) {
      return { valid: false, message: 'Post meal blood sugar must be between 40-600 mg/dL' };
    }

    // Validate blood pressure ranges (systolic: 70-250, diastolic: 40-200)
    if (form.systolic && (parseFloat(form.systolic) < 70 || parseFloat(form.systolic) > 250)) {
      return { valid: false, message: 'Systolic pressure must be between 70-250 mmHg' };
    }
    if (form.diastolic && (parseFloat(form.diastolic) < 40 || parseFloat(form.diastolic) > 200)) {
      return { valid: false, message: 'Diastolic pressure must be between 40-200 mmHg' };
    }

    // Validate heart rate (30-300 bpm)
    if (form.heartRate && (parseFloat(form.heartRate) < 30 || parseFloat(form.heartRate) > 300)) {
      return { valid: false, message: 'Heart rate must be between 30-300 bpm' };
    }

    // Validate weight (20-500 kg)
    if (form.weight && (parseFloat(form.weight) < 20 || parseFloat(form.weight) > 500)) {
      return { valid: false, message: 'Weight must be between 20-500 kg' };
    }

    return { valid: true };
  };

  const handleSave = async () => {
    // Check if data already exists for today
    if (hasDataToday) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Already Recorded',
        message: 'You have already recorded your health data for today. Come back tomorrow to add new readings.',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    const validation = validateHealthData();
    
    if (!validation.valid) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Validation Error',
        message: validation.message,
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    try {
      setSaving(true);
      
      // Use current time - server will handle timezone
      const now = new Date();
      
      const response = await healthDataAPI.addHealthData({
        readingDate: now.toISOString(),
        fasting: form.fasting ? parseFloat(form.fasting) : undefined,
        random: form.random ? parseFloat(form.random) : undefined,
        postMeal: form.postMeal ? parseFloat(form.postMeal) : undefined,
        systolic: form.systolic ? parseFloat(form.systolic) : undefined,
        diastolic: form.diastolic ? parseFloat(form.diastolic) : undefined,
        heartRate: form.heartRate ? parseFloat(form.heartRate) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        notes: form.notes,
      });

      if (response.success) {
        // Reset form
        setForm({
          readingDate: getCurrentDateTime(),
          fasting: '',
          random: '',
          postMeal: '',
          systolic: '',
          diastolic: '',
          heartRate: '',
          weight: '',
          notes: '',
        });

        // Mark that we have data for today and show modal
        setHasDataToday(true);
        setShowTodayModal(true);

        // Reload history if on history tab
        if (activeTab === 'history') {
          loadHealthData(1);
        }
      }
    } catch (error) {
      console.error('Error saving health data:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save health data',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Delete Reading',
      message: 'Are you sure you want to delete this health reading? This action cannot be undone.',
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
      const response = await healthDataAPI.deleteHealthData(id);
      
      if (response.success) {
        setHistory(history.filter((item) => item._id !== id));
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Deleted',
          message: 'Health data deleted successfully',
          onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error('Error deleting health data:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete health data',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const downloadPDF = async () => {
    try {
      // Generate HTML content for PDF
      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1e90ff; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #1e90ff; color: white; padding: 10px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .notes { font-style: italic; color: #666; }
            </style>
          </head>
          <body>
            <h1>Health Data Records</h1>
            <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p>
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

      history.forEach(item => {
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

      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Health Data Records',
          UTI: 'com.adobe.pdf'
        });
      }

      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'PDF generated successfully!',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    }
  };

  const getRandomColor = () => {
    const colors = ['#55c85999', '#2895ef99', '#f5b96099', '#df7ef099', '#f67aa399', '#68e8f999'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="HealthData"
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
            <Text style={styles.headerTitle}>Health Data</Text>
            <Text style={styles.headerSubtitle}>Track your daily health metrics</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            Add Reading
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, activeTab === 'history' && { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        
        {activeTab === 'add' ? (
          <View style={styles.cardContainer}>
            
            <View style={styles.titleRow}>
              <Feather name="plus-circle" size={21} color="#4da6ff" />
              <Text style={styles.sectionTitle}>Add New Reading</Text>
            </View>

            <Text style={styles.sectionDescription}>
              Enter your daily health measurements
            </Text>



            {/* Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date & Time</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#f2f2f2', color: '#555' }]}
                value={form.readingDate}
                editable={false}
              />
            </View>

            {/* Blood Sugar */}
            <View style={styles.iconTitleRow}>
              <MaterialCommunityIcons name="chart-line" size={20} color="#1e90ff" />
              <Text style={styles.bigInnerTitle}>Blood Sugar (mg/dL)</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Fasting</Text>
                <TextInput
                  style={styles.input}
                  value={form.fasting}
                  placeholder="40-600"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!hasDataToday}
                  onChangeText={(t) => handleNumericInput(t, 'fasting', 600, 'Fasting blood sugar')}
                />
              </View>

              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Random</Text>
                <TextInput
                  style={styles.input}
                  value={form.random}
                  placeholder="40-600"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!hasDataToday}
                  onChangeText={(t) => handleNumericInput(t, 'random', 600, 'Random blood sugar')}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Post Meal</Text>
              <TextInput
                style={styles.input}
                value={form.postMeal}
                placeholder="40-600"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={3}
                editable={!hasDataToday}
                onChangeText={(t) => handleNumericInput(t, 'postMeal', 600, 'Post meal blood sugar')}
              />
            </View>

            {/* Blood Pressure */}
            <View style={styles.iconTitleRow}>
              <MaterialCommunityIcons name="chart-line" size={20} color="#ff4d4d" />
              <Text style={styles.bigInnerTitle}>Blood Pressure (mmHg)</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Systolic</Text>
                <TextInput
                  style={styles.input}
                  value={form.systolic}
                  placeholder="70-250"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!hasDataToday}
                  onChangeText={(t) => handleNumericInput(t, 'systolic', 250, 'Systolic pressure')}
                />
              </View>

              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Diastolic</Text>
                <TextInput
                  style={styles.input}
                  value={form.diastolic}
                  placeholder="40-200"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!hasDataToday}
                  onChangeText={(t) => handleNumericInput(t, 'diastolic', 200, 'Diastolic pressure')}
                />
              </View>
            </View>

            {/* Heart Rate */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Heart Rate (bpm)</Text>
              <TextInput
                style={styles.input}
                value={form.heartRate}
                placeholder="30-300"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={3}
                editable={!hasDataToday}
                onChangeText={(t) => handleNumericInput(t, 'heartRate', 300, 'Heart rate')}
              />
            </View>

            {/* Weight */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={form.weight}
                placeholder="20-500"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={3}
                editable={!hasDataToday}
                onChangeText={(t) => handleNumericInput(t, 'weight', 500, 'Weight')}
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                value={form.notes}
                editable={!hasDataToday}
                onChangeText={(t) => setForm({ ...form, notes: t })}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, (saving || hasDataToday) && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={saving || hasDataToday}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Reading</Text>
              )}
            </TouchableOpacity>

          </View>
        ) : (
          <View style={styles.cardContainer}>
            <Text style={styles.sectionTitle}>Reading History</Text>
            <Text style={styles.sectionDescription}>Your saved health logs (Last 30 days)</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No readings yet</Text>
            ) : (
              <>
                {history.map((item) => {
                  const cardColor = getRandomColor();
                  return (
                    <View key={item._id} style={styles.historyCard}>
                      <View style={[styles.historyCardInner, { borderLeftColor: cardColor }]}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyDate}>{formatDate(item.readingDate)}</Text>

                          <TouchableOpacity onPress={() => confirmDelete(item._id)}>
                            <Ionicons name="trash-outline" size={25} color="rgba(255, 0, 0, 1)" />
                          </TouchableOpacity>
                        </View>

                        {item.bloodSugar?.fasting && (
                          <Text style={styles.historyText}><Text style={styles.historyLabel}>FASTING:</Text> {item.bloodSugar.fasting} mg/dL</Text>
                        )}
                        {item.bloodSugar?.random && (
                          <Text style={styles.historyText}><Text style={styles.historyLabel}>RANDOM:</Text> {item.bloodSugar.random} mg/dL</Text>
                        )}
                        {item.bloodSugar?.postMeal && (
                          <Text style={styles.historyText}><Text style={styles.historyLabel}>POST MEAL:</Text> {item.bloodSugar.postMeal} mg/dL</Text>
                        )}
                        {(item.bloodPressure?.systolic || item.bloodPressure?.diastolic) && (
                          <Text style={styles.historyText}>
                            <Text style={styles.historyLabel}>BP:</Text> {item.bloodPressure.systolic || '-'}/{item.bloodPressure.diastolic || '-'} mmHg
                          </Text>
                        )}
                        {item.heartRate && (
                          <Text style={styles.historyText}><Text style={styles.historyLabel}>HEART RATE:</Text> {item.heartRate} bpm</Text>
                        )}
                        {item.weight && (
                          <Text style={styles.historyText}><Text style={styles.historyLabel}>WEIGHT:</Text> {item.weight} kg</Text>
                        )}

                        {item.notes ? (
                          <Text style={styles.historyNotes}>Notes: {item.notes}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}

                {pagination.hasMore && (
                  <TouchableOpacity 
                    style={styles.showMoreButton}
                    onPress={() => loadHealthData(pagination.currentPage + 1)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <Text style={styles.showMoreText}>Show More</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* Fixed Download PDF Button - Outside ScrollView */}
      {activeTab === 'history' && history.length > 0 && (
        <TouchableOpacity style={styles.downloadButton} onPress={downloadPDF}>
          <Feather name="download" size={20} color="#fff" />
          <Text style={styles.downloadButtonText}>Download PDF</Text>
        </TouchableOpacity>
      )}

      {/* Today's Data Already Entered Modal */}
      <CustomAlert
        visible={showTodayModal}
        type="success"
        title="All Done for Today!"
        message="You have already recorded your health data for today. Come back tomorrow to add new readings."
        onClose={() => setShowTodayModal(false)}
      />

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

export default HealthDataScreen;


/* ---------------------- STYLES ---------------------- */
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

  tabContainer: {
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
  tabActive: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontFamily: 'Montserrat-SemiBold',
  },

  content: { padding: 20, paddingBottom: 50 },

  /* Matching settings UI */
  cardContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },

  bigInnerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },

  sectionDescription: {
    fontSize: 13,
    color: '#777',
    marginBottom: 18,
    fontFamily: 'Montserrat',
  },

  label: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    marginBottom: 6,
    color: Colors.textDark,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Montserrat',
  },

  formGroup: { marginBottom: 18 },
  formGroupHalf: { width: '48%' },

  row: { flexDirection: 'row', justifyContent: 'space-between' },

  textArea: { height: 100, textAlignVertical: 'top' },

  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 15,
  },

  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },

  saveButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },

  loadingContainer: {
    padding: 50,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },

  emptyText: {
    textAlign: 'center',
    color: Colors.textDark,
    marginTop: 20,
    fontFamily: 'Montserrat',
  },

  showMoreButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },

  showMoreText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },

  historyCard: {
    backgroundColor: '#f2f0f0ff',
    borderRadius: 14,
    padding: 3,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  historyCardInner: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 5,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  historyDate: { 
    fontFamily: 'Montserrat', 
    fontWeight: 'bold', 
    fontSize: 15,
    color: Colors.textDark 
  },
  
  historyLabel: {
    fontFamily: 'Montserrat',
    fontWeight: 'bold',
    color: Colors.textDark,
  },

  historyText: { 
    marginTop: 6, 
    fontFamily: 'Montserrat', 
    fontSize: 14,
    color: Colors.textDark 
  },

  historyNotes: { 
    marginTop: 8, 
    fontFamily: 'Montserrat', 
    fontStyle: 'italic', 
    fontSize: 13,
    color: '#666',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },

  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  todayCompleteCard: {
    alignItems: 'center',
    padding: 30,
  },

  todayCompleteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
    marginTop: 15,
    marginBottom: 10,
  },

  todayCompleteMessage: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },

  viewHistoryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },

  viewHistoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },

  downloadButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 30,
    gap: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
});
