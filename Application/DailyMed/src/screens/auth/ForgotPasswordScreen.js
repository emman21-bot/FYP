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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, BorderRadius, FontSizes, FontFamily, Layout, Shadows } from '../../../constants/theme';
import { authAPI } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    buttons: [],
  });

  const isEmailValid = validateEmail(email);

  const handleSendOTP = async () => {
    if (!isEmailValid) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
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
      const response = await authAPI.forgotPassword(email.toLowerCase());
      
      if (response.success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'OTP Sent!',
          message: 'A password reset code has been sent to your email.',
          buttons: [
            {
              text: 'Continue',
              onPress: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.navigate('OTPVerification', {
                  email: email.toLowerCase(),
                  flow: 'forgotPassword',
                });
              },
              style: 'primary',
            },
          ],
        });
      }
    } catch (error) {
      // Handle errors gracefully
      let errorTitle = 'Request Failed';
      let errorMessage = 'Failed to send password reset code. Please try again.';

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        
        if (error.response.status === 404) {
          errorTitle = 'Account Not Found';
          errorMessage = 'No account found with this email address. Please check your email or register.';
        }
      } else if (error.request) {
        errorTitle = 'Connection Error';
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
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
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Don't worry! Enter your email address and we'll send you a code to reset your password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  email && !isEmailValid && styles.inputError
                ]}
                placeholder="Enter your email"
                placeholderTextColor={Colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {email && !isEmailValid && (
                <View style={styles.validationMessage}>
                  <Text style={styles.errorIcon}>✗</Text>
                  <Text style={styles.errorText}>Please enter a valid email address</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isEmailValid || isLoading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSendOTP}
              disabled={!isEmailValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Send Code</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
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
  form: {
    marginTop: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
  },
  inputError: {
    borderColor: Colors.error,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 14,
    color: Colors.error,
    marginRight: 6,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    fontFamily: FontFamily.regular,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  loginText: {
    color: Colors.textMedium,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
});

export default ForgotPasswordScreen;
