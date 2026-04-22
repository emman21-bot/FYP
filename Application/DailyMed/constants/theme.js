/**
 * DailyMed Theme Configuration
 * Professional color palette and styling constants
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Colors = {
  // Primary Blue Palette
  primary: '#2E7DD8',
  primaryLight: '#4A96E8',
  primaryDark: '#1E5DB8',
  primaryVeryLight: '#E0F0FF',
  
  // Secondary Green Palette (for health indicators)
  secondary: '#4CAF50',
  secondaryLight: '#81C784',
  secondaryDark: '#388E3C',
  
  // Accent Colors
  accent: '#FF6B6B',
  warning: '#FFA726',
  success: '#66BB6A',
  error: '#EF5350',
  info: '#42A5F5',
  
  // Neutral Colors - White theme
  white: '#FFFFFF',
  black: '#1A1A1A',
  background: '#F8FAFB',
  backgroundAlt: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F8FC',
  
  // Text Colors - For white background
  textPrimary: '#1A202C',
  textSecondary: '#4A5568',
  textTertiary: '#718096',
  textLight: '#A0AEC0',
  textOnPrimary: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  
  // Input Colors
  inputBackground: '#F7FAFC',
  inputBorder: '#E2E8F0',
  inputBorderFocused: '#2E7DD8',
  inputText: '#1A202C',
  inputPlaceholder: '#A0AEC0',
  
  // Gray Scale
  gray50: '#F7FAFC',
  gray100: '#EDF2F7',
  gray200: '#E2E8F0',
  gray300: '#CBD5E0',
  gray400: '#A0AEC0',
  gray500: '#718096',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray800: '#1A202C',
  gray900: '#171923',
  
  // Health Status Colors
  healthNormal: '#4CAF50',
  healthWarning: '#FFA726',
  healthCritical: '#EF5350',
  healthGood: '#66BB6A',
  
  // UI Elements
  border: '#E0E0E0',
  divider: '#EEEEEE',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 1000,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 42,
};

export const FontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const FontFamily = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
};

export const Layout = {
  screenPaddingHorizontal: 24,
  screenPaddingVertical: 20,
  cardPadding: 16,
  buttonHeight: 52,
  inputHeight: 52,
  iconSize: 24,
  avatarSize: 40,
  headerHeight: 60,
  bottomSpacing: 40,
  statusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44,
  topMargin: SCREEN_HEIGHT * 0.06, // 6% of screen height for consistent top spacing
};

export default {
  Colors,
  Spacing,
  BorderRadius,
  FontSizes,
  FontWeights,
  FontFamily,
  Shadows,
  Layout,
};
