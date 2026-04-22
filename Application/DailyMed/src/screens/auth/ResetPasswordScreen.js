import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, BorderRadius, FontSizes, FontFamily, Layout, Shadows } from '../../../constants/theme';
import { authAPI } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

// Password validation function
const getPasswordValidation = (password) => {
  return {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};

const ResetPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    buttons: [],
  });

  // Password validation checks
  const passwordChecks = useMemo(() => getPasswordValidation(password), [password]);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleResetPassword = async () => {
    if (!isPasswordValid) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Invalid Password',
        message: 'Please ensure your password meets all requirements.',
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

    if (!passwordsMatch) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Passwords Don\'t Match',
        message: 'Please make sure both passwords are the same.',
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
      const response = await authAPI.resetPassword(email, password);
      
      if (response.success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Password Reset Successful!',
          message: 'Your password has been updated. Please login with your new password.',
          buttons: [
            {
              text: 'Login',
              onPress: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
              style: 'primary',
            },
          ],
        });
      }
    } catch (error) {
      // Handle errors gracefully
      let errorTitle = 'Reset Failed';
      let errorMessage = 'Failed to reset password. Please try again.';

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        
        if (error.response.status === 404) {
          errorTitle = 'User Not Found';
          errorMessage = 'No account found with this email.';
        } else if (error.response.status === 400) {
          errorTitle = 'Invalid Request';
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
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password for{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>
          </View>

          <View style={styles.form}>
            {/* New Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor={Colors.inputPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Password Validation */}
              {password.length > 0 && (
                <View style={styles.validationContainer}>
                  <View style={styles.validationRow}>
                    <Text style={passwordChecks.minLength ? styles.successIcon : styles.errorIcon}>
                      {passwordChecks.minLength ? '✓' : '✗'}
                    </Text>
                    <Text style={passwordChecks.minLength ? styles.successText : styles.errorText}>
                      At least 8 characters
                    </Text>
                  </View>
                  <View style={styles.validationRow}>
                    <Text style={passwordChecks.hasLowercase ? styles.successIcon : styles.errorIcon}>
                      {passwordChecks.hasLowercase ? '✓' : '✗'}
                    </Text>
                    <Text style={passwordChecks.hasLowercase ? styles.successText : styles.errorText}>
                      One lowercase letter
                    </Text>
                  </View>
                  <View style={styles.validationRow}>
                    <Text style={passwordChecks.hasUppercase ? styles.successIcon : styles.errorIcon}>
                      {passwordChecks.hasUppercase ? '✓' : '✗'}
                    </Text>
                    <Text style={passwordChecks.hasUppercase ? styles.successText : styles.errorText}>
                      One uppercase letter
                    </Text>
                  </View>
                  <View style={styles.validationRow}>
                    <Text style={passwordChecks.hasNumber ? styles.successIcon : styles.errorIcon}>
                      {passwordChecks.hasNumber ? '✓' : '✗'}
                    </Text>
                    <Text style={passwordChecks.hasNumber ? styles.successText : styles.errorText}>
                      One number
                    </Text>
                  </View>
                  <View style={styles.validationRow}>
                    <Text style={passwordChecks.hasSpecialChar ? styles.successIcon : styles.errorIcon}>
                      {passwordChecks.hasSpecialChar ? '✓' : '✗'}
                    </Text>
                    <Text style={passwordChecks.hasSpecialChar ? styles.successText : styles.errorText}>
                      One special character
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.inputPlaceholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>{showConfirmPassword ? '👁' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.validationMessage}>
                  <Text style={passwordsMatch ? styles.successIcon : styles.errorIcon}>
                    {passwordsMatch ? '✓' : '✗'}
                  </Text>
                  <Text style={passwordsMatch ? styles.successText : styles.errorText}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity
              style={[
                styles.resetButton,
                (!isPasswordValid || !passwordsMatch || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={!isPasswordValid || !passwordsMatch || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
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
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.lg,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  eyeText: {
    fontSize: 20,
  },
  validationContainer: {
    marginTop: 12,
    gap: 6,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  successIcon: {
    fontSize: 14,
    color: Colors.success,
    marginRight: 6,
  },
  successText: {
    fontSize: 13,
    color: Colors.success,
    fontFamily: FontFamily.regular,
  },
  resetButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    ...Shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
  },
});

export default ResetPasswordScreen;
