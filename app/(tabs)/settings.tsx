import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { logout as logoutAction } from '../../app/store/authSlice';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import ContactSupportModal from '../../components/ContactSupportModal';
import authService from '../../services/authService';
import dataService from '../../services/dataService';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout(); // clear refresh token cookie
      dispatch(logoutAction()); // clear Redux state
    } catch {
      Alert.alert(t('settings.error'), t('settings.logoutFailed'));
    }
  };

  const handleDataDelete = async () => {
    try {
      await dataService.deleteBusinessData();
      setShowDeleteModal(false);
      Alert.alert(t('settings.success'), t('settings.dataDeleted'));
    } catch {
      Alert.alert(t('settings.error'), t('settings.dataDeleteFailed'));
    }
  };

  const isAdmin = userRole === 'admin';
  const isSuperAdmin = userRole === 'superadmin';

  const settingsData = [
    {
      title: t('settings.accountSettings'),
      items: [
        { icon: 'user', label: t('settings.editProfile'), onPress: () => router.push('/settings/edit-profile') },
        { icon: 'lock', label: t('settings.changePassword'), onPress: () => router.push('/settings/change-password') },
      ],
    },
    ...(isAdmin || isSuperAdmin
      ? [
          {
            title: t('settings.businessManagement'),
            items: [
              { icon: 'users', label: t('settings.manageUsers'), onPress: () => router.push('/settings/manage-users') },
              ...(isSuperAdmin
                ? [
                    { icon: 'briefcase', label: t('settings.manageBusinesses'), onPress: () => router.push('/settings/manage-businesses') },
                    { icon: 'user-plus', label: t('settings.createAdmin'), onPress: () => router.push('/settings/manage-admins') },
                  ]
                : []),
            ],
          },
          {
            title: t('settings.dataPrivacy'),
            items: [
              { icon: 'upload', label: t('settings.importProducts'), onPress: () => router.push('/settings/import-products') },
              { icon: 'trash-2', label: t('settings.deleteData'), onPress: () => setShowDeleteModal(true) },
            ],
          },
        ]
      : []),
    {
      title: t('settings.preferences'),
      items: [
        { icon: 'moon', label: t('settings.darkModeComingSoon'), onPress: () => {} },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        { icon: 'mail', label: t('settings.contactSupport'), onPress: () => setShowSupportModal(true) },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      {settingsData.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, i) => (
            <TouchableOpacity key={i} style={styles.item} onPress={item.onPress}>
              <Feather name={item.icon as any} size={20} color="#475569" style={styles.icon} />
              <Text style={styles.label}>{item.label}</Text>
              <Feather name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>

      <ConfirmDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDataDelete}
      />

      <ContactSupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    marginRight: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutText: {
    marginLeft: 8,
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
