import userService from '@/services/userService';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Import translation hook
import { useTranslation } from 'react-i18next';

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function ManageUsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, token] = await Promise.all([
        userService.getAllUsers() as Promise<User[]>,
        SecureStore.getItemAsync('userEmail'),
      ]);

      setCurrentUserEmail(token || '');
      const filtered = allUsers.filter((u) => u.email !== token);
      setUsers(filtered);
    } catch {
      Alert.alert(t('manageUsers.error'), t('manageUsers.loadingUsersFailed'));
    } finally {
      setLoading(false);
    }
  },[t]);

    useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCooldownInterval(interval);
  };

  useEffect(() => {
    return () => {
      if (cooldownInterval) clearInterval(cooldownInterval);
    };
  }, [cooldownInterval]);

  const handleInitiateCreate = async () => {
    if (!newName || !newEmail || !newPassword) {
      Alert.alert(t('manageUsers.missingInfo'), t('manageUsers.fillRequiredFields'));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('manageUsers.weakPasswordTitle'), t('manageUsers.weakPassword'));
      return;
    }

    try {
      setIsSubmitting(true);
      await userService.initiateUserCreate({
        name: newName,
        email: newEmail.toLowerCase(),
        password: newPassword,
      });

      setStep('verify');
      startCooldown();
      Alert.alert(t('manageUsers.verificationSent'), t('manageUsers.verificationSentMsg'));
    } catch (error: any) {
      // Check if error response status is 400 and message indicates user exists
      if (error?.response?.status === 400) {
        // You can optionally inspect error.response.data.message if exists
        Alert.alert(t('manageUsers.userExistsTitle') || t('manageUsers.error'), t('manageUsers.userExistsMessage') || t('manageUsers.userAlreadyInUse'));
      } else {
        Alert.alert(t('manageUsers.error') || t('manageUsers.sendVerificationFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleVerify = async () => {
    if (!verificationCode) {
      Alert.alert(t('manageUsers.missingCode'), t('manageUsers.enterVerificationCode'));
      return;
    }

    if (isVerifying) return;

    setIsVerifying(true);
    try {
      const res = await userService.verifyUser({
        email: newEmail,
        code: verificationCode,
      });

      setUsers((prev) => [...prev, res].filter((u) => u.email !== currentUserEmail));
      resetModal();
      Alert.alert(t('manageUsers.success'), t('manageUsers.userAdded'));
    } catch {
      Alert.alert(t('manageUsers.error') || t('manageUsers.verificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    Alert.alert(t('manageUsers.deleteConfirm'), t('manageUsers.deleteConfirmMessage'), [
      { text: t('manageUsers.cancel'), style: 'cancel' },
      {
        text: t('manageUsers.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.deleteUser(id);
            setUsers((prev) => prev.filter((u) => u._id !== id));
          } catch {
            Alert.alert(t('manageUsers.error'), t('manageUsers.deleteFailed'));
          }
        },
      },
    ]);
  };

  const resetModal = () => {
    setModalVisible(false);
    setStep('info');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setVerificationCode('');
  };


  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <View style={styles.metaContainer}>
            <View
              style={[
                styles.roleBadge,
                item.role === 'admin' ? styles.adminBadge : styles.userBadge,
              ]}
            >
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {item.role !== 'admin' && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleDeleteUser(item._id)} style={styles.actionButton}>
            <Feather name="trash-2" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>{t('manageUsers.loadingUsers')}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#f8fafc', '#e0e7ff']} style={styles.gradientContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/settings')} style={styles.backButton}>
              <Feather name="chevron-left" size={24} color="#4f46e5" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('manageUsers.title')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>{t('manageUsers.addUser')}</Text>
            </TouchableOpacity>
          </View>

          {/* Role Info */}
          <View style={styles.infoBox}>
            <View style={styles.infoHeader}>
              <Feather name="info" size={18} color="#4f46e5" />
              <Text style={styles.infoTitle}>{t('manageUsers.userRolesTitle')}</Text>
            </View>
            <View style={styles.infoContent}>
              <View style={styles.roleItem}>
                <View style={[styles.roleDot, styles.adminDot]} />
                <Text style={styles.roleDescription}>
                  <Text style={styles.roleLabel}>{t('manageUsers.adminRole')}:</Text> {t('manageUsers.adminRoleDesc')}
                </Text>
              </View>
              <View style={styles.roleItem}>
                <View style={[styles.roleDot, styles.userDot]} />
                <Text style={styles.roleDescription}>
                  <Text style={styles.roleLabel}>{t('manageUsers.userRole')}:</Text> {t('manageUsers.userRoleDesc')}
                </Text>
              </View>
            </View>
          </View>

          {/* User List */}
          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>{t('manageUsers.noUsersFound')}</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={fetchUsers}>
                <Feather name="refresh-cw" size={16} color="#4f46e5" />
                <Text style={styles.refreshText}>{t('manageUsers.refresh')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
              ListFooterComponent={
                <TouchableOpacity style={styles.refreshButton} onPress={fetchUsers}>
                  <Feather name="refresh-cw" size={16} color="#4f46e5" />
                  <Text style={styles.refreshText}>{t('manageUsers.refresh')}</Text>
                </TouchableOpacity>
              }
            />
          )}

          {/* Add User Modal */}
          <Modal visible={modalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>
                  {step === 'info' ? t('manageUsers.addNewUserTitle') : t('manageUsers.verificationTitle')}
                </Text>

                {step === 'info' ? (
                  <>
                    <TextInput
                      placeholder={t('manageUsers.fullName')}
                      value={newName}
                      onChangeText={setNewName}
                      style={styles.input}
                      placeholderTextColor="#94a3b8"
                      autoFocus
                    />
                    <TextInput
                      placeholder={t('manageUsers.emailAddress')}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                      placeholderTextColor="#94a3b8"
                    />
                    <TextInput
                      placeholder={t('manageUsers.password')}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      style={styles.input}
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, (isSubmitting || cooldown > 0) && styles.buttonDisabled]}
                      onPress={handleInitiateCreate}
                      disabled={isSubmitting || cooldown > 0}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Feather name="arrow-right" size={18} color="#fff" />
                          <Text style={styles.buttonText}>
                            {cooldown > 0 ? t('manageUsers.resendIn', { seconds: cooldown }) : t('manageUsers.continue')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalSubtitle}>
                      {t('manageUsers.enterCodeSentTo')} {'\n'}
                      <Text style={{ fontWeight: '600' }}>{newEmail}</Text>
                    </Text>
                    <TextInput
                      placeholder={t('manageUsers.enterVerificationCode')}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholderTextColor="#94a3b8"
                      maxLength={6}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, isVerifying && styles.buttonDisabled]}
                      disabled={isVerifying}
                      onPress={handleVerify}
                    >
                      {isVerifying ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Feather name="check" size={18} color="#fff" />
                          <Text style={styles.buttonText}>{t('manageUsers.verifyAdd')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={resetModal} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{t('manageUsers.cancelText')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
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
  content: {
    padding: 20,
    paddingTop: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  infoContent: {
    paddingLeft: 6,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    marginTop: 4,
  },
  adminDot: {
    backgroundColor: '#4f46e5',
  },
  userDot: {
    backgroundColor: '#10b981',
  },
  roleLabel: {
    fontWeight: '600',
    color: '#1e293b',
  },
  roleDescription: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4f46e5',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#e0e7ff',
  },
  userBadge: {
    backgroundColor: '#d1fae5',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 16,
  },
  refreshText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#a5b4fc',
  },
});
