import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import warehouseService from '../../services/warehouseService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWarehouseModal({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [scaleValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setName('');
      setLocation('');
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleValue]);

  const handleCancel = () => {
    setName('');
    setLocation('');
    onClose();
  };

  const handleAdd = async () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert(t('addWarehouseModal.validationAlertTitle'), t('addWarehouseModal.validationAlertMessage'));
      return;
    }
    try {
      setLoading(true);
      await warehouseService.addWarehouse({ name, location });
      onSuccess();
      onClose();
    } catch {
      Alert.alert(t('addWarehouseModal.errorAlertTitle'), t('addWarehouseModal.errorAlertMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleValue }],
              opacity: scaleValue,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('addWarehouseModal.title')}</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{t('addWarehouseModal.subtitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('addWarehouseModal.warehouseNamePlaceholder')}
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder={t('addWarehouseModal.locationPlaceholder')}
            placeholderTextColor="#94a3b8"
            value={location}
            onChangeText={setLocation}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t('addWarehouseModal.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleAdd}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.saveButtonText}>{t('addWarehouseModal.saving')}</Text>
              ) : (
                <>
                  <Feather name="plus" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>{t('addWarehouseModal.createWarehouse')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  closeButton: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

