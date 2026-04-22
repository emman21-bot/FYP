import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, BorderRadius, FontSizes, FontFamily, Layout, Shadows } from '../../../constants/theme';
import { authAPI } from '../../services/api';
import { saveAuthData } from '../../utils/authStorage';
import CustomAlert from '../../components/CustomAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    buttons: [],
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter both email and password',
        buttons: [
          {
            text: 'OK',
            onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
            style: 'primary',
          },
        ],
      });
      return;
    }

    // Check for admin credentials before API call
    const ADMIN_EMAIL = 'admin@dailymed.com';
    const ADMIN_PASSWORD = 'Admin@2025';
    
    if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsLoading(true);
      
      // Store admin token (special token for admin)
      const adminToken = 'admin-special-token-dailymed-2025';
      const adminUser = {
        id: 'admin',
        username: 'admin',
        email: ADMIN_EMAIL,
        role: 'admin',
        isVerified: true,
      };
      
      await saveAuthData(adminToken, adminUser);
      
      // Small delay for UX
      setTimeout(() => {
        setIsLoading(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminDashboard' }],
        });
      }, 500);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.login(email.toLowerCase(), password);
      
      console.log('Login response:', JSON.stringify(response, null, 2));
      console.log('User role:', response.data?.user?.role);
      
      if (response.success) {
        // Check for account warning status
        if (response.accountWarning?.hasWarning) {
          setAlertConfig({
            visible: true,
            type: 'warning',
            title: 'Account Warning',
            message: response.accountWarning.message,
            buttons: [
              {
                text: 'OK',
                onPress: () => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  // Navigate after user acknowledges warning
                  const dashboardMap = {
                    patient: 'Dashboard',
                    doctor: 'DoctorStack',
                    caregiver: 'CaregiverStack',
                  };
                  const dashboardScreen = dashboardMap[response.data.user.role];
                  if (dashboardScreen) {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: dashboardScreen }],
                    });
                  }
                },
                style: 'primary',
              },
            ],
          });
          return;
        }

        // Navigate based on role from backend
        const dashboardMap = {
          patient: 'Dashboard',
          doctor: 'DoctorStack',
          caregiver: 'CaregiverStack',
        };

        const dashboardScreen = dashboardMap[response.data.user.role];
        
        console.log('Dashboard screen to navigate:', dashboardScreen);
        
        if (dashboardScreen) {
          navigation.reset({
            index: 0,
            routes: [{ name: dashboardScreen }],
          });
        } else {
          setAlertConfig({
            visible: true,
            type: 'error',
            title: 'Error',
            message: 'Invalid user role',
            buttons: [
              {
                text: 'OK',
                onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
                style: 'primary',
              },
            ],
          });
        }
      }
    } catch (error) {
      const errorData = error.response?.data;
      
      // Handle suspended account (403 status with suspended status)
      if (error.response?.status === 403 && errorData?.accountStatus === 'suspended') {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Account Suspended',
          message: errorData.message || 'Your account has been suspended. Please contact customer support for assistance.',
          buttons: [
            {
              text: 'OK',
              onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
              style: 'primary',
            },
          ],
        });
        return;
      }
      
      // Handle unverified account (403 status) - Don't log as error
      if (error.response?.status === 403 && errorData?.isVerified === false) {
        setAlertConfig({
          visible: true,
          type: 'warning',
          title: 'Account Not Verified',
          message: 'Account not verified. A verification OTP has been sent to your email.',
          buttons: [
            {
              text: 'Verify Now',
              onPress: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                // OTP already sent by backend, just navigate
                navigation.navigate('OTPVerification', {
                  email: errorData.email || email.toLowerCase(),
                  flow: 'unverified',
                });
              },
              style: 'primary',
            },
          ],
        });
        return; // Exit without logging error
      }
      
      // Log other errors only in development
      if (__DEV__) {
        console.log('Login error:', error.response?.status || error.message);
      }
      
      let errorTitle = 'Login Failed';
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.response) {
        errorMessage = errorData?.message || 'Invalid email or password. Please check your credentials.';
        
        if (error.response.status === 401) {
          errorTitle = 'Invalid Credentials';
          errorMessage = 'The email or password you entered is incorrect. Please try again.';
        } else if (error.response.status === 404) {
          errorTitle = 'Account Not Found';
          errorMessage = 'No account found with this email. Please register first.';
        } else if (error.response.status === 429) {
          errorTitle = 'Too Many Attempts';
          errorMessage = errorData?.message || 'Too many login attempts. Please try again later.';
        }
      } else if (error.request) {
        errorTitle = 'Connection Error';
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      }

      setAlertConfig({
        visible: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        buttons: [
          {
            text: 'OK',
            onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
            style: 'primary',
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.scrollContent}>
          {/* Back Button */}
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.inputPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!email || !password) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Layout.topMargin,
    paddingBottom: Layout.bottomSpacing,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    ...Shadows.small,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.inputText,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    height: Layout.inputHeight,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    height: Layout.inputHeight,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.inputText,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  eyeIcon: {
    paddingHorizontal: 16,
    height: Layout.inputHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 22,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.1,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Shadows.medium,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.gray300,
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: FontFamily.regular,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 15,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.2,
  },
});

export default LoginScreen;
