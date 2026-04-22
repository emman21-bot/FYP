import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Doctor Screens
import DoctorDashboard from '../screens/doctor/DashboardScreen';
import DoctorReports from '../screens/doctor/ReportsScreen';
import DoctorAppointments from '../screens/doctor/AppointmentsScreen';
import DoctorAlerts from '../screens/doctor/AlertsScreen';
import DoctorProfile from '../screens/doctor/DoctorProfileScreen';
import DoctorPatientsScreen from '../screens/doctor/DoctorPatientsScreen';

const Stack = createNativeStackNavigator();

const DoctorStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboard} />
      <Stack.Screen name="DoctorProfile" component={DoctorProfile} />
      <Stack.Screen name="DoctorReports" component={DoctorReports} />
      <Stack.Screen name="DoctorAppointments" component={DoctorAppointments} />
      <Stack.Screen name="DoctorPatients" component={DoctorPatientsScreen} />
      <Stack.Screen name="DoctorAlerts" component={DoctorAlerts} />
    </Stack.Navigator>
  );
};

export default DoctorStackNavigator;
