import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';


export default function TabLayout() {
  const { t } = useTranslation();

  return (
      <Tabs screenOptions={{ tabBarActiveTintColor: '#6366f1' }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: t('tabs.products'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="box" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            title: t('tabs.sales'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="dollar-sign" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t('tabs.more'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="menu" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
  );
}
