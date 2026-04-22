import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, BorderRadius, FontSizes, FontFamily, Layout, Shadows } from '../../../constants/theme';
import { authAPI } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, username, role, flow = 'registration' } = route.params || {};
  // flow can be: 'registration', 'unverified', 'forgotPassword'
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    buttons: [],
  });

  // Timer for enabling resend button
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanResend(true);
    }, 60000); // 60 seconds

    return () => clearTimeout(timer);
  }, [canResend]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Invalid OTP',
        message: 'Please enter all 6 digits',
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

    setIsLoading(true);
    try {
      let response;
      
      if (flow === 'forgotPassword') {
        // Use separate verification endpoint for password reset
        response = await authAPI.verifyResetOTP(email, otp);
      } else {
        // Regular OTP verification for registration/unverified login
        response = await authAPI.verifyOTP(email, otp);
      }
      
      if (response.success) {
        if (flow === 'forgotPassword') {
          // Navigate to reset password screen
          setAlertConfig({
            visible: true,
            type: 'success',
            title: 'Verified!',
            message: 'Please enter your new password.',
            buttons: [
              {
                text: 'Continue',
                onPress: () => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  navigation.navigate('ResetPassword', { email });
                },
                style: 'primary',
              },
            ],
          });
        } else {
          // Registration or unverified login - go to dashboard
          setAlertConfig({
            visible: true,
            type: 'success',
            title: 'Email Verified!',
            message: 'Your account has been verified successfully.',
            buttons: [
              {
                text: 'Continue',
                onPress: () => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  // Navigate to appropriate dashboard based on role
                  const dashboardMap = {
                    patient: 'Dashboard',
                    doctor: 'DoctorStack',
                    caregiver: 'CaregiverStack',
                  };
                  
                  navigation.reset({
                    index: 0,
                    routes: [{ name: dashboardMap[response.data.user.role] || 'Login' }],
                  });
                },
                style: 'primary',
              },
            ],
          });
        }
      }
    } catch (error) {
      // Don't log errors to console - handle them gracefully
      let errorMessage = 'Verification failed. Please try again.';
      let errorTitle = 'Verification Failed';
      
      // Handle specific error codes
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        if (status === 403) {
          errorTitle = 'Account Not Verified';
          errorMessage = message || 'Please verify your account first.';
        } else if (status === 429) {
          errorTitle = 'Too Many Attempts';
          errorMessage = message || 'Too many attempts. Please wait a moment before trying again.';
        } else if (status === 400) {
          errorTitle = 'Invalid OTP';
          errorMessage = message || 'The OTP you entered is incorrect. Please try again.';
        } else {
          errorMessage = message || errorMessage;
        }
      } else if (error.message === 'Network Error') {
        errorTitle = 'Connection Error';
        errorMessage = 'Please check your internet connection and try again.';
      }
      
      setAlertConfig({
        visible: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              setAlertConfig({ ...alertConfig, visible: false });
              setOtp(''); // Clear OTP field on error
            },
            style: 'primary',
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    try {
      const response = await authAPI.resendOTP(email);
      
      if (response.success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'OTP Sent',
          message: 'A new verification code has been sent to your email.',
          buttons: [
            {
              text: 'OK',
              onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
              style: 'primary',
            },
          ],
        });
        setOtp('');
        setCanResend(false);
      }
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Resend Failed',
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
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {flow === 'forgotPassword' ? 'Reset Password' : 'Verify Email'}
            </Text>
            <Text style={styles.subtitle}>
              {flow === 'forgotPassword' 
                ? 'Enter the OTP sent to your email to reset your password'
                : 'Enter the OTP sent to'
              }
              {flow !== 'forgotPassword' && (
                <>
                  {'\n'}
                  <Text style={styles.email}>{email}</Text>
                </>
              )}
            </Text>
            {flow === 'forgotPassword' && (
              <Text style={[styles.email, { marginTop: 4 }]}>{email}</Text>
            )}
          </View>

          {/* OTP Input */}
          <View style={styles.form}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="• • • • • •"
              placeholderTextColor={Colors.inputPlaceholder}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={!canResend || isResending}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (!canResend || isResending) && styles.resendDisabled,
                  ]}
                >
                  {isResending ? 'Sending...' : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (isLoading || otp.length !== 6) && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={isLoading || otp.length !== 6}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Layout.topMargin,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.textMedium,
    lineHeight: 22,
  },
  email: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  form: {
    marginTop: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  otpInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.semiBold,
    color: Colors.textDark,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: Spacing.md,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  resendText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textMedium,
  },
  resendLink: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  resendDisabled: {
    color: Colors.textLight,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
  },
});

export default OTPVerificationScreen;
