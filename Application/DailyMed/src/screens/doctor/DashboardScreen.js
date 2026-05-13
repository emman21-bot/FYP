import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import DoctorDrawer from '../../components/DoctorDrawer';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.71:5000/api';

const DashboardScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    alertPatients: [],
    upcomingAppointments: [],
    todayAppointments: [],
    totalPatients: 0,
    pendingRequests: 0,
  });
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@dailymed_token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch care relationships (patients)
      const careResponse = await careRelationshipAPI.getCareRelationships();
      const activePatients = careResponse.data?.filter(rel => rel.status === 'active') || [];
      const pendingRequests = careResponse.data?.filter(rel => rel.status === 'requested') || [];

      // Fetch appointments
      const appointmentsResponse = await axios.get(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const appointments = appointmentsResponse.data?.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime() && apt.status !== 'cancelled';
      });

      const upcomingAppointments = appointments
        .filter(apt => {
          const aptDate = new Date(apt.appointmentDate);
          return aptDate >= today && 
                 apt.status !== 'cancelled' && 
                 apt.status !== 'completed' && 
                 apt.status !== 'declined';
        })
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
        .slice(0, 5);

      // Fetch health data for alert patients (patients with concerning metrics)
      const alertPatients = [];
      for (const patient of activePatients.slice(0, 10)) { // Check first 10 patients
        try {
          // Fetch patient's analytics data (same as patient dashboard)
          const analyticsResponse = await axios.get(`${API_URL}/analytics/patient-dashboard/${patient.patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const analytics = analyticsResponse.data;
          const alerts = [];
          
          if (analytics?.summary) {
            const { bloodSugar, bloodPressure } = analytics.summary;
            
            // Check blood sugar using SAME logic as patient dashboard
            if (bloodSugar) {
              const checkGlucose = (value, type) => {
                if (!value) return null;
                if (value < 70) {
                  return {
                    type: 'glucose',
                    level: 'critical',
                    message: `Critical Low ${type}: ${value} mg/dL`
                  };
                } else if (value > 180) {
                  return {
                    type: 'glucose',
                    level: 'critical',
                    message: `High ${type}: ${value} mg/dL`
                  };
                } else if (value > 140) {
                  return {
                    type: 'glucose',
                    level: 'warning',
                    message: `Elevated ${type}: ${value} mg/dL`
                  };
                }
                return null;
              };
              
              // Check all glucose types
              const fastingAlert = checkGlucose(bloodSugar.fasting, 'Fasting');
              const randomAlert = checkGlucose(bloodSugar.random, 'Random');
              const postMealAlert = checkGlucose(bloodSugar.postMeal, 'Post-Meal');
              
              if (fastingAlert) alerts.push(fastingAlert);
              if (randomAlert) alerts.push(randomAlert);
              if (postMealAlert) alerts.push(postMealAlert);
            }
            
            // Check blood pressure using backend status
            if (bloodPressure && bloodPressure.status) {
              if (bloodPressure.status === 'high' || bloodPressure.status === 'elevated') {
                alerts.push({
                  type: 'bloodPressure',
                  level: bloodPressure.status === 'high' ? 'critical' : 'warning',
                  message: `${bloodPressure.status.charAt(0).toUpperCase() + bloodPressure.status.slice(1)} BP: ${Math.round(bloodPressure.systolic)}/${Math.round(bloodPressure.diastolic)} mmHg`
                });
              }
            }
          }
          
          // If patient has any alerts, add them to the list
          if (alerts.length > 0) {
            const highestLevel = alerts.some(a => a.level === 'critical') ? 'critical' : 'warning';
            const combinedMessage = alerts.map(a => a.message).join(' | ');
            
            alertPatients.push({
              ...patient,
              alertType: alerts[0].type,
              alertMessage: combinedMessage,
              alertLevel: highestLevel,
              alertCount: alerts.length
            });

            // Create notification for this alert
            try {
              await axios.post(`${API_URL}/notifications`, {
                patientId: patient.patientId,
                type: 'health_alert',
                title: `${highestLevel === 'critical' ? '🔴 Critical' : '⚠️ Warning'} Alert: ${patient.name}`,
                message: combinedMessage,
                priority: highestLevel === 'critical' ? 'high' : 'medium',
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (notifError) {
              console.log('Error creating notification:', notifError);
            }
          }
        } catch (error) {
          console.log(`Error fetching health data for patient ${patient.patientId}`);
        }
      }

      // Fetch notification count
      try {
        const notifResponse = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (notifResponse.data.success) {
          const unread = notifResponse.data.data.filter(n => !n.isRead).length;
          console.log('✅ Notification count fetched:', unread);
          setNotificationCount(unread);
        }
      } catch (error) {
        console.log('❌ Error fetching notification count:', error.message);
      }

      setDashboardData({
        alertPatients: alertPatients.slice(0, 5),
        upcomingAppointments,
        todayAppointments,
        totalPatients: activePatients.length,
        pendingRequests: pendingRequests.length,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderAlertsCard = () => {
    const { alertPatients } = dashboardData;
    const criticalCount = alertPatients.filter(p => p.alertLevel === 'critical').length;
    const warningCount = alertPatients.filter(p => p.alertLevel === 'warning').length;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => {
          if (alertPatients.length > 0) {
            navigation.navigate('DoctorPatients');
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="alert-circle" size={24} color="#E74C3C" />
          </View>
          <Text style={styles.cardTitle}>Patient Alerts</Text>
        </View>
        
        {alertPatients.length > 0 ? (
          <View style={styles.cardContent}>
            <View style={styles.alertStats}>
              {criticalCount > 0 && (
                <View style={[styles.alertBadge, styles.criticalBadge]}>
                  <Ionicons name="warning" size={16} color="#fff" />
                  <Text style={styles.alertBadgeText}>{criticalCount} Critical</Text>
                </View>
              )}
              {warningCount > 0 && (
                <View style={[styles.alertBadge, styles.warningBadge]}>
                  <Ionicons name="alert" size={16} color="#fff" />
                  <Text style={styles.alertBadgeText}>{warningCount} Warning</Text>
                </View>
              )}
            </View>
            
            <View style={styles.alertList}>
              {alertPatients.slice(0, 3).map((patient, index) => (
                <View key={patient._id || index} style={styles.alertItem}>
                  <View style={[
                    styles.alertDot, 
                    { backgroundColor: patient.alertLevel === 'critical' ? '#E74C3C' : '#F39C12' }
                  ]} />
                  <View style={styles.alertItemContent}>
                    <Text style={styles.alertPatientName}>{patient.patientName}</Text>
                    <Text style={styles.alertMessage}>{patient.alertMessage}</Text>
                  </View>
                </View>
              ))}
            </View>
            
            {alertPatients.length > 3 && (
              <Text style={styles.moreText}>+{alertPatients.length - 3} more alerts</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyCardContent}>
            <Ionicons name="checkmark-circle" size={40} color="#27AE60" />
            <Text style={styles.emptyText}>No alerts</Text>
            <Text style={styles.emptySubtext}>All patients stable</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAppointmentsCard = () => {
    const { upcomingAppointments } = dashboardData;
    const nextAppointment = upcomingAppointments[0];

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DoctorAppointments')}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="calendar" size={24} color="#3498DB" />
          </View>
          <Text style={styles.cardTitle}>Appointments</Text>
        </View>
        
        {nextAppointment ? (
          <View style={styles.cardContent}>
            <Text style={styles.appointmentLabel}>Next Appointment</Text>
            <Text style={styles.appointmentPatient}>{nextAppointment.patientName}</Text>
            <View style={styles.appointmentDetails}>
              <View style={styles.appointmentDetailRow}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.appointmentDetailText}>
                  {new Date(nextAppointment.appointmentDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.appointmentDetailRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.appointmentDetailText}>
                  {nextAppointment.timeSlot?.startTime}
                </Text>
              </View>
            </View>
            
            {upcomingAppointments.length > 1 && (
              <Text style={styles.moreText}>+{upcomingAppointments.length - 1} more upcoming</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyCardContent}>
            <Ionicons name="calendar-outline" size={40} color="#BDC3C7" />
            <Text style={styles.emptyText}>No appointments</Text>
            <Text style={styles.emptySubtext}>Schedule is clear</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPatientsCard = () => {
    const { totalPatients, pendingRequests } = dashboardData;

    return (
      <TouchableOpacity 
        style={styles.wideCard} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DoctorPatients')}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="people" size={24} color="#9B59B6" />
          </View>
          <Text style={styles.cardTitle}>Patients Overview</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPatients}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>{pendingRequests}</Text>
              {pendingRequests > 0 && (
                <View style={styles.notificationDot} />
              )}
            </View>
            <Text style={styles.statLabel}>New Requests</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTodayScheduleCard = () => {
    const { todayAppointments } = dashboardData;
    const completedToday = todayAppointments.filter(apt => apt.status === 'completed').length;
    const pendingToday = todayAppointments.filter(apt => apt.status === 'approved' || apt.status === 'pending').length;

    return (
      <View style={styles.wideCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="today" size={24} color="#16A085" />
          </View>
          <Text style={styles.cardTitle}>Today's Schedule</Text>
        </View>
        
        <View style={styles.scheduleContent}>
          <View style={styles.scheduleStats}>
            <View style={styles.scheduleStatItem}>
              <Text style={styles.scheduleStatValue}>{todayAppointments.length}</Text>
              <Text style={styles.scheduleStatLabel}>Total</Text>
            </View>
            <View style={styles.scheduleStatItem}>
              <Text style={[styles.scheduleStatValue, { color: '#27AE60' }]}>{completedToday}</Text>
              <Text style={styles.scheduleStatLabel}>Completed</Text>
            </View>
            <View style={styles.scheduleStatItem}>
              <Text style={[styles.scheduleStatValue, { color: '#F39C12' }]}>{pendingToday}</Text>
              <Text style={styles.scheduleStatLabel}>Pending</Text>
            </View>
          </View>

          {todayAppointments.length > 0 ? (
            <View style={styles.timelineContainer}>
              {todayAppointments.slice(0, 3).map((apt, index) => (
                <View key={apt._id || index} style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: apt.status === 'completed' ? '#27AE60' : '#3498DB' }
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTime}>{apt.timeSlot?.startTime}</Text>
                    <Text style={styles.timelinePatient}>{apt.patientName}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySchedule}>
              <Text style={styles.emptyScheduleText}>No appointments scheduled for today</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('🔔 Current notificationCount:', notificationCount);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <DoctorDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="DoctorDashboard"
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
            <Text style={styles.headerSubtitle}>Overview of your practice</Text>
          </View>
        </View>
        
        {/* Bell Icon with Badge */}
        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => navigation.navigate('DoctorAlerts')}
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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Top Row: Alerts and Appointments */}
        <View style={styles.cardRow}>
          {renderAlertsCard()}
          {renderAppointmentsCard()}
        </View>

        {/* Patients Overview */}
        {renderPatientsCard()}

        {/* Today's Schedule */}
        {renderTodayScheduleCard()}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DoctorPatients')}
            >
              <Ionicons name="people-outline" size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>View Patients</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DoctorAppointments')}
            >
              <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>Appointments</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DoctorProfile')}
            >
              <Ionicons name="person-outline" size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>My Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DoctorAlerts')}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 15,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  wideCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  cardContent: {
    marginTop: 5,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
    fontFamily: 'Montserrat',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  alertStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  criticalBadge: {
    backgroundColor: '#E74C3C',
  },
  warningBadge: {
    backgroundColor: '#F39C12',
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  alertList: {
    marginTop: 5,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  alertItemContent: {
    flex: 1,
  },
  alertPatientName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  alertMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  moreText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 10,
    fontFamily: 'Montserrat',
  },
  appointmentLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  appointmentPatient: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  appointmentDetails: {
    gap: 8,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentDetailText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValueContainer: {
    position: 'relative',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'Montserrat',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontFamily: 'Montserrat',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
    borderWidth: 2,
    borderColor: '#fff',
  },
  scheduleContent: {
    marginTop: 5,
  },
  scheduleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 15,
  },
  scheduleStatItem: {
    alignItems: 'center',
  },
  scheduleStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'Montserrat',
  },
  scheduleStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  timelineContainer: {
    marginTop: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Montserrat',
  },
  timelinePatient: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  emptySchedule: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyScheduleText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 15,
    fontFamily: 'Montserrat',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickActionText: {
    fontSize: 13,
    color: Colors.textDark,
    marginTop: 8,
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
});

export default DashboardScreen;