import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../../constants/theme';
import DoctorDrawer from '../../components/DoctorDrawer';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import { healthDataAPI } from '../../services/api';

/**
 * Doctor's Patients Screen
 * Displays list of patients associated with the doctor
 * Shows patient info, relationship status, and latest vitals
 */
const PatientsScreen = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  /**
   * Fetch doctor's active patients on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only fetch if last fetch was more than 5 seconds ago (avoid rapid refetches)
      if (now - lastFetchTime > 5000) {
        fetchPatients();
      }
    }, [lastFetchTime])
  );

  /**
   * Fetch doctor's patients from backend
   */
  const fetchPatients = async () => {
    try {
      setError(null);
      
      // Get active care relationships (patients)
      const response = await careRelationshipAPI.getDoctorPatients();
      
      if (response.success && Array.isArray(response.data)) {
        setPatients(response.data);
      } else {
        setPatients([]);
      }
      
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error('[PatientsScreen] Error fetching patients:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load patients');
      setPatients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients();
  }, []);

  /**
   * Navigate to patient detail screen
   */
  const handlePatientPress = (patient) => {
    navigation.navigate('PatientDetailScreen', {
      patientId: patient.patientId,
      patientName: patient.patientName,
      patientEmail: patient.patientEmail,
      relationshipId: patient._id,
    });
  };

  /**
   * Get status badge color based on relationship status
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#27AE60';
      case 'requested':
        return '#F39C12';
      case 'terminated':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  /**
   * Get status badge text
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'requested':
        return 'Pending';
      case 'terminated':
        return 'Ended';
      default:
        return status;
    }
  };

  /**
   * Render individual patient card
   */
  const PatientCard = ({ patient }) => {
    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => handlePatientPress(patient)}
        activeOpacity={0.7}
      >
        {/* Patient Header */}
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={50}
                color={Colors.primary}
              />
            </View>
            <View style={styles.nameSection}>
              <Text style={styles.patientName}>{patient.patientName}</Text>
              <Text style={styles.patientEmail}>{patient.patientEmail}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(patient.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(patient.status)}</Text>
          </View>
        </View>

        {/* Relationship Info */}
        <View style={styles.cardDetails}>
          {patient.approvedAt && (
            <View style={styles.detailRow}>
              <Feather name="calendar" size={14} color={Colors.primary} />
              <Text style={styles.detailText}>
                Connected on {new Date(patient.approvedAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {patient.notes && (
            <View style={styles.detailRow}>
              <Feather name="file-text" size={14} color={Colors.primary} />
              <Text style={styles.detailText} numberOfLines={1}>
                {patient.notes}
              </Text>
            </View>
          )}

          {!patient.approvedAt && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color="#F39C12"
              />
              <Text style={styles.detailText}>Awaiting approval</Text>
            </View>
          )}
        </View>

        {/* Action Arrow */}
        <View style={styles.arrowContainer}>
          <Feather name="chevron-right" size={20} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  if (!loading && patients.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

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

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={40} color="#E74C3C" />
              <Text style={styles.errorText}>Error loading patients</Text>
              <Text style={styles.errorSubtext}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchPatients()}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!error && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>No patients yet</Text>
              <Text style={styles.emptySubtext}>
                Patients will appear here once they request to be your patient
              </Text>
            </View>
          )}
        </ScrollView>

        <DoctorDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigation}
          currentScreen="DoctorPatients"
        />
      </SafeAreaView>
    );
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

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

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your patients...</Text>
        </View>

        <DoctorDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigation}
          currentScreen="DoctorPatients"
        />
      </SafeAreaView>
    );
  }

  /**
   * Main render - show patient list
   */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

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
            <Text style={styles.headerSubtitle}>{patients.length} patient(s)</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={patients}
        renderItem={({ item }) => <PatientCard patient={item} />}
        keyExtractor={(item) => item._id || item.patientId}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={40} color="#E74C3C" />
              <Text style={styles.errorText}>Error loading patients</Text>
              <Text style={styles.errorSubtext}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setLoading(true);
                  fetchPatients();
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <DoctorDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        currentScreen="DoctorPatients"
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    fontSize: 13,
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
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'Montserrat',
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: 'Montserrat',
  },
  patientEmail: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Montserrat',
  },
  cardDetails: {
    position: 'absolute',
    bottom: 15,
    left: 65,
    right: 40,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  arrowContainer: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
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
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
    fontFamily: 'Montserrat',
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
});

export default PatientsScreen;
