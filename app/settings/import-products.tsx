import { Feather, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import importService from '../../services/importService';

type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  warehouse: string;
  brand?: string;
};

type ImportResult = {
  addedCount: number;
  errorCount: number;
  rejectedItems?: ParsedItem[];
} | null;

const ImportProductsScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [importProgress] = useState(new Animated.Value(0));
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const [isParsing, setIsParsing] = useState(false);

  const progressWidth = importProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }
      if (result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        await parseExcelFile(result.assets[0]);
      }
    } catch {
      Alert.alert(t('importProducts.importFailed'), t('importProducts.importFailedMessage'));
    }
  };

  const parseExcelFile = async (file: DocumentPicker.DocumentPickerAsset) => {
    try {
      setIsParsing(true);
      setValidationErrors([]);
      setParsedData([]);
      
      const result = await importService.parseExcelFile(file);
      
      if (result.data && result.data.length > 0) {
        setParsedData(result.data);
      } else {
        setValidationErrors([t('importProducts.emptyFile')]);
      }
      
      if (result.errors && result.errors.length > 0) {
        setValidationErrors(prev => [...prev, ...result.errors]);
      }
    } catch {
      Alert.alert(t('importProducts.parseFailed'), t('importProducts.parseFailedMessage'));
      setValidationErrors([t('importProducts.invalidFileFormat')]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsLoading(true);
      await importService.downloadImportTemplate();
    } catch {
      Alert.alert(t('importProducts.downloadFailed'), t('importProducts.downloadFailedMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      Alert.alert(t('importProducts.noFileAlertTitle'), t('importProducts.noFileAlertMessage'));
      return;
    }
    if (validationErrors.length > 0) {
      Alert.alert(t('importProducts.fixErrorsAlertTitle'), t('importProducts.fixErrorsAlertMessage'));
      return;
    }
    try {
      setIsLoading(true);
      const result = await importService.uploadImportFile(selectedFile);
      setImportResult(result);

      if (result.errorCount > 0) {
        Alert.alert(
          t('importProducts.importComplete'),
          `${result.addedCount} ${t('importProducts.importSuccess')}\n${result.errorCount} ${t('importProducts.importErrors')}\n\n${t('importProducts.followTemplate')}`
        );
      } else {
        Alert.alert(
          t('importProducts.importComplete'),
          `${result.addedCount} ${t('importProducts.importSuccess')}`
        );
      }
    } catch (err: any) {
      Alert.alert(t('importProducts.importFailed'), err?.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar backgroundColor="#4f46e5" />

      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.replace('/settings')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <LinearGradient
          colors={['#4f46e5', '#312e81']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome5 name="file-import" size={24} color="#fff" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{t('importProducts.headerTitle')}</Text>
          <Text style={styles.headerSubtitle}>{t('importProducts.headerSubtitle')}</Text>
        </LinearGradient>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.title}>{t('importProducts.instructionsTitle')}</Text>
        {(t('importProducts.instructions', { returnObjects: true }) as string[]).map((note, idx) => (
          <Text key={idx} style={styles.note}>• {note}</Text>
        ))}
      </View>

      {/* Template Download + File Picker */}
      <View style={styles.card}>
        <TouchableOpacity
          onPress={handleDownloadTemplate}
          style={[styles.button, styles.primaryButton]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="download" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{t('importProducts.downloadTemplate')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePickFile}
          style={[styles.button, styles.secondaryButton]}
          disabled={isLoading || isParsing}
        >
          {isParsing ? (
            <ActivityIndicator color="#4f46e5" />
          ) : selectedFile ? (
            <>
              <MaterialIcons name="check-circle" size={18} color="#10b981" style={styles.buttonIcon} />
              <Text style={styles.buttonTextSecondary} numberOfLines={1} ellipsizeMode="middle">
                {selectedFile.name}
              </Text>
            </>
          ) : (
            <>
              <Feather name="upload" size={18} color="#4f46e5" style={styles.buttonIcon} />
              <Text style={styles.buttonTextSecondary}>{t('importProducts.pickFile')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Clear File Button */}
        {selectedFile && (
          <TouchableOpacity 
            onPress={handleClearFile} 
            style={[styles.button, styles.secondaryButton]}
            disabled={isLoading || isParsing}
          >
            <Feather name="x-circle" size={18} color="#ef4444" style={styles.buttonIcon} />
            <Text style={[styles.buttonTextSecondary, { color: '#ef4444' }]}>{t('importProducts.clearFile')}</Text>
          </TouchableOpacity>
        )}

        {!selectedFile && (
          <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>
            {t('importProducts.noFileSelected')}
          </Text>
        )}
      </View>

      {/* Loading State for Parsing */}
      {(isParsing || (isLoading && !parsedData.length)) && (
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={{ textAlign: 'center', marginTop: 8 }}>
            {isParsing ? t('importProducts.parsingFile') : t('importProducts.loading')}
          </Text>
        </View>
      )}

      {/* Import Summary */}
      {importResult && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="check-circle-outline" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>{t('importProducts.importSummaryTitle')}</Text>
          </View>
          <Text style={{ color: '#1f2937', fontSize: 14 }}>
            {t('importProducts.importSuccess', { count: importResult.addedCount })}
          </Text>
          {importResult.errorCount > 0 && (
            <Text style={{ color: '#b91c1c', marginTop: 4, fontSize: 14 }}>
              {t('importProducts.importErrors', { count: importResult.errorCount })}
            </Text>
          )}
        </View>
      )}
      
      {importResult?.rejectedItems && importResult.rejectedItems.length > 0 && (
        <View style={styles.previewContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="error-outline" size={18} color="#b91c1c" />
            <Text style={styles.sectionTitle}>{t('importProducts.rejectedItems')}</Text>
          </View>
          <ScrollView style={styles.previewScroll}>
            {importResult.rejectedItems.map((item, idx) => (
              <View key={idx} style={[styles.itemCard, { borderColor: '#b91c1c' }]}>
                <Text style={styles.itemName}>❌ {item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} • {item.category} • {item.warehouse}
                </Text>
                {item.brand && (
                  <Text style={styles.itemBrand}>
                    <MaterialIcons name="branding-watermark" size={12} color="#6b7280" /> {item.brand}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}


      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <View style={styles.errorContainer}>
          <View style={styles.errorHeader}>
            <MaterialIcons name="error-outline" size={20} color="#b91c1c" />
            <Text style={styles.errorTitle}>{t('importProducts.validationErrorsTitle')}</Text>
          </View>
          <ScrollView style={styles.errorList}>
            {validationErrors.map((err, i) => (
              <Text key={i} style={styles.errorText}>• {err}</Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Preview */}
      {parsedData.length > 0 && (
        <View style={styles.previewContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="preview" size={18} color="#4f46e5" />
            <Text style={styles.sectionTitle}>
              {t('importProducts.previewTitle', { count: parsedData.length })}
            </Text>
          </View>
          <ScrollView style={styles.previewScroll}>
            {parsedData.map((item, idx) => (
              <View key={idx} style={styles.itemCard}>
                <Text style={styles.itemName}>📦 {item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} • {item.category} • {item.warehouse}
                </Text>
                {item.brand && (
                  <Text style={styles.itemBrand}>
                    <MaterialIcons name="branding-watermark" size={12} color="#6b7280" /> {item.brand}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Import Button */}
      {parsedData.length > 0 && validationErrors.length === 0 && (
        <View style={styles.card}>
          <TouchableOpacity
            onPress={handleImport}
            style={[styles.button, styles.successButton]}
            disabled={isLoading || isParsing}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('importProducts.importing')}</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('importProducts.importButton')}</Text>
              </>
            )}
          </TouchableOpacity>

          {isLoading && (
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    paddingTop: 0,
  },
  headerContainer: {
    position: 'relative',
    marginBottom: 24,
    paddingTop: 120,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 70,
    zIndex: 10,
    padding: 8,
  },
  header: {
    padding: 24,
    paddingTop: 100,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#e0e7ff',
    fontSize: 14,
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
  },
  title: {
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    fontSize: 16,
  },
  note: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  secondaryButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 16,
    flexShrink: 1,
  },
  buttonIcon: {
    marginRight: 10,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    color: '#b91c1c',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  errorList: {
    maxHeight: 150,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#4f46e5',
    marginLeft: 8,
    fontSize: 16,
  },
  previewScroll: {
    maxHeight: 300,
  },
  itemCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemName: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
});

export default ImportProductsScreen;
