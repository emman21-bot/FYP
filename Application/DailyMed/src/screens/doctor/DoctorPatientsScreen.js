import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import CustomAlert from '../../components/CustomAlert';
import DoctorDrawer from '../../components/DoctorDrawer';
import { Colors } from '../../../constants/theme';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import { healthDataAPI } from '../../services/healthDataAPI';
import { analyticsAPI } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const DoctorPatientsScreen = ({ navigation }) => {
    const [requests, setRequests] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState('request');
    const [patientHealthData, setPatientHealthData] = useState(null);
    const [patientAnalytics, setPatientAnalytics] = useState(null);
    const [loadingData, setLoadingData] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
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
            fetchAllData();
        }, [])
    );

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [requestsResponse, patientsResponse] = await Promise.all([
                careRelationshipAPI.getCareRelationships('requested'),
                careRelationshipAPI.getCareRelationships('active')
            ]);

            setRequests(Array.isArray(requestsResponse) ? requestsResponse : (requestsResponse?.data || []));
            setPatients(Array.isArray(patientsResponse) ? patientsResponse : (patientsResponse?.data || []));
        } catch (error) {
            console.error('Error fetching data:', error);
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'Failed to load patient data',
                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAllData();
        setRefreshing(false);
    };

    const fetchPatientData = async (patientEmail) => {
        try {
            setLoadingData(true);

            // Fetch both health data and analytics in parallel
            const [healthResponse, analyticsResponse] = await Promise.allSettled([
                healthDataAPI.getPatientHealthDataForDoctor(patientEmail),
                analyticsAPI.getPatientAnalyticsForDoctor(patientEmail)
            ]);

            if (healthResponse.status === 'fulfilled' && healthResponse.value.success) {
                setPatientHealthData({
                    records: healthResponse.value.data || [],
                    stats: healthResponse.value.stats || {},
                    latestReadings: healthResponse.value.latestReadings || {}
                });
            } else {
                setPatientHealthData({ records: [], stats: {}, latestReadings: {} });
            }

            if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.success) {
                setPatientAnalytics(analyticsResponse.value);
            } else {
                setPatientAnalytics(null);
            }
        } catch (error) {
            console.error('Error fetching patient data:', error);
            setPatientHealthData({ records: [], stats: {}, latestReadings: {} });
            setPatientAnalytics(null);
        } finally {
            setLoadingData(false);
        }
    };

    const handleViewRequest = async (request) => {
        setSelectedItem(request);
        setModalType('request');
        setModalVisible(true);
        await fetchPatientData(request.patientEmail);
    };

    const handleViewPatient = async (patient) => {
        setSelectedItem(patient);
        setModalType('patient');
        setActiveTab('dashboard');
        setModalVisible(true);
        await fetchPatientData(patient.patientEmail);
    };

    const handleApprove = async () => {
        if (!selectedItem) return;
        try {
            await careRelationshipAPI.approvePatientRequest(selectedItem._id, 'Request approved');
            setAlertConfig({
                type: 'success',
                title: 'Success',
                message: `You are now connected with ${selectedItem.patientName}`,
                buttons: [{
                    text: 'OK',
                    style: 'primary',
                    onPress: () => { setAlertVisible(false); closeModal(); fetchAllData(); }
                }]
            });
            setAlertVisible(true);
        } catch (error) {
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
        if (!selectedItem) return;
        setAlertConfig({
            type: 'warning',
            title: 'Reject Request',
            message: `Reject ${selectedItem.patientName}'s request?`,
            buttons: [
                { text: 'Cancel', style: 'secondary', onPress: () => setAlertVisible(false) },
                {
                    text: 'Reject',
                    style: 'primary',
                    onPress: async () => {
                        setAlertVisible(false);
                        try {
                            await careRelationshipAPI.rejectPatientRequest(selectedItem._id, 'Request declined');
                            setAlertConfig({
                                type: 'success',
                                title: 'Success',
                                message: 'Request rejected',
                                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                            closeModal();
                            fetchAllData();
                        } catch (error) {
                            setAlertConfig({
                                type: 'error',
                                title: 'Error',
                                message: 'Failed to reject request',
                                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                        }
                    }
                }
            ]
        });
        setAlertVisible(true);
    };

    const handleEndRelationship = async () => {
        if (!selectedItem) return;
        setAlertConfig({
            type: 'warning',
            title: 'End Care',
            message: `End care with ${selectedItem.patientName}?`,
            buttons: [
                { text: 'Cancel', style: 'secondary', onPress: () => setAlertVisible(false) },
                {
                    text: 'End',
                    style: 'primary',
                    onPress: async () => {
                        setAlertVisible(false);
                        try {
                            await careRelationshipAPI.terminateCareRelationship(selectedItem._id, 'Ended by doctor');
                            setAlertConfig({
                                type: 'success',
                                title: 'Success',
                                message: 'Care relationship ended',
                                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                            closeModal();
                            fetchAllData();
                        } catch (error) {
                            setAlertConfig({
                                type: 'error',
                                title: 'Error',
                                message: 'Failed to end relationship',
                                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                        }
                    }
                }
            ]
        });
        setAlertVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setPatientHealthData(null);
        setPatientAnalytics(null);
    };

    const generateReport = async (type) => {
        if (!selectedItem || !patientHealthData) return;
        try {
            setGeneratingPDF(true);
            const { records } = patientHealthData;
            const daysBack = type === 'weekly' ? 7 : 30;
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysBack);
            const data = records.filter(r => new Date(r.readingDate) >= cutoff);

            if (data.length === 0) {
                setAlertConfig({
                    type: 'info',
                    title: 'No Data',
                    message: `No records for last ${daysBack} days`,
                    buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
                return;
            }

            const html = `<html><head><style>
        body{font-family:Arial;padding:20px}
        h1{color:#3498DB;text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{background:#3498DB;color:#fff;padding:10px}
        td{padding:10px;border-bottom:1px solid #ddd}
      </style></head><body>
        <h1>${type === 'weekly' ? 'Weekly' : 'Monthly'} Report</h1>
        <p>Patient: ${selectedItem.patientName}</p>
        <p>Period: Last ${daysBack} days (${data.length} records)</p>
        <table><tr><th>Date</th><th>Fasting</th><th>Random</th><th>BP</th><th>HR</th></tr>
        ${data.map(d => `<tr>
          <td>${new Date(d.readingDate).toLocaleDateString()}</td>
          <td>${d.bloodSugar?.fasting || '-'}</td>
          <td>${d.bloodSugar?.random || '-'}</td>
          <td>${d.bloodPressure?.systolic ? `${d.bloodPressure.systolic}/${d.bloodPressure.diastolic}` : '-'}</td>
          <td>${d.heartRate || '-'}</td>
        </tr>`).join('')}
        </table></body></html>`;

            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
            }
        } catch (error) {
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'Failed to generate report',
                buttons: [{ text: 'OK', style: 'primary', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setGeneratingPDF(false);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';

    // ============ CHART RENDERING ============
    const renderBloodSugarChart = () => {
        const trends = patientAnalytics?.trends?.bloodSugar || [];
        if (trends.length < 2) return null;

        const last7 = trends.slice(-7);
        const chartData = {
            labels: last7.map(t => { const d = new Date(t.date); return `${d.getMonth() + 1}/${d.getDate()}`; }),
            datasets: [{ data: last7.map(t => t.value || 100), color: (o = 1) => `rgba(52,152,219,${o})`, strokeWidth: 3 }]
        };

        return (
            <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                    <MaterialCommunityIcons name="chart-line" size={20} color="#3498DB" />
                    <Text style={styles.chartTitle}>Blood Sugar Trend (7 Days)</Text>
                </View>
                <LineChart
                    data={chartData}
                    width={width - 80}
                    height={180}
                    chartConfig={{
                        backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
                        decimalPlaces: 0, color: (o = 1) => `rgba(52,152,219,${o})`, labelColor: (o = 1) => `rgba(0,0,0,${o})`,
                        propsForDots: { r: '4', strokeWidth: '2', stroke: '#3498DB' }
                    }}
                    bezier style={styles.chart}
                />
                <Text style={styles.chartLegend}>{last7.length} readings</Text>
            </View>
        );
    };

    const renderBPChart = () => {
        const trends = patientAnalytics?.trends?.bloodPressure || [];
        if (trends.length < 2) return null;

        const last7 = trends.slice(-7);
        const chartData = {
            labels: last7.map(t => { const d = new Date(t.date); return `${d.getMonth() + 1}/${d.getDate()}`; }),
            datasets: [
                { data: last7.map(t => t.systolic || 120), color: (o = 1) => `rgba(52,152,219,${o})`, strokeWidth: 3 },
                { data: last7.map(t => t.diastolic || 80), color: (o = 1) => `rgba(155,89,182,${o})`, strokeWidth: 3 }
            ],
            legend: ['Systolic', 'Diastolic']
        };

        return (
            <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                    <MaterialCommunityIcons name="heart-pulse" size={20} color="#E74C3C" />
                    <Text style={styles.chartTitle}>Blood Pressure Trend (7 Days)</Text>
                </View>
                <LineChart
                    data={chartData}
                    width={width - 80}
                    height={180}
                    chartConfig={{
                        backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
                        decimalPlaces: 0, color: (o = 1) => `rgba(52,152,219,${o})`, labelColor: (o = 1) => `rgba(0,0,0,${o})`,
                        propsForDots: { r: '4', strokeWidth: '2' }
                    }}
                    bezier style={styles.chart}
                />
            </View>
        );
    };

    // ============ AI PREDICTION CARDS ============
    const renderGlucoseForecast = () => {
        const prediction = patientAnalytics?.predictions?.glucose?.prediction;
        if (!prediction) return (
            <View style={styles.predCard}>
                <View style={styles.predHeader}>
                    <MaterialCommunityIcons name="chart-line" size={24} color="#9B59B6" />
                    <Text style={styles.predTitle}>Glucose Forecast</Text>
                </View>
                <Text style={styles.noData}>Insufficient data for prediction</Text>
            </View>
        );

        return (
            <View style={styles.predCard}>
                <View style={styles.predHeader}>
                    <MaterialCommunityIcons name="chart-line" size={24} color="#9B59B6" />
                    <Text style={styles.predTitle}>Glucose Forecast</Text>
                    <View style={styles.aiBadge}><Text style={styles.aiText}>AI</Text></View>
                </View>
                <View style={styles.predHighlight}>
                    <Text style={styles.predLabel}>Predicted Glucose</Text>
                    <Text style={styles.predValue}>{Math.round(prediction.predicted_glucose_mgdl)} mg/dL</Text>
                </View>
                <View style={styles.predDetails}>
                    <View style={styles.predDetail}>
                        <Text style={styles.detailLabel}>Trend</Text>
                        <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>{prediction.trend || 'stable'}</Text>
                    </View>
                    <View style={styles.predDetail}>
                        <Text style={styles.detailLabel}>Risk Zone</Text>
                        <Text style={[styles.detailValue, { color: prediction.risk_zone === 'normal' ? '#27AE60' : '#E74C3C' }]}>
                            {prediction.risk_zone || 'normal'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderInsulinRecommendation = () => {
        const rec = patientAnalytics?.predictions?.insulin?.prediction;
        if (!rec) return null;

        const action = rec.action?.toLowerCase() || 'maintain';
        const color = action === 'increase' ? '#E74C3C' : action === 'decrease' ? '#F39C12' : '#27AE60';
        const icon = action === 'increase' ? 'arrow-up-circle' : action === 'decrease' ? 'arrow-down-circle' : 'checkmark-circle';

        return (
            <View style={[styles.predCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={styles.predHeader}>
                    <Ionicons name="medical" size={24} color={color} />
                    <Text style={styles.predTitle}>Insulin Dosage</Text>
                    <View style={[styles.aiBadge, { backgroundColor: color }]}><Text style={styles.aiText}>AI</Text></View>
                </View>
                <View style={styles.recommendationBox}>
                    <Ionicons name={icon} size={40} color={color} />
                    <Text style={[styles.recAction, { color }]}>{action.toUpperCase()}</Text>
                </View>
                <Text style={styles.recMessage}>{rec.explanation}</Text>
                {rec.current_dose && (
                    <View style={styles.doseRow}>
                        <Text style={styles.doseText}>Current: {rec.current_dose}u → Suggested: {rec.suggested_dose}u</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderHypertensionRisk = () => {
        const pred = patientAnalytics?.predictions?.hypertension?.prediction;
        if (!pred) return (
            <View style={styles.predCard}>
                <View style={styles.predHeader}>
                    <Ionicons name="heart-circle" size={24} color="#E74C3C" />
                    <Text style={styles.predTitle}>Hypertension Risk</Text>
                </View>
                <Text style={styles.noData}>Log BP readings to enable risk analysis</Text>
            </View>
        );

        const level = pred.risk_level?.toLowerCase() || 'low';
        const color = level.includes('high') || level.includes('critical') ? '#E74C3C' : level.includes('moderate') ? '#F39C12' : '#27AE60';

        return (
            <View style={[styles.predCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={styles.predHeader}>
                    <Ionicons name="heart-circle" size={24} color={color} />
                    <Text style={styles.predTitle}>Hypertension Risk</Text>
                    <View style={[styles.aiBadge, { backgroundColor: color }]}><Text style={styles.aiText}>AI</Text></View>
                </View>
                <View style={styles.riskBox}>
                    <Text style={[styles.riskLevel, { color }]}>{level.toUpperCase()} RISK</Text>
                    <Text style={styles.riskScore}>{((pred.risk_score || 0) * 100).toFixed(0)}%</Text>
                </View>
                <Text style={styles.recMessage}>{pred.explanation || pred.recommendation}</Text>
            </View>
        );
    };

    const renderBPForecast = () => {
        const pred = patientAnalytics?.predictions?.bp?.prediction;
        if (!pred) return (
            <View style={styles.predCard}>
                <View style={styles.predHeader}>
                    <MaterialCommunityIcons name="heart-pulse" size={24} color="#3498DB" />
                    <Text style={styles.predTitle}>BP Forecast</Text>
                </View>
                <Text style={styles.noData}>Log BP readings to enable forecast</Text>
            </View>
        );

        const level = pred.risk_level?.toLowerCase() || 'normal';
        const color = level.includes('stage') || level.includes('crisis') ? '#E74C3C' : level.includes('elevated') ? '#F39C12' : '#27AE60';

        return (
            <View style={[styles.predCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={styles.predHeader}>
                    <MaterialCommunityIcons name="heart-pulse" size={24} color={color} />
                    <Text style={styles.predTitle}>BP Forecast</Text>
                    <View style={[styles.aiBadge, { backgroundColor: color }]}><Text style={styles.aiText}>AI</Text></View>
                </View>
                <View style={styles.bpPredRow}>
                    <View style={styles.bpPredItem}>
                        <Text style={styles.bpPredLabel}>Systolic</Text>
                        <Text style={[styles.bpPredValue, { color }]}>{pred.predicted_systolic?.toFixed(0)}</Text>
                    </View>
                    <Text style={styles.bpDivider}>/</Text>
                    <View style={styles.bpPredItem}>
                        <Text style={styles.bpPredLabel}>Diastolic</Text>
                        <Text style={[styles.bpPredValue, { color }]}>{pred.predicted_diastolic?.toFixed(0)}</Text>
                    </View>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: color }]}>
                    <Text style={styles.riskBadgeText}>{level.replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                {pred.recommendation && <Text style={styles.recMessage}>{pred.recommendation}</Text>}
            </View>
        );
    };

    // ============ REQUEST MODAL CONTENT ============
    const renderRequestContent = () => {
        const { stats } = patientHealthData || {};
        return (
            <ScrollView style={styles.tabContent}>
                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>30-Day Health Summary</Text>
                    <View style={styles.cardsGrid}>
                        <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="document-text" size={28} color="#1E90FF" />
                            <Text style={styles.cardValue}>{stats?.totalRecords || 0}</Text>
                            <Text style={styles.cardLabel}>Total Readings</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
                            <MaterialCommunityIcons name="chart-line" size={28} color="#9C27B0" />
                            <Text style={styles.cardValue}>{stats?.avgFasting?.toFixed(0) || '0'}</Text>
                            <Text style={styles.cardLabel}>Avg Glucose</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
                            <Ionicons name="heart" size={28} color="#E74C3C" />
                            <Text style={styles.cardValue}>{stats?.avgSystolic?.toFixed(0) || '0'}</Text>
                            <Text style={styles.cardLabel}>Avg Systolic</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="heart" size={28} color="#FF9800" />
                            <Text style={styles.cardValue}>{stats?.avgDiastolic?.toFixed(0) || '0'}</Text>
                            <Text style={styles.cardLabel}>Avg Diastolic</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.reportsSection}>
                    <Text style={styles.sectionTitle}>Generate Reports</Text>
                    {['weekly', 'monthly'].map(type => (
                        <TouchableOpacity key={type} style={styles.reportRow} onPress={() => generateReport(type)} disabled={generatingPDF}>
                            <Ionicons name="document-text-outline" size={22} color="#3498DB" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.reportTitle}>{type === 'weekly' ? 'Weekly' : 'Monthly'} Report</Text>
                                <Text style={styles.reportSub}>Last {type === 'weekly' ? 7 : 30} days</Text>
                            </View>
                            <Ionicons name="download-outline" size={22} color="#3498DB" />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        );
    };

    // ============ PATIENT DASHBOARD TAB ============
    const renderDashboardTab = () => {
        const { latestReadings } = patientHealthData || {};
        return (
            <ScrollView style={styles.tabContent}>
                {/* Vitals Cards */}
                <View style={styles.vitalsRow}>
                    <View style={styles.vitalCard}>
                        <Ionicons name="water" size={22} color="#3498DB" />
                        <Text style={styles.vitalValue}>{latestReadings?.fasting?.value?.toFixed(0) || '--'}</Text>
                        <Text style={styles.vitalLabel}>Fasting</Text>
                    </View>
                    <View style={styles.vitalCard}>
                        <Ionicons name="heart" size={22} color="#E74C3C" />
                        <Text style={styles.vitalValue}>
                            {latestReadings?.systolic?.value && latestReadings?.diastolic?.value
                                ? `${Math.round(latestReadings.systolic.value)}/${Math.round(latestReadings.diastolic.value)}`
                                : '--'}
                        </Text>
                        <Text style={styles.vitalLabel}>BP</Text>
                    </View>
                    <View style={styles.vitalCard}>
                        <Ionicons name="pulse" size={22} color="#9B59B6" />
                        <Text style={styles.vitalValue}>{latestReadings?.heartRate?.value?.toFixed(0) || '--'}</Text>
                        <Text style={styles.vitalLabel}>HR</Text>
                    </View>
                </View>

                {/* Charts */}
                {renderBloodSugarChart()}
                {renderBPChart()}
            </ScrollView>
        );
    };

    // ============ PATIENT AI PREDICTIONS TAB ============
    const renderPredictionsTab = () => (
        <ScrollView style={styles.tabContent}>
            {renderGlucoseForecast()}
            {renderInsulinRecommendation()}
            {renderHypertensionRisk()}
            {renderBPForecast()}
        </ScrollView>
    );

    // ============ PATIENT REPORTS TAB ============
    const renderReportsTab = () => {
        const { stats } = patientHealthData || {};
        return (
            <ScrollView style={styles.tabContent}>
                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Health Summary</Text>
                    <View style={styles.cardsGrid}>
                        <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="document-text" size={28} color="#1E90FF" />
                            <Text style={styles.cardValue}>{stats?.totalRecords || 0}</Text>
                            <Text style={styles.cardLabel}>Records</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="water" size={28} color="#9C27B0" />
                            <Text style={styles.cardValue}>{stats?.avgFasting?.toFixed(0) || '0'}</Text>
                            <Text style={styles.cardLabel}>Avg Glucose</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
                            <Ionicons name="heart" size={28} color="#E74C3C" />
                            <Text style={styles.cardValue}>{stats?.avgSystolic?.toFixed(0) || '0'}/{stats?.avgDiastolic?.toFixed(0) || '0'}</Text>
                            <Text style={styles.cardLabel}>Avg BP</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="pulse" size={28} color="#27AE60" />
                            <Text style={styles.cardValue}>{stats?.avgHeartRate?.toFixed(0) || '0'}</Text>
                            <Text style={styles.cardLabel}>Avg HR</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.reportsSection}>
                    <Text style={styles.sectionTitle}>Download Reports</Text>
                    {['weekly', 'monthly'].map(type => (
                        <TouchableOpacity key={type} style={styles.reportRow} onPress={() => generateReport(type)} disabled={generatingPDF}>
                            <Ionicons name="document-text-outline" size={22} color="#3498DB" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.reportTitle}>{type === 'weekly' ? 'Weekly' : 'Monthly'} Report</Text>
                            </View>
                            <Ionicons name="download-outline" size={22} color="#3498DB" />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        );
    };

    const renderPatientTabs = () => (
        <View style={styles.modalTabs}>
            {[{ id: 'dashboard', icon: 'grid', label: 'Dashboard' }, { id: 'predictions', icon: 'analytics', label: 'AI Predictions' }, { id: 'reports', icon: 'document-text', label: 'Reports' }].map(tab => (
                <TouchableOpacity key={tab.id} style={[styles.modalTab, activeTab === tab.id && styles.modalTabActive]} onPress={() => setActiveTab(tab.id)}>
                    <Ionicons name={tab.icon} size={18} color={activeTab === tab.id ? '#3498DB' : '#666'} />
                    <Text style={[styles.modalTabText, activeTab === tab.id && styles.modalTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderRequestCard = ({ item }) => (
        <TouchableOpacity style={styles.requestCard} onPress={() => handleViewRequest(item)}>
            <View style={styles.requestBadge}><Ionicons name="person-add" size={12} color="#fff" /><Text style={styles.requestBadgeText}>New</Text></View>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.patientName?.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.patientName}>{item.patientName}</Text><Text style={styles.patientEmail}>{item.patientEmail}</Text></View>
            </View>
            <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewRequest(item)}>
                <Ionicons name="eye" size={16} color="#fff" /><Text style={styles.viewBtnText}>View & Respond</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderPatientCard = ({ item }) => (
        <TouchableOpacity style={styles.patientCard} onPress={() => handleViewPatient(item)}>
            <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: '#3498DB' }]}><Text style={styles.avatarText}>{item.patientName?.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.patientName}>{item.patientName}</Text><Text style={styles.patientEmail}>{item.patientEmail}</Text></View>
                <Ionicons name="checkmark-circle" size={22} color="#27AE60" />
            </View>
            <TouchableOpacity style={[styles.viewBtn, { backgroundColor: '#3498DB' }]} onPress={() => handleViewPatient(item)}>
                <Ionicons name="document-text" size={16} color="#fff" /><Text style={styles.viewBtnText}>View Dashboard</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderModal = () => {
        if (!selectedItem) return null;
        const isRequest = modalType === 'request';

        return (
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isRequest ? 'Patient Request' : selectedItem.patientName}</Text>
                            <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                        </View>
                        <View style={styles.patientInfoBar}>
                            <View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>{selectedItem.patientName?.charAt(0)}</Text></View>
                            <View><Text style={styles.patientInfoName}>{selectedItem.patientName}</Text><Text style={styles.patientInfoEmail}>{selectedItem.patientEmail}</Text></View>
                        </View>
                        {!isRequest && renderPatientTabs()}
                        {loadingData ? (
                            <View style={styles.modalLoading}><ActivityIndicator size="large" color="#3498DB" /><Text style={styles.loadingText}>Loading...</Text></View>
                        ) : (
                            <View style={styles.modalBody}>
                                {isRequest ? renderRequestContent() : (activeTab === 'dashboard' ? renderDashboardTab() : activeTab === 'predictions' ? renderPredictionsTab() : renderReportsTab())}
                            </View>
                        )}
                        <View style={styles.modalActions}>
                            {isRequest ? (
                                <>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}><Ionicons name="close-circle" size={18} color="#fff" /><Text style={styles.actionText}>Reject</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.actionText}>Accept</Text></TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.pdfBtn} onPress={() => generateReport('monthly')}><Ionicons name="download" size={18} color="#fff" /><Text style={styles.actionText}>PDF</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.endBtn} onPress={handleEndRelationship}><Ionicons name="person-remove" size={18} color="#fff" /><Text style={styles.actionText}>End Care</Text></TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <DoctorDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                navigation={navigation}
                currentScreen="DoctorPatients"
            />
            
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setDrawerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Feather name="menu" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>My Patients</Text>
                        <Text style={styles.headerSubtitle}>Manage patient requests & care</Text>
                    </View>
                </View>
            </View>
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#3498DB" /></View>
            ) : requests.length === 0 && patients.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialCommunityIcons name="account-group" size={60} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Patients Yet</Text>
                    <Text style={styles.emptyText}>Patient requests will appear here</Text>
                </View>
            ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}>
                    {requests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>📬 Pending Requests ({requests.length})</Text>
                            {requests.map(item => <View key={item._id}>{renderRequestCard({ item })}</View>)}
                        </View>
                    )}
                    {patients.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>Patients List ({patients.length})</Text>
                            {patients.map(item => <View key={item._id}>{renderPatientCard({ item })}</View>)}
                        </View>
                    )}
                </ScrollView>
            )}
            {renderModal()}
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
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
        color: '#333',
        fontFamily: 'Montserrat',
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#666',
        fontFamily: 'Montserrat',
        marginTop: 2,
    },
    title: { fontSize: 20, fontWeight: '700', color: '#333' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
    emptyText: { fontSize: 14, color: '#666', marginTop: 4 },
    section: { marginBottom: 20 },
    sectionHeader: { fontSize: 20, fontWeight: '700', color: '#333', marginLeft: 5, marginBottom: 10, marginTop:10 },
    requestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#F39C12' },
    requestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F39C12', alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, marginBottom: 10, gap: 4 },
    requestBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    patientCard: { backgroundColor: '#fff', borderRadius: 15, padding: 17, marginBottom: 18, borderWidth: 1, borderColor: '#E0E0E0' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F39C12', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
    patientName: { fontSize: 15, fontWeight: '600', color: '#333' },
    patientEmail: { fontSize: 12, color: '#888' },
    viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F39C12', borderRadius: 8, paddingVertical: 9, gap: 6 },
    viewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', minHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
    patientInfoBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F8F9FA' },
    smallAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3498DB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    smallAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    patientInfoName: { fontSize: 15, fontWeight: '600', color: '#333' },
    patientInfoEmail: { fontSize: 12, color: '#888' },
    modalTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    modalTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 5 },
    modalTabActive: { borderBottomWidth: 2, borderBottomColor: '#3498DB' },
    modalTabText: { fontSize: 12, color: '#666', fontWeight: '500' },
    modalTabTextActive: { color: '#3498DB', fontWeight: '600' },
    modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#888' },
    modalBody: { flex: 1 },
    modalActions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 10 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E74C3C', borderRadius: 10, paddingVertical: 12, gap: 5 },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27AE60', borderRadius: 10, paddingVertical: 12, gap: 5 },
    pdfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3498DB', borderRadius: 10, paddingVertical: 12, gap: 5 },
    endBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E74C3C', borderRadius: 10, paddingVertical: 12, gap: 5 },
    actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    tabContent: { flex: 1, padding: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
    summarySection: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14 },
    cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    summaryCard: { width: '48%', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    cardValue: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 6 },
    cardLabel: { fontSize: 11, color: '#666', marginTop: 2 },
    reportsSection: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
    reportRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, marginBottom: 8 },
    reportTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    reportSub: { fontSize: 11, color: '#888' },
    vitalsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    vitalCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
    vitalValue: { fontSize: 18, fontWeight: '700', color: '#333', marginVertical: 4 },
    vitalLabel: { fontSize: 11, color: '#666' },
    chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14 },
    chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    chartTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    chart: { marginLeft: -10, borderRadius: 12 },
    chartLegend: { textAlign: 'center', fontSize: 11, color: '#888', marginTop: 6 },
    predCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
    predHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    predTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
    aiBadge: { backgroundColor: '#9B59B6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    aiText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    noData: { color: '#888', fontSize: 13, fontStyle: 'italic' },
    predHighlight: { backgroundColor: '#F0E6FF', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    predLabel: { fontSize: 12, color: '#9B59B6' },
    predValue: { fontSize: 28, fontWeight: '700', color: '#333' },
    predDetails: { flexDirection: 'row', justifyContent: 'space-around' },
    predDetail: { alignItems: 'center' },
    detailLabel: { fontSize: 11, color: '#888' },
    detailValue: { fontSize: 15, fontWeight: '600', color: '#333' },
    recommendationBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 14, borderRadius: 10, marginBottom: 10, gap: 12 },
    recAction: { fontSize: 22, fontWeight: '700' },
    recMessage: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 8 },
    doseRow: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8 },
    doseText: { fontSize: 13, color: '#333' },
    riskBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    riskLevel: { fontSize: 18, fontWeight: '700' },
    riskScore: { fontSize: 14, color: '#666' },
    bpPredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    bpPredItem: { alignItems: 'center' },
    bpPredLabel: { fontSize: 11, color: '#888' },
    bpPredValue: { fontSize: 28, fontWeight: '700' },
    bpDivider: { fontSize: 28, fontWeight: '300', color: '#ccc', marginHorizontal: 10 },
    riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, marginBottom: 8 },
    riskBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

export default DoctorPatientsScreen;
