import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../app/store/authSlice';
import authService from '../services/authService';

const LoginScreen = () => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (isLoading) return;

    const e = email.trim().toLowerCase();
    if (!e || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(e)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { user, accessToken } = await authService.login({ email: e, password });
      if (!user?._id || !accessToken) throw new Error('SERVER_RESPONSE_INVALID');

      dispatch(setCredentials({ user, accessToken }));
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
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
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
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

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to manage your inventory</Text>

            {/* Email */}
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

            {/* Password */}
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#93c5fd" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
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

            {/* Forgot Password */}
            <Pressable 
              onPress={() => router.push('/forgot-password')} 
              style={styles.forgotPassword} 
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <Pressable 
                onPress={handleLogin} 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
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
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  gradient: { 
    flex: 1,
  },
  container: { 
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
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
  forgotPassword: { 
    alignSelf: 'flex-end', 
    marginBottom: 24,
    padding: 8,
  },
  forgotPasswordText: { 
    color: '#bfdbfe', 
    fontSize: 14,
    fontWeight: '600',
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
});