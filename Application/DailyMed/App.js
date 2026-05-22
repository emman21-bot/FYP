import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import NotificationService from './src/services/notificationService';

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
    initializeApp();
  }, []);

  /**
   * Initialize app on startup
   * - Check authentication session
   * - Setup push notifications
   * - Configure notification listeners
   */
  const initializeApp = async () => {
    try {
      // Check session
      await checkSession();

      // Initialize push notifications (non-blocking)
      await initializeNotifications();
    } catch (error) {
      console.error('[App] Initialization error:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  /**
   * Check if user has valid session
   */
  const checkSession = async () => {
    try {
      const authData = await getAuthData();
      
      if (authData && authData.isValid && authData.user) {
        // Valid session exists - redirect to appropriate dashboard
        const { role } = authData.user;
        
        const dashboardMap = {
          patient: 'Dashboard',
          doctor: 'DoctorStack',
          caregiver: 'CaregiverStack',
        };
        
        const targetRoute = dashboardMap[role] || 'Login';
        
        setInitialRoute(targetRoute);
        setInitialParams({ user: authData.user });
      } else {
        // No valid session - show splash screens
        setInitialRoute('SplashScreen1');
      }
    } catch (error) {
      console.error('[App] Session check error:', error);
      setInitialRoute('SplashScreen1');
    }
  };

  /**
   * Setup push notifications
   * Runs in background and doesn't block app initialization
   */
  const initializeNotifications = async () => {
    try {
      // Initialize notification service
      const result = await NotificationService.initialize();

      if (!result.success) {
        console.warn('[App] Notification initialization warning:', result.message);
        return;
      }

      // Setup listener for notifications received in foreground
      const notificationListener = NotificationService.listenForNotifications((notification) => {
        handleNotificationReceived(notification);
      });

      // Setup listener for notification responses (user taps notification)
      const responseListener = NotificationService.listenForNotificationResponses((response) => {
        handleNotificationResponse(response);
      });

      // Cleanup listeners on app unmount (handled by React cleanup)
      return () => {
        NotificationService.removeListener(notificationListener);
        NotificationService.removeListener(responseListener);
      };
    } catch (error) {
      console.warn('[App] Notification setup error:', error);
      // Don't block app initialization if notifications fail
    }
  };

  /**
   * Handle incoming notification
   * Called when app receives notification while in foreground
   */
  const handleNotificationReceived = (notification) => {
    console.log('[App] Notification received:', notification.title);
    
    // Process notification based on type
    const { type, data } = notification;
    
    switch (type) {
      case 'medication_reminder':
        console.log('[App] Medication reminder:', data.medicationName);
        break;
      case 'appointment_reminder':
        console.log('[App] Appointment reminder:', data.appointmentTime);
        break;
      case 'abnormal_vitals':
        console.log('[App] Abnormal vitals alert:', data.vitalType);
        break;
      case 'doctor_request':
        console.log('[App] New doctor request from:', data.doctorName);
        break;
      default:
        console.log('[App] General notification:', notification.body);
    }
  };

  /**
   * Handle notification response
   * Called when user taps on a notification
   */
  const handleNotificationResponse = (response) => {
    console.log('[App] User tapped notification:', response.title);
    
    const { type, data } = response;
    
    // Navigate to appropriate screen based on notification type
    // This would be called with navigation object in production
    switch (type) {
      case 'medication_reminder':
        // Navigate to medications screen
        console.log('[App] Would navigate to Medications screen');
        break;
      case 'appointment_reminder':
        // Navigate to appointments screen
        console.log('[App] Would navigate to Appointments screen');
        break;
      case 'abnormal_vitals':
        // Navigate to health data/alerts screen
        console.log('[App] Would navigate to Alerts screen');
        break;
      case 'doctor_request':
        // Navigate to doctor requests screen
        console.log('[App] Would navigate to Doctor Requests screen');
        break;
      default:
        console.log('[App] Handle general notification response');
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
      <SafeAreaProvider>
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
      </SafeAreaProvider>
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
