import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Caregiver Screens
import CaregiverDashboard from '../screens/caregiver/DashboardScreen';
import CaregiverPatients from '../screens/caregiver/PatientsScreen';
import CaregiverAlerts from '../screens/caregiver/AlertsScreen';

const Stack = createNativeStackNavigator();

const CaregiverStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboard} />
      <Stack.Screen name="CaregiverPatients" component={CaregiverPatients} />
      <Stack.Screen name="CaregiverAlerts" component={CaregiverAlerts} />
    </Stack.Navigator>
  );
};

export default CaregiverStackNavigator;
