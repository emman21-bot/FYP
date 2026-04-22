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
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, BorderRadius, FontFamily, Layout, Shadows } from '../../../constants/theme';
import { authAPI } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  return {
    minLength: username.length >= 3,
    maxLength: username.length <= 20,
    validChars: /^[a-zA-Z0-9_]+$/.test(username),
  };
};

const getPasswordValidation = (password) => {
  return {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};

const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Registration form, 2: OTP verification
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState(''); // patient, doctor, caregiver
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    buttons: [],
  });

  // Validation checks
  const usernameChecks = useMemo(() => validateUsername(username), [username]);
  const isUsernameValid = Object.values(usernameChecks).every(Boolean);
  const passwordChecks = useMemo(() => getPasswordValidation(password), [password]);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const isEmailValid = validateEmail(email);
  
  const isFormValid = username && isUsernameValid && 
                      email && isEmailValid && 
                      password && isPasswordValid && 
                      confirmPassword && 
                      password === confirmPassword && 
                      role && 
                      agreeToTerms;

  const handleRegister = async () => {
    if (!isFormValid) return;
    
    setIsLoading(true);
    try {
      const userData = {
        username,
        email: email.toLowerCase(),
        password,
        role: role.toLowerCase(),
      };

      const response = await authAPI.register(userData);
      
      if (response.success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Registration Successful!',
          message: 'A verification code has been sent to your email. Please check your inbox.',
          buttons: [
            {
              text: 'Continue',
              onPress: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.navigate('OTPVerification', {
                  email: email.toLowerCase(),
                  username,
                  role: role.toLowerCase(),
                });
              },
              style: 'primary',
            },
          ],
        });
      }
    } catch (error) {
      // Don't log errors to console - handle them gracefully
      let errorTitle = 'Registration Failed';
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.response) {
        // Server responded with error
        const { data, status } = error.response;
        errorMessage = data?.message || errorMessage;
        
        // Handle specific validation errors
        if (data?.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.map(err => err.message).join('\n');
        }
        
        // Handle specific error cases
        if (status === 429) {
          errorTitle = 'Too Many Attempts';
          errorMessage = data?.message || 'Too many registration attempts. Please try again later.';
        } else if (status === 400) {
          if (errorMessage.toLowerCase().includes('email')) {
            errorTitle = 'Email Already Registered';
            errorMessage = 'This email is already registered. Please login or use a different email.';
          } else if (errorMessage.toLowerCase().includes('username')) {
            errorTitle = 'Username Taken';
            errorMessage = 'This username is already taken. Please choose a different username.';
          }
        }
      } else if (error.request) {
        // Request made but no response
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Back Button - only for step 2 */}
          {step === 2 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}

          <Animated.View style={{ opacity: fadeAnim }}>
            {step === 1 ? (
              // Registration Form
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Register to get started</Text>
              </View>

              <View style={styles.form}>
                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={[
                      styles.input,
                      username && !isUsernameValid && styles.inputError
                    ]}
                    placeholder="Enter your username"
                    placeholderTextColor={Colors.inputPlaceholder}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {username && (
                    <View style={styles.validationContainer}>
                      <View style={styles.validationRow}>
                        <Text style={usernameChecks.minLength ? styles.successIcon : styles.errorIcon}>
                          {usernameChecks.minLength ? '✓' : '✗'}
                        </Text>
                        <Text style={usernameChecks.minLength ? styles.successText : styles.errorText}>
                          At least 3 characters
                        </Text>
                      </View>
                      <View style={styles.validationRow}>
                        <Text style={usernameChecks.maxLength ? styles.successIcon : styles.errorIcon}>
                          {usernameChecks.maxLength ? '✓' : '✗'}
                        </Text>
                        <Text style={usernameChecks.maxLength ? styles.successText : styles.errorText}>
                          Maximum 20 characters
                        </Text>
                      </View>
                      <View style={styles.validationRow}>
                        <Text style={usernameChecks.validChars ? styles.successIcon : styles.errorIcon}>
                          {usernameChecks.validChars ? '✓' : '✗'}
                        </Text>
                        <Text style={usernameChecks.validChars ? styles.successText : styles.errorText}>
                          Only letters, numbers, and underscores
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Email Input */}
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
                  {email && isEmailValid && (
                    <View style={styles.validationMessage}>
                      <Text style={styles.successIcon}>✓</Text>
                      <Text style={styles.successText}>Valid email</Text>
                    </View>
                  )}
                </View>

                {/* Role Dropdown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>I am a</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  >
                    <Text style={[styles.dropdownText, !role && styles.placeholderText]}>
                      {role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'Select your role'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{showRoleDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  
                  {showRoleDropdown && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setRole('patient');
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>🏥 Patient</Text>
                        {role === 'patient' && <Text style={styles.checkIcon}>✓</Text>}
                      </TouchableOpacity>
                      
                      <View style={styles.dropdownDivider} />
                      
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setRole('doctor');
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>👨‍⚕️ Doctor</Text>
                        {role === 'doctor' && <Text style={styles.checkIcon}>✓</Text>}
                      </TouchableOpacity>
                      
                      <View style={styles.dropdownDivider} />
                      
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setRole('caregiver');
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>👤 Caregiver</Text>
                        {role === 'caregiver' && <Text style={styles.checkIcon}>✓</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
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
                  
                  {/* Password Strength Indicators */}
                  {password && (
                    <View style={styles.passwordChecks}>
                      <View style={styles.checkRow}>
                        <Text style={passwordChecks.minLength ? styles.checkIconGreen : styles.checkIconRed}>
                          {passwordChecks.minLength ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.checkText, passwordChecks.minLength && styles.checkTextSuccess]}>
                          At least 8 characters
                        </Text>
                      </View>
                      
                      <View style={styles.checkRow}>
                        <Text style={passwordChecks.hasLowercase ? styles.checkIconGreen : styles.checkIconRed}>
                          {passwordChecks.hasLowercase ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.checkText, passwordChecks.hasLowercase && styles.checkTextSuccess]}>
                          One lowercase letter (a-z)
                        </Text>
                      </View>
                      
                      <View style={styles.checkRow}>
                        <Text style={passwordChecks.hasUppercase ? styles.checkIconGreen : styles.checkIconRed}>
                          {passwordChecks.hasUppercase ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.checkText, passwordChecks.hasUppercase && styles.checkTextSuccess]}>
                          One uppercase letter (A-Z)
                        </Text>
                      </View>
                      
                      <View style={styles.checkRow}>
                        <Text style={passwordChecks.hasNumber ? styles.checkIconGreen : styles.checkIconRed}>
                          {passwordChecks.hasNumber ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.checkText, passwordChecks.hasNumber && styles.checkTextSuccess]}>
                          One number (0-9)
                        </Text>
                      </View>
                      
                      <View style={styles.checkRow}>
                        <Text style={passwordChecks.hasSpecialChar ? styles.checkIconGreen : styles.checkIconRed}>
                          {passwordChecks.hasSpecialChar ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.checkText, passwordChecks.hasSpecialChar && styles.checkTextSuccess]}>
                          One special character (!@#$%^&*)
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Re-enter your password"
                      placeholderTextColor={Colors.inputPlaceholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeText}>{showConfirmPassword ? '👁' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Match Indicator */}
                {confirmPassword && (
                  <Text style={[
                    styles.matchText,
                    password === confirmPassword ? styles.matchSuccess : styles.matchError
                  ]}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </Text>
                )}

                {/* Terms and Conditions */}
                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                >
                  <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                    {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.termsText}>I agree to the </Text>
                  <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                    <Text style={styles.termsLink}>Terms and Conditions</Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Register Button */}
                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    !isFormValid && styles.registerButtonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={!isFormValid || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.registerButtonText}>Register</Text>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginLink}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // OTP Verification
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Verify Email</Text>
                <Text style={styles.subtitle}>
                  Enter the OTP sent to{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
              </View>

              <View style={styles.form}>
                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Enter OTP</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor={Colors.inputPlaceholder}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>

                {/* Resend OTP */}
                <TouchableOpacity style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  <Text style={styles.resendLink}>Resend</Text>
                </TouchableOpacity>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    otp.length !== 6 && styles.registerButtonDisabled,
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={otp.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.registerButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Terms and Conditions Modal */}
      <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} />
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </KeyboardAvoidingView>
    </View>
  );
};

// Terms and Conditions Modal Component
const TermsModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Terms and Conditions</Text>
          
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalWelcome}>Welcome to DailyMed</Text>
            
            <Text style={styles.modalText}>
              By using this application, you agree to the following terms and conditions:
            </Text>

            <Text style={styles.modalSectionTitle}>1. Medical Disclaimer</Text>
            <Text style={styles.modalText}>
              DailyMed is an AI-powered tool designed to assist in health monitoring and management. 
              It is NOT a substitute for professional medical advice, diagnosis, or treatment. 
              Always seek the advice of your physician or qualified healthcare provider with any 
              questions regarding a medical condition.
            </Text>

            <Text style={styles.modalSectionTitle}>2. No Reliance on Results</Text>
            <Text style={styles.modalText}>
              The AI-generated analysis provided by this app should not be solely relied upon for 
              medical decisions. Results are for informational purposes only and may contain 
              inaccuracies. Always consult with licensed healthcare professionals before making 
              any health-related decisions.
            </Text>

            <Text style={styles.modalSectionTitle}>3. Data Privacy & Security</Text>
            <Text style={styles.modalText}>
              We collect and store your health data to provide personalized services. Your data 
              is encrypted and stored securely. We will never sell your personal health information 
              to third parties. However, we may share anonymized data for research purposes.
            </Text>

            <Text style={styles.modalSectionTitle}>4. User Responsibilities</Text>
            <Text style={styles.modalText}>
              You are responsible for the accuracy of the data you input. DailyMed is not liable 
              for any consequences arising from incorrect or incomplete information. You must be 
              18 years or older to use this service, or have parental consent.
            </Text>

            <Text style={styles.modalSectionTitle}>5. Emergency Situations</Text>
            <Text style={styles.modalText}>
              This app is NOT designed for emergency situations. If you experience a medical 
              emergency, call your local emergency number immediately (911 in the US). Do not 
              rely on this app for urgent medical needs.
            </Text>

            <Text style={styles.modalSectionTitle}>6. Limitation of Liability</Text>
            <Text style={styles.modalText}>
              DailyMed and its creators shall not be held liable for any damages, losses, or 
              adverse health outcomes resulting from the use of this application. Use at your 
              own risk.
            </Text>

            <Text style={styles.modalSectionTitle}>7. Changes to Terms</Text>
            <Text style={styles.modalText}>
              We reserve the right to modify these terms at any time. Continued use of the app 
              constitutes acceptance of updated terms. You will be notified of significant changes.
            </Text>

            <Text style={styles.modalSectionTitle}>8. Account Termination</Text>
            <Text style={styles.modalText}>
              We reserve the right to terminate or suspend your account if you violate these 
              terms or engage in fraudulent activity. You may delete your account at any time 
              through the app settings.
            </Text>

            <Text style={styles.modalText}>
              {'\n'}By clicking "I agree," you acknowledge that you have read, understood, and 
              agree to be bound by these Terms and Conditions.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  emailHighlight: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
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
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  validationContainer: {
    marginTop: 8,
    gap: 6,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 14,
    color: Colors.error,
    marginRight: 6,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
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
  passwordChecks: {
    marginTop: 12,
    backgroundColor: Colors.surfaceAlt,
    padding: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkIconGreen: {
    fontSize: 16,
    color: Colors.success,
    marginRight: 10,
    fontFamily: FontFamily.bold,
  },
  checkIconRed: {
    fontSize: 16,
    color: Colors.error,
    marginRight: 10,
    fontFamily: FontFamily.bold,
  },
  checkText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textTertiary,
  },
  checkTextSuccess: {
    color: Colors.textSecondary,
  },
  dropdownButton: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    height: Layout.inputHeight,
    height: Layout.inputHeight,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.inputText,
  },
  placeholderText: {
    color: Colors.inputPlaceholder,
  },
  dropdownArrow: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  dropdownMenu: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    ...Shadows.medium,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
  checkIcon: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  otpInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 28,
    fontFamily: FontFamily.bold,
    color: Colors.inputText,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    letterSpacing: 8,
    textAlign: 'center',
  },
  matchText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    marginTop: -10,
    marginBottom: 12,
  },
  matchSuccess: {
    color: Colors.success,
  },
  matchError: {
    color: Colors.error,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  termsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  termsLink: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 10,
    ...Shadows.medium,
  },
  registerButtonDisabled: {
    backgroundColor: Colors.gray300,
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: FontFamily.regular,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 15,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.2,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    ...Shadows.large,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalWelcome: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  modalCloseButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...Shadows.medium,
  },
  modalCloseText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
  },
});

export default RegisterScreen;
