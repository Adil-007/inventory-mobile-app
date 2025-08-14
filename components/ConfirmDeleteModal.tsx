import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ConfirmDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({ visible, onClose, onConfirm }: ConfirmDeleteModalProps) {
  const [input, setInput] = useState('');
  const [isCaseMatch, setIsCaseMatch] = useState(false);

  const PHRASE = 'DELETE MY DATA';

  useEffect(() => {
    if (!visible) {
      setInput('');
      setIsCaseMatch(false);
    }
  }, [visible]);

  useEffect(() => {
    setIsCaseMatch(input === PHRASE);
  }, [input]);

  const handleDelete = () => {
    if (isCaseMatch) {
      onConfirm();
      setInput('');
      setIsCaseMatch(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setIsCaseMatch(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Confirm Data Deletion</Text>
          <Text style={styles.message}>This action is permanent. To continue, type:</Text>

          <View style={styles.phraseContainer}>
            <Text style={styles.phrase}>&quot;{PHRASE}&quot;</Text>
            {input.length > 0 && (
              <Text
                style={[
                  styles.matchText,
                  { color: isCaseMatch ? '#4CAF50' : '#F44336' }
                ]}
              >
                {isCaseMatch ? '✓ Match' : '✗ Not matching'}
              </Text>
            )}
          </View>

          <TextInput
            placeholder="Type the phrase exactly as shown"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholderTextColor="#999"
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              disabled={!isCaseMatch}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: isCaseMatch ? '#D32F2F' : '#F5B7B1',
                  opacity: isCaseMatch ? 1 : 0.7
                }
              ]}
            >
              <Text style={styles.confirmText}>Delete</Text>
            </TouchableOpacity>
          </View>
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
  },
  modal: {
    backgroundColor: 'white',
    width: '85%',
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#D32F2F',
  },
  message: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  phraseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  phrase: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  matchText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    backgroundColor: '#E0E0E0',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
  },
  cancelText: {
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  confirmBtn: {
    padding: 12,
    borderRadius: 5,
    flex: 1,
  },
  confirmText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
