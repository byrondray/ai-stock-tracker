import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTheme } from '../../hooks/useTheme';

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <LinearGradient
      colors={
        isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2']
      }
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>
            AI Stock Analyzer
          </Text>
          <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
            Smart Investment Decisions
          </Text>
        </View>
        {/* Features Section */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: '#FFFFFF' }]}>📊</Text>
            <Text style={[styles.featureText, { color: '#FFFFFF' }]}>
              AI-Powered Analysis
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: '#FFFFFF' }]}>🔮</Text>
            <Text style={[styles.featureText, { color: '#FFFFFF' }]}>
              Price Predictions
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: '#FFFFFF' }]}>💼</Text>
            <Text style={[styles.featureText, { color: '#FFFFFF' }]}>
              Portfolio Management
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: '#FFFFFF' }]}>📰</Text>
            <Text style={[styles.featureText, { color: '#FFFFFF' }]}>
              Real-time News
            </Text>
          </View>
        </View>
        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: '#FFFFFF' }]}
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: '#FFFFFF' }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.disclaimer, { color: '#FFFFFF' }]}>
          Investment involves risk. Past performance does not guarantee future
          results.
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '300',
    textAlign: 'center',
    opacity: 0.9,
  },
  features: {
    width: '100%',
    marginBottom: 60,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    marginBottom: 40,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
  },
});

export default WelcomeScreen;
