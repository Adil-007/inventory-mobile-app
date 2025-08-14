import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';

type MoreOption = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  adminOnly: boolean;
};

export default function MoreScreen() {
  const { t } = useTranslation();
  const [moreOptions, setMoreOptions] = useState<MoreOption[]>([]);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);




useEffect(() => {
  const loadOptions = () => {
    const options: MoreOption[] = [
      {
        title: t('more.transfers'),
        icon: 'repeat',
        onPress: () => router.push('/transfer'),
        adminOnly: false,
      },
      {
        title: t('more.warehouses'),
        icon: 'home',
        onPress: () => router.push('/warehouses'),
        adminOnly: false,
      },
      {
        title: t('more.categories'),
        icon: 'list',
        onPress: () => router.push('/categories'),
        adminOnly: false,
      },
      {
        title: t('more.expenses'),
        icon: 'credit-card',
        onPress: () => router.push('/expenses'),
        adminOnly: true,
      },
      {
        title: t('more.reports'),
        icon: 'bar-chart-2',
        onPress: () => router.push('/reports'),
        adminOnly: true,
      },
    ];

    let role = userRole?.toLowerCase() || 'user';

    const filteredOptions = options.filter(
      (option) => role === 'admin' || role === 'superadmin' || !option.adminOnly
    );

    setMoreOptions(filteredOptions);
  };

  loadOptions();
}, [t, userRole]);



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('more.title')}</Text>
        <Text style={styles.subtitle}>{t('more.subtitle')}</Text>
      </View>

      <View style={styles.menu}>
        {moreOptions.map((option, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={option.onPress}>
            <View style={styles.menuIcon}>
              <Feather name={option.icon as any} size={22} color="#6366f1" />
            </View>
            <Text style={styles.menuText}>{option.title}</Text>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  menu: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
});
