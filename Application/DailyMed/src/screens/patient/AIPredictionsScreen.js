import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Colors } from '../../../constants/theme';
import CustomDrawer from '../../components/CustomDrawer';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.71:5000/api';
const { width } = Dimensions.get('window');

const AIPredictionsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [insulinRec, setInsulinRec] = useState(null);
  const [glucosePrediction, setGlucosePrediction] = useState(null);
  const [hypertensionPrediction, setHypertensionPrediction] = useState(null);
  const [bpPrediction, setBpPrediction] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
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
        token = parsed.token || authData;
      } catch {
        token = authData;
      }
      
      if (!token) {
        console.error('No token in auth data');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fetch all predictions in parallel
      const [analyticsRes, insulinRes, glucoseRes, hypertensionRes, bpRes] = await Promise.allSettled([
        axios.get(`${API_URL}/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/analytics/insulin-recommendation`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/analytics/glucose-prediction`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/analytics/hypertension-prediction`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/analytics/bp-prediction`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (insulinRes.status === 'fulfilled') setInsulinRec(insulinRes.value.data);
      if (glucoseRes.status === 'fulfilled') setGlucosePrediction(glucoseRes.value.data);
      if (hypertensionRes.status === 'fulfilled') setHypertensionPrediction(hypertensionRes.value.data);
      if (bpRes.status === 'fulfilled') setBpPrediction(bpRes.value.data);
      
    } catch (error) {
      console.error('Error fetching predictions:', error);
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPredictions();
  };

  const renderGlucoseForecast = () => {
    if (!glucosePrediction || !glucosePrediction.prediction) {
      return (
        <View style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-line" size={28} color="#9B59B6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Glucose Forecast</Text>
              <Text style={styles.cardSubtitle}>Next 6 hours AI prediction</Text>
            </View>
          </View>
          <Text style={styles.noDataMessage}>
            Log at least 3 glucose readings to enable AI forecast
          </Text>
        </View>
      );
    }

    const prediction = glucosePrediction.prediction;
    const forecast = prediction.forecast_6h_mgdl || [];

    const chartData = {
      labels: ['Now', '+2h', '+4h', '+6h'],
      datasets: [{
        data: forecast.length >= 4 ? [
          forecast[0]?.glucose || 100,
          forecast[Math.floor(forecast.length * 0.33)]?.glucose || 110,
          forecast[Math.floor(forecast.length * 0.66)]?.glucose || 120,
          forecast[forecast.length - 1]?.glucose || 130
        ] : [100, 110, 120, 130]
      }]
    };

    return (
      <View style={styles.predictionCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="chart-line" size={28} color="#9B59B6" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Glucose Forecast</Text>
            <Text style={styles.cardSubtitle}>Next 6 hours AI prediction</Text>
          </View>
          <View style={styles.aiBadge}>
            <MaterialCommunityIcons name="brain" size={16} color="#fff" />
            <Text style={styles.aiText}>AI</Text>
          </View>
        </View>
        
        <View style={styles.forecastHighlight}>
          <Text style={styles.forecastLabel}>Predicted Glucose</Text>
          <Text style={styles.forecastMainValue}>{`${Math.round(prediction.predicted_glucose_mgdl)} mg/dL`}</Text>
        </View>

        <LineChart
          data={chartData}
          width={width - 60}
          height={200}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: '#9B59B6'
            }
          }}
          bezier
          style={styles.chart}
        />
        
        <View style={styles.forecastDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Trend</Text>
            <Text style={[styles.detailValue, {textTransform: 'capitalize'}]}>{prediction.trend || 'stable'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Risk Zone</Text>
            <Text style={[styles.detailValue, { color: prediction.risk_zone === 'normal' ? '#27AE60' : '#E74C3C', textTransform: 'capitalize' }]}>
              {prediction.risk_zone || 'normal'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInsulinRecommendation = () => {
    if (!insulinRec || !insulinRec.recommendation) {
      return (
        <View style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="medical" size={28} color="#95A5A6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Insulin Dosage</Text>
              <Text style={styles.cardSubtitle}>AI-powered recommendation</Text>
            </View>
            <View style={[styles.aiBadge, { backgroundColor: '#95A5A6' }]}>
              <MaterialCommunityIcons name="brain" size={16} color="#fff" />
              <Text style={styles.aiText}>AI</Text>
            </View>
          </View>
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={60} color="#95A5A6" />
            <Text style={styles.noDataMessage}>
              Log at least 3 days of glucose readings to enable AI Insulin predictions
            </Text>
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

    // Check if there's sufficient data (at least 3 days)
    const glucoseData = analytics?.trends?.bloodSugar || [];
    const uniqueDays = new Set(
      glucoseData.map(item => new Date(item.date).toDateString())
    ).size;
    
    // If less than 3 days of data or explanation mentions insufficient data
    if (uniqueDays < 3 || insulinRec.recommendation.explanation?.includes('Insufficient health data')) {
      return (
        <View style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="medical" size={28} color="#95A5A6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Insulin Dosage</Text>
              <Text style={styles.cardSubtitle}>AI-powered recommendation</Text>
            </View>
            <View style={[styles.aiBadge, { backgroundColor: '#95A5A6' }]}>
              <MaterialCommunityIcons name="brain" size={16} color="#fff" />
              <Text style={styles.aiText}>AI</Text>
            </View>
          </View>
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={60} color="#95A5A6" />
            <Text style={styles.noDataMessage}>
              Log at least 3 days of glucose readings to enable AI Insulin predictions
            </Text>
            <TouchableOpacity 
              style={styles.logDataButton}
              onPress={() => navigation.navigate('HealthData')}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.logDataButtonText}>Log Health Data</Text>
            </TouchableOpacity>
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

    return (
      <View style={[styles.predictionCard, { borderLeftWidth: 5, borderLeftColor: getRecommendationColor(action) }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical" size={28} color={getRecommendationColor(action)} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Insulin Dosage</Text>
            <Text style={styles.cardSubtitle}>AI-powered recommendation</Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: getRecommendationColor(action) }]}>
            <MaterialCommunityIcons name="brain" size={16} color="#fff" />
            <Text style={styles.aiText}>AI</Text>
          </View>
        </View>
        
        <View style={styles.recommendationBox}>
          <Ionicons 
            name={getRecommendationIcon(action)} 
            size={50} 
            color={getRecommendationColor(action)}
          />
          <Text style={[styles.recommendationAction, { color: getRecommendationColor(action) }]}>
            {action.toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.recommendationMessage}>{insulinRec.recommendation.explanation}</Text>
        
        {insulinRec.recommendation.predictedGlucose && (
          <View style={styles.forecastBox}>
            <Text style={styles.forecastLabel}>Predicted Glucose</Text>
            <Text style={styles.forecastValue}>{`${insulinRec.recommendation.predictedGlucose} mg/dL`}</Text>
          </View>
        )}

        {insulinRec.recommendation.currentDose && (
          <View style={styles.doseComparisonBox}>
            <View style={styles.doseColumn}>
              <Text style={styles.doseLabel}>Current Dose</Text>
              <Text style={styles.doseValue}>{insulinRec.recommendation.currentDose} units</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#95A5A6" />
            <View style={styles.doseColumn}>
              <Text style={styles.doseLabel}>Suggested Dose</Text>
              <Text style={styles.doseValue}>{insulinRec.recommendation.suggestedDose} units</Text>
            </View>
          </View>
        )}
        
        <Text style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#95A5A6" />
          {' Always consult your healthcare provider before adjusting medication.'}
        </Text>
      </View>
    );
  };

  const renderHypertensionRisk = () => {
    if (!hypertensionPrediction || !hypertensionPrediction.prediction) {
      return (
        <View style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle" size={28} color="#E74C3C" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Hypertension Risk</Text>
              <Text style={styles.cardSubtitle}>AI analysis</Text>
            </View>
          </View>
          <Text style={styles.noDataMessage}>
            Log blood pressure readings to enable risk analysis
          </Text>
        </View>
      );
    }

    const prediction = hypertensionPrediction.prediction;
    
    const getRiskColor = (riskLevel) => {
      if (!riskLevel) return '#95A5A6';
      const level = riskLevel.toLowerCase();
      if (level === 'high' || level === 'critical') return '#E74C3C';
      if (level === 'moderate' || level === 'medium') return '#F39C12';
      if (level === 'low' || level === 'minimal') return '#27AE60';
      return '#95A5A6';
    };

    const riskLevel = prediction.risk_level || 'low';
    const riskScore = prediction.risk_score || 0;

    return (
      <View style={[styles.predictionCard, { borderLeftWidth: 5, borderLeftColor: getRiskColor(riskLevel) }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart-circle" size={28} color={getRiskColor(riskLevel)} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Hypertension Risk</Text>
            <Text style={styles.cardSubtitle}>AI analysis based on your data</Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: getRiskColor(riskLevel) }]}>
            <MaterialCommunityIcons name="brain" size={16} color="#fff" />
            <Text style={styles.aiText}>AI</Text>
          </View>
        </View>
        
        <View style={styles.riskBox}>
          <Text style={[styles.riskLevel, { color: getRiskColor(riskLevel) }]}>
            {riskLevel.toUpperCase()} RISK
          </Text>
          <Text style={styles.riskScore}>
            {`Risk Score: ${(riskScore * 100).toFixed(1)}%`}
          </Text>
        </View>
        
        <Text style={styles.recommendationMessage}>
          {prediction.explanation || 'No recommendation available'}
        </Text>

        {prediction.recommendation && (
          <View style={styles.recommendationHighlight}>
            <Ionicons name="medical" size={20} color={getRiskColor(riskLevel)} />
            <Text style={styles.recommendationText}>
              {prediction.recommendation}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderBPPrediction = () => {
    if (!bpPrediction || !bpPrediction.prediction) {
      return (
        <View style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={28} color="#3498DB" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Blood Pressure Forecast</Text>
              <Text style={styles.cardSubtitle}>Next reading prediction</Text>
            </View>
          </View>
          <Text style={styles.noDataMessage}>
            Log at least 3 BP readings to enable forecast
          </Text>
        </View>
      );
    }

    const prediction = bpPrediction.prediction;
    
    const getRiskColor = (riskLevel) => {
      if (!riskLevel) return '#95A5A6';
      const level = riskLevel.toLowerCase();
      if (level.includes('crisis')) return '#C0392B';
      if (level.includes('stage_2') || level.includes('stage 2')) return '#E74C3C';
      if (level.includes('stage_1') || level.includes('stage 1')) return '#E67E22';
      if (level.includes('elevated')) return '#F39C12';
      if (level.includes('normal')) return '#27AE60';
      return '#95A5A6';
    };

    const getTrendIcon = (trend) => {
      if (!trend) return 'trending-neutral';
      const trendLower = trend.toLowerCase();
      if (trendLower.includes('increasing')) return 'trending-up';
      if (trendLower.includes('decreasing')) return 'trending-down';
      return 'trending-neutral';
    };

    const getTrendColor = (trend) => {
      if (!trend) return '#95A5A6';
      const trendLower = trend.toLowerCase();
      if (trendLower.includes('increasing')) return '#E74C3C';
      if (trendLower.includes('decreasing')) return '#27AE60';
      return '#3498DB';
    };

    const predictedSystolic = prediction.predicted_systolic || 0;
    const predictedDiastolic = prediction.predicted_diastolic || 0;
    const confidence = prediction.confidence || 0;
    const trend = prediction.trend || 'stable';
    const riskLevel = prediction.risk_level || 'normal';

    return (
      <View style={[styles.predictionCard, { borderLeftWidth: 5, borderLeftColor: getRiskColor(riskLevel) }]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="heart-pulse" size={28} color={getRiskColor(riskLevel)} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Blood Pressure Forecast</Text>
            <Text style={styles.cardSubtitle}>Statistical trend prediction</Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: getRiskColor(riskLevel) }]}>
            <MaterialCommunityIcons name="chart-line-variant" size={16} color="#fff" />
            <Text style={styles.aiText}>AI</Text>
          </View>
        </View>
        
        <View style={styles.forecastHighlight}>
          <View style={styles.bpPredictionRow}>
            <View style={styles.bpPredictionValue}>
              <Text style={styles.forecastLabel}>Predicted Systolic</Text>
              <Text style={[styles.forecastMainValue, { color: getRiskColor(riskLevel) }]}>
                {predictedSystolic.toFixed(0)}
              </Text>
              <Text style={styles.forecastUnit}>mmHg</Text>
            </View>
            
            <View style={styles.bpDivider} />
            
            <View style={styles.bpPredictionValue}>
              <Text style={styles.forecastLabel}>Predicted Diastolic</Text>
              <Text style={[styles.forecastMainValue, { color: getRiskColor(riskLevel) }]}>
                {predictedDiastolic.toFixed(0)}
              </Text>
              <Text style={styles.forecastUnit}>mmHg</Text>
            </View>
          </View>
        </View>

        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons 
              name={getTrendIcon(trend)} 
              size={24} 
              color={getTrendColor(trend)} 
            />
            <Text style={[styles.metadataLabel, { color: getTrendColor(trend) }]}>
              {trend.charAt(0).toUpperCase() + trend.slice(1)}
            </Text>
          </View>
          
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="chart-bell-curve" size={24} color="#3498DB" />
            <Text style={styles.metadataLabel}>
              {(confidence * 100).toFixed(0)}% Confidence
            </Text>
          </View>
        </View>

        <View style={[styles.riskBox, { backgroundColor: getRiskColor(riskLevel) + '10' }]}>
          <Text style={[styles.riskLevel, { color: getRiskColor(riskLevel) }]}>
            {riskLevel.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
        
        {prediction.recommendation && (
          <View style={styles.recommendationHighlight}>
            <Ionicons name="medical" size={20} color={getRiskColor(riskLevel)} />
            <Text style={styles.recommendationText}>{prediction.recommendation}</Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#95A5A6" />
          {' Prediction based on historical trends. Actual values may vary.'}
        </Text>
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
          currentScreen="AIPredictions"
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
              <Text style={styles.headerTitle}>AI Predictions</Text>
              <Text style={styles.headerSubtitle}>Intelligent health insights</Text>
            </View>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading AI predictions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasNoPredictions = !analytics?.predictions?.glucose && !insulinRec && !analytics?.predictions?.hypertension;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="AIPredictions"
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
            <Text style={styles.headerTitle}>AI Predictions</Text>
            <Text style={styles.headerSubtitle}>Intelligent health insights</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {hasNoPredictions ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="brain" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No predictions available</Text>
            <Text style={styles.emptySubtext}>AI analysis will appear here as data is collected</Text>
            <TouchableOpacity 
              style={styles.recordButton}
              onPress={() => navigation.navigate('HealthData')}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.recordButtonText}>Log Health Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderBPPrediction()}
            {renderHypertensionRisk()}
            {renderInsulinRecommendation()}
            {renderGlucoseForecast()}
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
    paddingTop: 200,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 200,
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
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  predictionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  aiBadge: {
    backgroundColor: '#9B59B6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  aiText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
  },
  forecastDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    gap: 15,
  },
  recommendationAction: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  recommendationMessage: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
    marginBottom: 15,
    fontFamily: 'Montserrat',
  },
  forecastBox: {
    backgroundColor: '#E8F4FD',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  forecastLabel: {
    fontSize: 14,
    color: '#4A90E2',
    fontFamily: 'Montserrat',
  },
  forecastValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  doseComparisonBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  doseColumn: {
    alignItems: 'center',
  },
  doseLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
    marginBottom: 5,
  },
  doseValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  disclaimer: {
    fontSize: 12,
    color: '#95A5A6',
    fontStyle: 'italic',
    lineHeight: 18,
    fontFamily: 'Montserrat',
  },
  forecastHighlight: {
    backgroundColor: '#F0E6FF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  forecastMainValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9B59B6',
    fontFamily: 'Montserrat',
  },
  noDataMessage: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  logDataButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  recommendationHighlight: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  riskBox: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  riskLevel: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    marginBottom: 10,
  },
  riskScore: {
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: 'Montserrat',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  bpPredictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  bpPredictionValue: {
    alignItems: 'center',
    flex: 1,
  },
  bpDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  metadataItem: {
    alignItems: 'center',
    gap: 6,
  },
  metadataLabel: {
    fontSize: 13,
    color: '#34495E',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
});

export default AIPredictionsScreen;