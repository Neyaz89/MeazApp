
export const Theme = {
  colors: {
    // Primary Colors
    white: '#FFFFFF',
    darkGold: '#D4A574',
    navyBlue: '#2C5F7C',
    
    // Extended Palette
    lightGold: '#E6C49A',
    deepNavy: '#1E3A8A',
    cream: '#F8F6F0',
    lightBlue: '#E8F4FD',
    
    // Accent Colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Neutral Colors
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    
    // Background Gradients
    primaryGradient: ['#FFFFFF', '#F8F9FA', '#E8F4FD'],
    goldGradient: ['#D4A574', '#C8956D'],
    navyGradient: ['#2C5F7C', '#1E3A8A'],
    glassGradient: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)'],
  },
  
  gradients: {
    primary: ['#FFFFFF', '#F8F9FA', '#E8F4FD'],
    gold: ['#D4A574', '#C8956D'],
    navy: ['#2C5F7C', '#1E3A8A'],
    glass: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)'],
    glassDark: ['rgba(44, 95, 124, 0.2)', 'rgba(44, 95, 124, 0.1)'],
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    glass: {
      shadowColor: '#D4A574',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    round: 50,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    fontWeight: {
      light: '300' as const,
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    },
  },
  
  animations: {
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
  
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  
  neumorphism: {
    light: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: -5, height: -5 },
      shadowOpacity: 0.7,
      shadowRadius: 10,
    },
    dark: {
      shadowColor: '#000000',
      shadowOffset: { width: 5, height: 5 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
  },
};

export type ThemeType = typeof Theme;
