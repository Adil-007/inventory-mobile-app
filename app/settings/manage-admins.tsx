import adminService from '@/services/adminService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CreateAdminPage = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    industry: '',
    phone: '',
    address: '',
  });

  const [code, setCode] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim().toLowerCase()) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Invalid email format';
    if (!form.password) return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (!form.businessName.trim()) return 'Business name is required';
    return null;
  };

  const initiateCreation = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      setLoading(true);
      await adminService.initiateAdminCreation(form);
      Alert.alert('Success', 'Verification code sent to your email');
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      await adminService.verifyAdminCode({ email: form.email, code });
      Alert.alert('Success', 'Admin account created successfully!');
      // Reset form
      setStep(1);
      setForm({
        name: '',
        email: '',
        password: '',
        businessName: '',
        industry: '',
        phone: '',
        address: '',
      });
      setCode('');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/settings')}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Admin Account</Text>
          <Text style={styles.stepIndicator}>Step {step} of 2</Text>
        </View>

        {step === 1 ? (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={form.name}
                onChangeText={(text) => handleChange('name', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@example.com"
                value={form.email}
                keyboardType="email-address"
                onChangeText={(text) => handleChange('email', text)}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••"
                  value={form.password}
                  secureTextEntry={!showPassword}
                  onChangeText={(text) => handleChange('password', text)}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Business Name</Text>
              <TextInput
                style={styles.input}
                placeholder="My Business Inc."
                value={form.businessName}
                onChangeText={(text) => handleChange('businessName', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Industry</Text>
              <TextInput
                style={styles.input}
                placeholder="Retail, Technology, etc."
                value={form.industry}
                onChangeText={(text) => handleChange('industry', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+251 912 345 678"
                value={form.phone}
                keyboardType="phone-pad"
                onChangeText={(text) => handleChange('phone', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Business Address</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Business St, City"
                value={form.address}
                onChangeText={(text) => handleChange('address', text)}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={initiateCreation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.verificationHeader}>
              <Ionicons name="mail-open" size={48} color="#2563eb" style={styles.verificationIcon} />
              <Text style={styles.verificationTitle}>Check Your Email</Text>
              <Text style={styles.verificationSubtitle}>
                We sent a 6-digit code to <Text style={styles.emailHighlight}>{form.email}</Text>
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={verifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendLink} onPress={initiateCreation} disabled={loading}>
              <Text style={styles.resendText}>Didn&apos;t receive code? Resend</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: StatusBar.currentHeight || 40,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  header: {
    marginBottom: 32,
    marginTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#64748b',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#1e293b',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  verificationIcon: {
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  verificationSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#2563eb',
  },
  resendLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: '#2563eb',
    fontWeight: '500',
  },
});

export default CreateAdminPage;
