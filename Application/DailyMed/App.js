import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SplashScreen1, SplashScreen2, SplashScreen3 } from './src/screens/splashscreens';
import { LoginScreen, RegisterScreen, ForgotPasswordScreen, OTPVerificationScreen, ResetPasswordScreen } from './src/screens/auth';
import { 
  DashboardScreen, 
  AIPredictionsScreen, 
  HealthDataScreen, 
  ReportsScreen, 
  AppointmentsScreen, 
  MedicationsScreen, 
  AlertsScreen,
  SettingsScreen,
  FindDoctorScreen,
  MyDoctorScreen 
} from './src/screens/patient';
import DoctorStackNavigator from './src/navigation/DoctorStackNavigator';
import CaregiverStackNavigator from './src/navigation/CaregiverStackNavigator';
import AdminDashboard from './src/screens/admin/dashboard';
import AdminUsers from './src/screens/admin/users';
import { getAuthData } from './src/utils/authStorage';
import { Colors } from './constants/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [initialRoute, setInitialRoute] = useState('SplashScreen1');
  const [initialParams, setInitialParams] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const authData = await getAuthData();
      
      console.log('App.js - Auth data:', JSON.stringify(authData, null, 2));
      
      if (authData && authData.isValid && authData.user) {
        // Valid session exists - redirect to appropriate dashboard
        const { role } = authData.user;
        console.log('App.js - User role from storage:', role);
        
        const dashboardMap = {
          patient: 'Dashboard',
          doctor: 'DoctorStack',
          caregiver: 'CaregiverStack',
        };
        
        const targetRoute = dashboardMap[role] || 'Login';
        console.log('App.js - Setting initial route to:', targetRoute);
        
        setInitialRoute(targetRoute);
        setInitialParams({ user: authData.user });
      } else {
        // No valid session - show splash screens
        setInitialRoute('SplashScreen1');
      }
    } catch (error) {
      console.error('Session check error:', error);
      setInitialRoute('SplashScreen1');
    } finally {
      setIsCheckingSession(false);
    }
  };

  if (!fontsLoaded || isCheckingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
        {/* Splash Screens */}
        <Stack.Screen name="SplashScreen1" component={SplashScreen1} />
        <Stack.Screen name="SplashScreen2" component={SplashScreen2} />
        <Stack.Screen name="SplashScreen3" component={SplashScreen3} />
        
        {/* Auth Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        {/* Patient Dashboard Screens */}
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          initialParams={initialParams}
        />
        <Stack.Screen name="AIPredictions" component={AIPredictionsScreen} />
        <Stack.Screen name="HealthData" component={HealthDataScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Appointments" component={AppointmentsScreen} />
        <Stack.Screen name="Medications" component={MedicationsScreen} />
        <Stack.Screen name="Alerts" component={AlertsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="FindDoctor" component={FindDoctorScreen} />
        <Stack.Screen name="MyDoctor" component={MyDoctorScreen} />
        
        {/* Admin Dashboard */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="AdminUsers" component={AdminUsers} />
        
        {/* Doctor Stack Navigator */}
        <Stack.Screen 
          name="DoctorStack" 
          component={DoctorStackNavigator}
        />
        
        {/* Caregiver Stack Navigator */}
        <Stack.Screen 
          name="CaregiverStack" 
          component={CaregiverStackNavigator}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}

// import React, { useState, useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
// import { View, ActivityIndicator } from 'react-native';
// import { SplashScreen1, SplashScreen2, SplashScreen3 } from './src/screens/splashscreens';
// import { LoginScreen, RegisterScreen, ForgotPasswordScreen, OTPVerificationScreen, ResetPasswordScreen } from './src/screens/auth';
// import PatientDashboard from './src/screens/patient/PatientDashboard';
// import MedicationsScreen from './src/screens/patient/MedicationsScreen';
// import ReportsScreen from './src/screens/patient/ReportsScreen';
// import AppointmentsScreen from './src/screens/patient/AppointmentsScreen';
// import AlertsScreen from './src/screens/patient/AlertsScreen';
// import DoctorDashboard from './src/screens/doctor/DoctorDashboard';
// import CaregiverDashboard from './src/screens/caregiver/CaregiverDashboard';
// import { getAuthData } from './src/utils/authStorage';
// import { Colors } from './constants/theme';

// const Stack = createNativeStackNavigator();

// export default function App() {
//   const [fontsLoaded] = useFonts({
//     Montserrat_400Regular,
//     Montserrat_500Medium,
//     Montserrat_600SemiBold,
//     Montserrat_700Bold,
//   });

//   const [isCheckingSession, setIsCheckingSession] = useState(true);
//   const [initialRoute, setInitialRoute] = useState('SplashScreen1');
//   const [initialParams, setInitialParams] = useState(null);

//   useEffect(() => {
//     checkSession();
//   }, []);

//   const checkSession = async () => {
//     try {
//       const authData = await getAuthData();
      
//       if (authData && authData.isValid && authData.user) {
//         // Valid session exists - redirect to appropriate dashboard
//         const { role } = authData.user;
//         const dashboardMap = {
//           patient: 'PatientDashboard',
//           doctor: 'DoctorDashboard',
//           caregiver: 'CaregiverDashboard',
//         };
        
//         setInitialRoute(dashboardMap[role] || 'Login');
//         setInitialParams({ user: authData.user });
//       } else {
//         // No valid session - show splash screens
//         setInitialRoute('SplashScreen1');
//       }
//     } catch (error) {
//       console.error('Session check error:', error);
//       setInitialRoute('SplashScreen1');
//     } finally {
//       setIsCheckingSession(false);
//     }
//   };

//   if (!fontsLoaded || isCheckingSession) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
//         <ActivityIndicator size="large" color={Colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         initialRouteName={initialRoute}
//         screenOptions={{
//           headerShown: false,
//           animation: 'fade',
//         }}
//       >
//         {/* Splash Screens */}
//         <Stack.Screen name="SplashScreen1" component={SplashScreen1} />
//         <Stack.Screen name="SplashScreen2" component={SplashScreen2} />
//         <Stack.Screen name="SplashScreen3" component={SplashScreen3} />
        
//         {/* Auth Screens */}
//         <Stack.Screen name="Login" component={LoginScreen} />
//         <Stack.Screen name="Register" component={RegisterScreen} />
//         <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
//         <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
//         <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

//         {/* Dashboard Screens */}
//         <Stack.Screen 
//           name="PatientDashboard" 
//           component={PatientDashboard}
//           initialParams={initialParams}
//         />
//         <Stack.Screen name="Medications" component={MedicationsScreen} />
//         <Stack.Screen name="Reports" component={ReportsScreen} />
//         <Stack.Screen name="Appointments" component={AppointmentsScreen} />
//         <Stack.Screen name="Alerts" component={AlertsScreen} />
//         <Stack.Screen 
//           name="DoctorDashboard" 
//           component={DoctorDashboard}
//           initialParams={initialParams}
//         />
//         <Stack.Screen 
//           name="CaregiverDashboard" 
//           component={CaregiverDashboard}
//           initialParams={initialParams}
//         />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }
