import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changesMade, setChangesMade] = useState(false);
  const [initialData, setInitialData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // ✅ Fetch profile once

  const fetchProfile = useCallback(async () => {
    try {
      const data = await userService.getProfile();
      setName(data.name);
      setEmail(data.email);
      setPhone(data.phone || '');
      setInitialData({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
      });
    } catch {
      Alert.alert(t('editProfile.errorTitle'), t('editProfile.errorLoadProfile'));
    } finally {
      setLoading(false);
    }
  }, [t]); // ✅ stable reference, only depends on t

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // ✅ ESLint satisfied, runs only once

  // ✅ Detect changes only after loading
  useEffect(() => {
    if (!loading) {
      const hasChanges =
        name !== initialData.name ||
        email !== initialData.email ||
        phone !== initialData.phone;
      setChangesMade(hasChanges);
    }
  }, [name, email, phone, initialData, loading]);

  const handleSave = async () => {
    if (!changesMade) {
      Alert.alert(t('editProfile.noChanges'), t('editProfile.noChangesMessage'));
      return;
    }

    setSaving(true);
    try {
      await userService.updateProfile({ name, email, phone });
      Alert.alert(t('editProfile.successTitle'), t('editProfile.successMessage'));
      router.replace('/settings');
    } catch {
      Alert.alert(t('editProfile.errorTitle'), t('editProfile.errorUpdateProfile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>{t('editProfile.loadingProfile')}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#f8fafc', '#e0e7ff']} style={styles.gradientContainer}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.replace('/settings')} style={styles.backButton}>
                <Feather name="chevron-left" size={24} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.title}>{t('editProfile.title')}</Text>
              <View style={styles.backButtonPlaceholder} />
            </View>

            {/* Profile Form */}
            <View style={styles.card}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('editProfile.fullName')}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('editProfile.fullNamePlaceholder')}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Email - Read Only */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('editProfile.email')}</Text>
                <TextInput
                  value={email}
                  placeholder={t('editProfile.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { opacity: 0.6, backgroundColor: '#f1f5f9' }]}
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('editProfile.phone')}</Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    const cleanedText = text.replace(/\D/g, '');
                    if (cleanedText.length <= 15) {
                      let formattedText = cleanedText;
                      if (cleanedText.length > 0) {
                        formattedText = `+${cleanedText}`;
                      }
                      setPhone(formattedText);
                    }
                  }}
                  placeholder={t('editProfile.phonePlaceholder')}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                  maxLength={16}
                />
                {phone.length > 0 && (
                  <Text
                    style={[
                      styles.phoneValidationText,
                      phone.length < 8 && styles.phoneValidationWarning,
                      phone.length >= 16 && styles.phoneValidationError,
                    ]}
                  >
                    {phone.length < 8
                      ? t('editProfile.phoneTooShort')
                      : phone.length >= 16
                      ? t('editProfile.phoneMaxLength')
                      : ''}
                  </Text>
                )}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, !changesMade && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!changesMade || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>{t('editProfile.saveChanges')}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
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
    shadowOffset: { width: 0, height: 2 },
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
  input: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  phoneValidationText: {
    fontSize: 12,
    marginTop: 6,
  },
  phoneValidationWarning: {
    color: '#f59e0b',
  },
  phoneValidationError: {
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
    shadowOffset: { width: 0, height: 2 },
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
