import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Expo app - use your computer's local network IP
const API_URL = 'http://192.168.1.71:5000/api';
const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [insulinRec, setInsulinRec] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [glucoseCardIndex, setGlucoseCardIndex] = useState(0); // 0=Fasting, 1=Random, 2=PostMeal
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const glucoseSwipeAnim = useRef(new Animated.Value(0)).current;
  
  // PanResponder for glucose card swipe
  const glucosePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe right - go to previous
          setGlucoseCardIndex(prev => Math.max(0, prev - 1));
        } else if (gestureState.dx < -50) {
          // Swipe left - go to next
          setGlucoseCardIndex(prev => Math.min(2, prev + 1));
        }
      }
    })
  ).current;

  useEffect(() => {
    // Add a small delay to prevent rapid requests on mount
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const authData = await AsyncStorage.getItem('@dailymed_token');
      
      if (!authData) {
        console.error('No auth data found');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Parse the stored auth data
      let token;
      try {
        const parsed = JSON.parse(authData);
        token = parsed.token || authData; // Use token from object or raw string
      } catch {
        token = authData; // If not JSON, use as is
      }
      
      if (!token) {
        console.error('No token in auth data');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fetch analytics with retry on 429
      try {
        const analyticsRes = await axios.get(`${API_URL}/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalytics(analyticsRes.data);
      } catch (analyticsError) {
        if (analyticsError.response?.status === 429) {
          console.log('Rate limited on analytics, will use cached data or retry later');
          // Don't throw, just skip this update
        } else {
          throw analyticsError;
        }
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch insulin recommendation with retry on 429
      try {
        const insulinRes = await axios.get(`${API_URL}/analytics/insulin-recommendation`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInsulinRec(insulinRes.data);
      } catch (insulinError) {
        if (insulinError.response?.status === 429) {
          console.log('Rate limited on insulin recommendation, will use cached data or retry later');
          // Don't throw, just skip this update
        } else {
          throw insulinError;
        }
      }

      // Fetch notification count
      try {
        const notifRes = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (notifRes.data.success) {
          const unread = notifRes.data.data.filter(n => !n.isRead).length;
          setNotificationCount(unread);
        }
      } catch (notifError) {
        console.log('Error fetching notification count:', notifError);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data);
      }
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
    fetchDashboardData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
      case 'optimal':
        return '#27AE60';
      case 'low':
      case 'elevated':
        return '#F39C12';
      case 'high':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal':
      case 'optimal':
        return 'checkmark-circle';
      case 'low':
      case 'elevated':
        return 'warning';
      case 'high':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const renderBloodSugarCard = () => {
    const data = analytics?.summary?.bloodSugar;
    if (!data) return null;

    const glucoseTypes = [
      { key: 'fasting', label: 'Fasting', value: data.fasting, count: data.fastingCount, context: 'Before eating' },
      { key: 'random', label: 'Random', value: data.random, count: data.randomCount, context: 'Any time' },
      { key: 'postMeal', label: 'After Meal', value: data.postMeal, count: data.postMealCount, context: '1-2 hrs after eating' }
    ];

    const currentType = glucoseTypes[glucoseCardIndex];
    
    const getGlucoseStatus = (value) => {
      if (!value) return { status: 'No Data', color: '#95A5A6' };
      if (value < 70) return { status: 'Low', color: '#E74C3C' };
      if (value <= 140) return { status: 'Normal', color: '#27AE60' };
      if (value <= 180) return { status: 'Elevated', color: '#F39C12' };
      return { status: 'High', color: '#E74C3C' };
    };

    const status = getGlucoseStatus(currentType.value);

    return (
      <View style={styles.healthCard} {...glucosePanResponder.panHandlers}>
        <View style={styles.cardHeader}>
          <Ionicons name="water" size={20} color={Colors.primary} />
          <Text style={styles.cardHeaderText}>Blood Sugar</Text>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.glucoseTypeLabel}>{currentType.label}</Text>
          
          {currentType.value ? (
            <>
              <View style={styles.valueRow}>
                <Text style={styles.mainValue}>{currentType.value}</Text>
                <Text style={styles.unitText}>mg/dL</Text>
              </View>
              <Text style={styles.contextLabel}>{currentType.context}</Text>
              
              <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                <Ionicons 
                  name={status.status === 'Low' || status.status === 'High' ? 'alert-circle' : status.status === 'Elevated' ? 'warning' : 'checkmark-circle'} 
                  size={14} 
                  color="#fff"
                />
                <Text style={styles.statusText}>{status.status}</Text>
              </View>

              <View style={styles.miniChart}>
                <Ionicons name="analytics-outline" size={16} color={Colors.primary} />
                <Text style={styles.miniChartText}>From {currentType.count} readings</Text>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="information-circle-outline" size={40} color="#95A5A6" />
              <Text style={styles.noDataText}>No {currentType.label.toLowerCase()} readings</Text>
            </View>
          )}
          
          {/* Swipe Indicators */}
          <View style={styles.swipeIndicators}>
            {glucoseTypes.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  { backgroundColor: index === glucoseCardIndex ? Colors.primary : '#E0E0E0' }
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderBloodPressureCard = () => {
    const data = analytics?.summary?.bloodPressure;

    return (
      <View style={styles.healthCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart" size={20} color="#E74C3C" />
          <Text style={styles.cardHeaderText}>Blood Pressure</Text>
        </View>
        
        <View style={styles.cardBody}>
          {data && (data.systolic || data.diastolic) ? (
            <>
              <View style={styles.valueRow}>
                <Text style={styles.mainValue}>{`${Math.round(data.systolic)}/${Math.round(data.diastolic)}`}</Text>
                <Text style={styles.unitText}>mmHg</Text>
              </View>
              <Text style={styles.contextLabel}>Resting</Text>
              
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(data.status) }]}>
                <Ionicons 
                  name={getStatusIcon(data.status)} 
                  size={14} 
                  color="#fff"
                />
                <Text style={styles.statusText}>
                  {data.status?.charAt(0).toUpperCase() + data.status?.slice(1)}
                </Text>
              </View>

              {/* Mini trend chart */}
              <View style={styles.miniChart}>
                <Ionicons name="pulse" size={16} color="#E74C3C" />
                <Text style={styles.miniChartText}>From {data.readingsCount} readings</Text>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="information-circle-outline" size={40} color="#95A5A6" />
              <Text style={styles.noDataText}>No blood pressure readings</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTodayVitals = () => {
    const { weight, temperature, heartRate } = analytics?.summary || {};
    const hasAnyVitals = weight || temperature || heartRate;

    return (
      <View style={styles.vitalsCard}>
        <Text style={styles.sectionTitle}>Today's Vitals</Text>
        
        {hasAnyVitals ? (
          <View style={styles.vitalsRow}>
            {temperature && (
              <View style={styles.vitalItem}>
                <View style={styles.vitalIconContainer}>
                  <Ionicons name="thermometer" size={20} color="#E67E22" />
                </View>
                <Text style={styles.vitalValue}>{`${temperature.value}°${temperature.unit}`}</Text>
              </View>
            )}
            
            {weight && (
              <View style={styles.vitalItem}>
                <View style={styles.vitalIconContainer}>
                  <Ionicons name="body" size={20} color="#9B59B6" />
                </View>
                <Text style={styles.vitalValue}>{`${weight.value} ${weight.unit}`}</Text>
              </View>
            )}
            
            {heartRate && (
              <View style={styles.vitalItem}>
                <View style={styles.vitalIconContainer}>
                  <Ionicons name="pulse" size={20} color="#E74C3C" />
                </View>
                <Text style={styles.vitalValue}>{`${heartRate.value} ${heartRate.unit}`}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={40} color="#95A5A6" />
            <Text style={styles.noDataText}>No vital signs recorded today</Text>
          </View>
        )}
      </View>
    );
  };

  const renderAIPredictionPreview = () => {
    const glucosePrediction = analytics?.predictions?.glucose;
    const hypertensionPrediction = analytics?.predictions?.hypertension;
    
    if (!glucosePrediction && !hypertensionPrediction) return null;

    return (
      <View style={styles.aiPreviewCard}>
        <View style={styles.aiPreviewHeader}>
          <MaterialCommunityIcons name="brain" size={20} color="#9B59B6" />
          <Text style={styles.aiPreviewTitle}>AI Predictions Preview</Text>
        </View>

        {glucosePrediction && (
          <View style={styles.aiPreviewContent}>
            <View style={styles.miniTrendLine}>
              <Ionicons name="trending-up" size={40} color="#9B59B6" style={styles.trendIcon} />
              <View style={styles.dotPattern}>
                <View style={[styles.dot, { opacity: 0.3 }]} />
                <View style={[styles.dot, { opacity: 0.5 }]} />
                <View style={[styles.dot, { opacity: 0.7 }]} />
                <View style={[styles.dot, { opacity: 1 }]} />
              </View>
            </View>
            <Text style={styles.aiPreviewMessage}>
              {glucosePrediction.trend === 'increasing' 
                ? 'Potential spike in 4 hours.\nConsider a light snack.' 
                : glucosePrediction.trend === 'decreasing'
                ? 'Glucose may drop in 4 hours.\nHave glucose tablets ready.'
                : 'Stable glucose expected.\nContinue current routine.'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AIPredictions')}>
              <Text style={styles.viewDetailsLink}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderInsulinDosageCard = () => {
    if (!insulinRec || !insulinRec.recommendation) return null;

    // Check if there's sufficient data (at least 3 days)
    const glucoseData = analytics?.trends?.bloodSugar || [];
    const uniqueDays = new Set(
      glucoseData.map(item => new Date(item.date).toDateString())
    ).size;
    
    // If less than 3 days of data, show message
    if (uniqueDays < 3 || insulinRec.recommendation.explanation?.includes('Insufficient health data')) {
      return (
        <View style={[styles.insulinCard, { borderLeftColor: '#95A5A6', borderLeftWidth: 4 }]}>
          <View style={styles.insulinHeader}>
            <MaterialCommunityIcons name="needle" size={24} color="#95A5A6" />
            <Text style={styles.insulinTitle}>Insulin Dosage Recommendation</Text>
            <View style={[styles.aiBadge, { backgroundColor: '#95A5A6' }]}>
              <MaterialCommunityIcons name="brain" size={12} color="#fff" />
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={50} color="#95A5A6" />
            <Text style={styles.noDataText}>Log at least 3 days of glucose readings to enable AI Insulin predictions</Text>
            {/* <TouchableOpacity 
              style={styles.logDataButton}
              onPress={() => navigation.navigate('HealthData')}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.logDataButtonText}>Log Health Data</Text>
            </TouchableOpacity> */}
          </View>
        </View>
      );
    }

    const action = insulinRec.recommendation.action?.toLowerCase() || 'maintain';
    
    const getRecommendationColor = (rec) => {
      switch (rec) {
        case 'increase': return '#E74C3C';
        case 'decrease': return '#F39C12';
        case 'maintain': return '#27AE60';
        default: return '#95A5A6';
      }
    };

    const getRecommendationIcon = (rec) => {
      switch (rec) {
        case 'increase': return 'arrow-up-circle';
        case 'decrease': return 'arrow-down-circle';
        case 'maintain': return 'checkmark-circle';
        default: return 'help-circle';
      }
    };

    const getActionText = (rec) => {
      switch (rec) {
        case 'increase': return 'INCREASE';
        case 'decrease': return 'DECREASE';
        case 'maintain': return 'MAINTAIN';
        default: return 'MONITOR';
      }
    };

    return (
      <View style={[styles.insulinCard, { borderLeftColor: getRecommendationColor(action), borderLeftWidth: 4 }]}>
        <View style={styles.insulinHeader}>
          <MaterialCommunityIcons name="needle" size={24} color={getRecommendationColor(action)} />
          <Text style={styles.insulinTitle}>Insulin Dosage Recommendation</Text>
          <View style={[styles.aiBadge, { backgroundColor: getRecommendationColor(action) }]}>
            <MaterialCommunityIcons name="brain" size={12} color="#fff" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        <View style={styles.insulinRecommendationRow}>
          <Ionicons 
            name={getRecommendationIcon(action)} 
            size={36} 
            color={getRecommendationColor(action)}
          />
          <Text style={[styles.insulinAction, { color: getRecommendationColor(action) }]}>
            {getActionText(action)}
          </Text>
        </View>

        <Text style={styles.insulinMessage}>{insulinRec.recommendation.explanation}</Text>

        {insulinRec.recommendation.predictedGlucose && (
          <View style={styles.insulinForecast}>
            <Text style={styles.forecastLabel}>Predicted Glucose</Text>
            <Text style={styles.forecastValue}>{insulinRec.recommendation.predictedGlucose} mg/dL</Text>
          </View>
        )}
        
        {insulinRec.recommendation.currentDose && (
          <View style={styles.insulinDoseInfo}>
            <Text style={styles.doseLabel}>Current: {insulinRec.recommendation.currentDose} units</Text>
            <Text style={styles.doseLabel}>Suggested: {insulinRec.recommendation.suggestedDose} units</Text>
          </View>
        )}
      </View>
    );
  };

  const renderGlucoseTrendGraph = () => {
    const glucoseTrends = analytics?.trends?.bloodSugar || [];

    // Get last 7 days
    const last7Days = glucoseTrends.slice(-7);

    const chartData = {
      labels: last7Days.map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: last7Days.map(item => item.value || 100), // Use actual glucose value
        color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
        strokeWidth: 3
      }],
      legend: ['Blood Sugar']
    };

    return (
      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <MaterialCommunityIcons name="chart-line" size={20} color="#3498DB" />
          <Text style={styles.trendTitle}>Blood Sugar Trend (7 Days)</Text>
        </View>
        
        {glucoseTrends.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={50} color="#95A5A6" />
            <Text style={styles.noDataText}>No glucose data to display trend</Text>
          </View>
        ) : (
          <>
            <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 100}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: '#3498DB'
            },
            propsForBackgroundLines: {
              strokeDasharray: '', 
              stroke: '#E8E8E8',
              strokeWidth: 1
            }
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          yAxisSuffix=" mg/dL"
          fromZero={false}
        />
        
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3498DB' }]} />
                <Text style={styles.legendText}>Glucose Level</Text>
              </View>
              <Text style={styles.legendSubtext}>{last7Days.length} readings in 7 days</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderBloodPressureTrendGraph = () => {
    const bpHistory = analytics?.trends?.bloodPressure || [];

    const chartData = {
      labels: bpHistory.slice(-7).map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: bpHistory.slice(-7).map(item => item.systolic),
          color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
          strokeWidth: 3
        },
        {
          data: bpHistory.slice(-7).map(item => item.diastolic),
          color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
          strokeWidth: 3
        }
      ],
      legend: ['Systolic', 'Diastolic']
    };

    return (
      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#3498DB" />
          <Text style={styles.trendTitle}>Blood Pressure Trend (7 Days)</Text>
        </View>
        
        {bpHistory.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={50} color="#95A5A6" />
            <Text style={styles.noDataText}>No blood pressure data to display trend</Text>
          </View>
        ) : (
          <>
            <LineChart
              data={chartData}
          width={Dimensions.get('window').width - 100}
          height={230}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '5',
              strokeWidth: '2'
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#E8E8E8',
              strokeWidth: 1
            }
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
        />
            
            {analytics?.predictions?.hypertension && (
              <View style={styles.predictionBadge}>
                <MaterialCommunityIcons name="brain" size={14} color="#9B59B6" />
                <Text style={styles.predictionText}>
                  {`Risk Level: ${analytics.predictions.hypertension.riskLevel} (${(analytics.predictions.hypertension.probability * 100).toFixed(1)}%)`}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        
        <CustomDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigation}
          currentScreen="Dashboard"
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
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>Your health overview</Text>
            </View>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="Dashboard"
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
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Your health overview</Text>
          </View>
        </View>
        
        {/* Bell Icon with Badge */}
        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => navigation.navigate('Alerts')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={28} color={Colors.primary} />
          {notificationCount > 0 && (
            <>
              {/* Blue indicator light */}
              <View style={styles.bellIndicator} />
              {/* Badge with count */}
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Page Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.cardsRow}>
          {renderBloodSugarCard()}
          {renderBloodPressureCard()}
        </View>

        {renderTodayVitals()}
        {renderAIPredictionPreview()}
        {renderInsulinDosageCard()}
        {renderGlucoseTrendGraph()}
        {renderBloodPressureTrendGraph()}

        {/* <TouchableOpacity 
          style={styles.aiPredictionsButton}
          onPress={() => navigation.navigate('AIPredictions')}
        >
          <MaterialCommunityIcons name="brain" size={24} color="#fff" />
          <Text style={styles.aiButtonText}>View Full AI Analysis</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity> */}

        <TouchableOpacity 
          style={styles.recordButton}
          onPress={() => navigation.navigate('HealthData')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.recordButtonText}>Log Health Data</Text>
        </TouchableOpacity>
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
  bellButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3498DB',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
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
    paddingTop: 200,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flex: 0.48,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
    fontFamily: 'Montserrat',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  valueNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  valueUnit: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 5,
    fontFamily: 'Montserrat',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  contextText: {
    fontSize: 11,
    color: '#95A5A6',
    fontFamily: 'Montserrat',
  },
  vitalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vitalItem: {
    alignItems: 'center',
  },
  vitalValue: {
    fontSize: 16,
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  vitalLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  aiPredictionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9B59B6',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    gap: 10,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    flex: 1,
    marginLeft: -10,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  cardHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
    fontFamily: 'Montserrat',
  },
  cardBody: {
    marginTop: 10,
  },
  mainValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  unitText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
    marginTop: 4,
  },
  contextLabel: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  glucoseTypeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  swipeIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  miniChartText: {
    fontSize: 11,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  vitalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
    fontFamily: 'Montserrat',
  },
  aiPreviewContent: {
    alignItems: 'center',
  },
  miniTrendLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  trendIcon: {
    opacity: 0.3,
  },
  dotPattern: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9B59B6',
  },
  aiPreviewMessage: {
    fontSize: 14,
    color: '#34495E',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Montserrat',
    marginBottom: 10,
  },
  viewDetailsLink: {
    fontSize: 14,
    color: '#9B59B6',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  insulinCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insulinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  insulinTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Montserrat',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  insulinRecommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  insulinAction: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  insulinMessage: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 20,
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  insulinForecast: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  forecastLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  forecastValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
    marginTop: 4,
  },
  insulinDoseInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  doseLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  trendCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
    fontFamily: 'Montserrat',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  predictionText: {
    fontSize: 13,
    color: '#6A4C93',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  legendSubtext: {
    fontSize: 11,
    color: '#95A5A6',
    fontFamily: 'Montserrat',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  logDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  logDataButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
});

export default DashboardScreen;