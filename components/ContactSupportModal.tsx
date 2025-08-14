import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


interface ContactSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ContactSupportModal({ visible, onClose }:ContactSupportModalProps) {
  const contactMethods = [
    {
      icon: <Ionicons name="mail" size={20} color="#3b82f6" />,
      label: "Email",
      value: "easestockapp@gmail.com",
      action: () => Linking.openURL('mailto:easestockapp@gmail.com')
    },
    {
      icon: <Ionicons name="call" size={20} color="#3b82f6" />,
      label: "Phone",
      value: "+251 912 658521",
      action: () => Linking.openURL('tel:+251912658521')
    },
  ];

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Contact Support</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>We&apos;re here to help you!</Text>

            {contactMethods.map((method, index) => (
            <Pressable 
                key={index} 
                style={styles.contactItem}
                onPress={method.action}
                android_ripple={{ color: '#f1f5f9' }}
            >
                <View style={styles.contactIcon}>
                {method.icon}
                </View>
                <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>{method.label}</Text>
                <Text style={styles.contactValue}>{method.value}</Text>
                </View>
                {method.label === "Email" && (
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                )}
            </Pressable>
            ))}

          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeIcon: {
    padding: 4,
    marginRight: -8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactIcon: {
    marginRight: 16,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  closeBtn: {
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 16,
  },
});