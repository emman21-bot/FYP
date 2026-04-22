import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DoctorProfileScreen = ({ route, navigation }) => {
  const { doctor } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <Ionicons name="person-circle" size={100} color="#4A90E2" />
        </View>
        
        <Text style={styles.doctorName}>
          Dr. {doctor.fullName || doctor.email}
        </Text>
        
        {doctor.doctorProfile?.specialization && (
          <Text style={styles.specialization}>
            {doctor.doctorProfile.specialization}
          </Text>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>{doctor.email}</Text>
          </View>
          
          {doctor.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#4A90E2" />
              <Text style={styles.infoText}>{doctor.phone}</Text>
            </View>
          )}
        </View>
        
        {doctor.doctorProfile && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Professional Details</Text>
            
            {doctor.doctorProfile.licenseNumber && (
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={20} color="#4A90E2" />
                <Text style={styles.infoText}>
                  License: {doctor.doctorProfile.licenseNumber}
                </Text>
              </View>
            )}
            
            {doctor.doctorProfile.yearsOfExperience && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#4A90E2" />
                <Text style={styles.infoText}>
                  {doctor.doctorProfile.yearsOfExperience} years of experience
                </Text>
              </View>
            )}
            
            {doctor.doctorProfile.hospital && (
              <View style={styles.infoRow}>
                <Ionicons name="business" size={20} color="#4A90E2" />
                <Text style={styles.infoText}>{doctor.doctorProfile.hospital}</Text>
              </View>
            )}
            
            {doctor.doctorProfile.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#4A90E2" />
                <Text style={styles.infoText}>{doctor.doctorProfile.address}</Text>
              </View>
            )}
          </View>
        )}
        
        {doctor.doctorProfile?.bio && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{doctor.doctorProfile.bio}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center'
  },
  profileIcon: {
    marginBottom: 15
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  specialization: {
    fontSize: 16,
    color: '#E8F4FD',
    fontWeight: '600'
  },
  content: {
    padding: 20
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
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
    marginLeft: 15,
    fontSize: 15,
    color: '#34495E',
    flex: 1
  },
  bioText: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22
  }
});

export default DoctorProfileScreen;
