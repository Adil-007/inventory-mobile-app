import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import userService from '../../services/userService';

// Import translation hook (example with react-i18next)
import { useTranslation } from 'react-i18next';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return Alert.alert(t('changePassword.errorTitle'), t('changePassword.validation.allFieldsRequired'));
    }

    if (newPassword !== confirmNewPassword) {
      return Alert.alert(t('changePassword.errorTitle'), t('changePassword.validation.passwordMismatch'));
    }

    if (newPassword.length < 8) {
      return Alert.alert(t('changePassword.errorTitle'), t('changePassword.validation.weakPassword'));
    }

    setLoading(true);
    try {
      const res = await userService.changePassword({
        currentPassword,
        newPassword,
      });

      Alert.alert(t('changePassword.successTitle'), res.message || t('changePassword.successMessage'));
      router.replace('/settings');
    } catch {
      Alert.alert(t('changePassword.errorTitle'));
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setPasswordVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <LinearGradient colors={['#f8fafc', '#e0e7ff']} style={styles.gradientContainer}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.replace('/settings')} style={styles.backButton}>
                <Feather name="chevron-left" size={24} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.title}>{t('changePassword.title')}</Text>
              <View style={styles.backButtonPlaceholder} />
            </View>

            <View style={styles.card}>
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('changePassword.currentPassword')}</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    secureTextEntry={!passwordVisible.current}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    style={styles.input}
                    placeholder={t('changePassword.currentPasswordPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => togglePasswordVisibility('current')}>
                    <Feather
                      name={passwordVisible.current ? 'eye-off' : 'eye'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('changePassword.newPassword')}</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    secureTextEntry={!passwordVisible.new}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    style={styles.input}
                    placeholder={t('changePassword.newPasswordPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => togglePasswordVisibility('new')}>
                    <Feather name={passwordVisible.new ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
                {newPassword.length > 0 && (
                  <Text
                    style={[
                      styles.passwordStrength,
                      newPassword.length < 8 ? styles.weakPassword : styles.strongPassword,
                    ]}
                  >
                    {newPassword.length < 8 ? t('changePassword.validation.weak') : t('changePassword.validation.strong')}
                  </Text>
                )}
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('changePassword.confirmNewPassword')}</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    secureTextEntry={!passwordVisible.confirm}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    style={styles.input}
                    placeholder={t('changePassword.confirmNewPasswordPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => togglePasswordVisibility('confirm')}>
                    <Feather name={passwordVisible.confirm ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
                {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                  <Text style={styles.passwordMismatch}>{t('changePassword.validation.passwordsDontMatch')}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (loading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword ||
                  newPassword !== confirmNewPassword) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={
                loading ||
                !currentPassword ||
                !newPassword ||
                !confirmNewPassword ||
                newPassword !== confirmNewPassword
              }
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="lock" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>{t('changePassword.changePasswordButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  passwordInputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  passwordStrength: {
    fontSize: 12,
    marginTop: 6,
  },
  weakPassword: {
    color: '#ef4444',
  },
  strongPassword: {
    color: '#10b981',
  },
  passwordMismatch: {
    fontSize: 12,
    marginTop: 6,
    color: '#ef4444',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    padding: 18,
    borderRadius: 12,
    marginTop: 32,
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#a5b4fc',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    marginLeft: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
