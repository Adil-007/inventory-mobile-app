import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import authService from '../services/authService';

const ForgotPasswordScreen = () => {
  const router = useRouter();

  const [step, setStep] = useState(1); // Step 1: request, Step 2: verify
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and new password');
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email, password);
      Alert.alert('Code Sent', 'Check your email for the verification code.');
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyPasswordReset(email, code, password);
      Alert.alert('Success', 'Password has been reset.');
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#2563eb', '#7c3aed', '#c026d3']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo with Inventory Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="inventory" size={40} color="#2563eb" style={styles.logoIcon} />
            </View>
            <Text style={styles.logoText}>Ease</Text>
            <Text style={styles.logoSubtext}>Stock</Text>
          </View>
          
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 
              ? 'Enter your email and new password' 
              : 'Enter the verification code from your email'}
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#93c5fd" style={styles.inputIcon} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor="#93c5fd"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#93c5fd" style={styles.inputIcon} />
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#93c5fd"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              autoComplete="password"
              editable={!isLoading}
            />
            <Pressable 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
              disabled={isLoading}
            >
              <Feather 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color="#93c5fd" 
              />
            </Pressable>
          </View>

          {/* Verification Code Input (Step 2) */}
          {step === 2 && (
            <View style={styles.inputContainer}>
              <Feather name="key" size={20} color="#93c5fd" style={styles.inputIcon} />
              <TextInput
                placeholder="Verification Code"
                placeholderTextColor="#93c5fd"
                value={code}
                onChangeText={setCode}
                style={styles.input}
                keyboardType="number-pad"
                editable={!isLoading}
              />
            </View>
          )}

          {/* Action Button */}
          <Pressable 
            onPress={step === 1 ? handleRequestCode : handleVerifyCode}
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#f472b6', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.loginButtonText}>
                {isLoading 
                  ? (step === 1 ? 'Sending Code...' : 'Verifying...')
                  : (step === 1 ? 'Send Reset Code' : 'Verify & Reset')}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Back to Login */}
          <Pressable 
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={isLoading}
          >
            <Feather name="arrow-left" size={16} color="#bfdbfe" />
            <Text style={styles.forgotPasswordText}> Back to Sign In</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  logoContainer: {
    alignSelf: 'center',
    marginBottom: 32,
    alignItems: 'center',
  },
  logoCircle: {
    backgroundColor: 'white',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logoIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoSubtext: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: -4,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#fff', 
    textAlign: 'center', 
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#bfdbfe', 
    textAlign: 'center', 
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16, 
    paddingHorizontal: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 60,
  },
  inputIcon: { 
    marginRight: 12,
  },
  input: { 
    flex: 1, 
    height: '100%', 
    color: '#fff', 
    fontSize: 16,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  passwordToggle: { 
    padding: 8,
    marginLeft: 8,
  },
  loginButton: {
    borderRadius: 16, 
    overflow: 'hidden',
    height: 60, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 8,
    marginBottom: 16,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  forgotPasswordText: { 
    color: '#bfdbfe', 
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    padding: 8,
    marginTop: 16,
  },
});