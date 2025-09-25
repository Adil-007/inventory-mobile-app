import { UNITS } from '@/constants/units';
import categoryService from '@/services/categoryService';
import productService from '@/services/productService';
import warehouseService from '@/services/warehouseService';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

interface Category {
  _id: string;
  name: string;
}

interface Warehouse {
  _id: string;
  name: string;
}

const EditProductScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('');
  const [unit, setUnit] = useState<string>(UNITS[0].value);
  const [quantity, setQuantity] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [zoomVisible, setZoomVisible] = useState<boolean>(false);
  const [buyingPrice, setBuyingPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const selectedCategory = categories.find(c => c._id === category);
  const selectedWarehouse = warehouses.find(w => w._id === warehouse);


  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const productId = Array.isArray(id) ? id[0] : id;
        if (!productId) {
          setLoading(false);
          return;
        }

        const [prod, cats, whs] = await Promise.all([
          productService.getProductById(productId),
          categoryService.getAllCategories(),
          warehouseService.getAllWarehouses(),
        ]);

        setName(prod.name || '');
        setCategory(prod.category?._id || '');
        setWarehouse(prod.warehouse?._id || '');
        setUnit(prod.unit || UNITS[0].value);
        setQuantity(String(prod.quantity ?? ''));
        setBrand(prod.brand || '');
        setThumbnail(prod.image || '');
        setImagePreview(prod.image || '');
        setBuyingPrice(prod.buyingPrice ? String(prod.buyingPrice) : '');
        setSellingPrice(prod.sellingPrice ? String(prod.sellingPrice) : '');
        setCategories(cats || []);
        setWarehouses(whs || []);
      } catch {
        Alert.alert(t('editProduct.errorTitle'), t('editProduct.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, t]);

  const handleImagePick = async () => {
    try {
      setImageLoading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert(t('editProduct.permissionDeniedTitle'), t('editProduct.permissionDeniedMessage'));
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setThumbnail(uri);
        setImagePreview(uri);
      }
    } catch {
      Alert.alert(t('editProduct.errorTitle'), t('editProduct.errorImageSelection'));
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent multiple submissions

    setIsSubmitting(true); // Disable the button while submitting

    if (!name || !category || !warehouse || !quantity || !unit) {
      setIsSubmitting(false); // Re-enable the button
      return Alert.alert(t('editProduct.validationTitle'), t('editProduct.validationMessage'));
    }

    if (buyingPrice && isNaN(Number(buyingPrice))) {
      setIsSubmitting(false); // Re-enable the button
      return Alert.alert(t('editProduct.errorTitle'), t('editProduct.invalidBuyingPrice'));
    }

    if (sellingPrice && isNaN(Number(sellingPrice))) {
      setIsSubmitting(false); // Re-enable the button
      return Alert.alert(t('editProduct.errorTitle'), t('editProduct.invalidSellingPrice'));
    }

    try {
      let imageUrl: string | null = null;

      if (thumbnail) {
        if (!thumbnail.startsWith('http')) {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            thumbnail,
            [{ resize: { width: 800 } }],
            {
              compress: 0.5,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          imageUrl = await productService.uploadImage(manipulatedImage.uri);
        } else {
          imageUrl = thumbnail;
        }
      }
      if (!selectedCategory || !selectedWarehouse) {
        setIsSubmitting(false); // Re-enable the button
        Alert.alert(t('editProduct.errorTitle'), t('editProduct.invalidCategoryOrWarehouse'));
        return;
      }

      const payload = {
        name,
        category: selectedCategory,
        warehouse: selectedWarehouse,
        unit,
        quantity: Number(quantity),
        brand,
        buyingPrice: buyingPrice ? Number(buyingPrice) : undefined,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        ...(imageUrl ? { image: imageUrl } : {}),
      };

      await productService.editProduct(id as string, payload);
      Alert.alert(t('editProduct.successTitle'), t('editProduct.successMessage'));
      router.replace('/products');
    } catch {
      setIsSubmitting(false); // Re-enable the button
      Alert.alert(t('editProduct.errorTitle'), t('editProduct.errorUpdate'));
    }
  };


  const categoryDropdown = useMemo(() => {
    return categories.map(cat => ({ label: cat.name, value: cat._id }));
  }, [categories]);

  const warehouseDropdown = useMemo(() => {
    return warehouses.map(w => ({ label: w.name, value: w._id }));
  }, [warehouses]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e293b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#6d28d9', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => router.replace('/products')}>
          <Feather name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProduct.title')}</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image Upload Section */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={() => setZoomVisible(true)} activeOpacity={0.9}>
            {imagePreview ? (
              <Image source={{ uri: imagePreview }} style={styles.thumbnail} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="add-a-photo" size={32} color="#cbd5e1" />
                <Text style={styles.placeholderText}>{t('editProduct.productImage')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Change Photo */}
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handleImagePick}
            disabled={imageLoading}
          >
            {imageLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={18} color="#fff" />
                <Text style={styles.imageButtonText}>{t('editProduct.changePhoto')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ✅ Remove Photo */}
          {imagePreview ? (
            <TouchableOpacity
              style={[styles.imageButton, { backgroundColor: '#ef4444', marginTop: 8 }]}
              onPress={() => {
                setThumbnail('');
                setImagePreview('');
              }}
            >
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={styles.imageButtonText}>{t('editProduct.removePhoto')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>


        {/* Form Section */}
        <View style={styles.formCard}>
          {/* Product Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editProduct.productName')}*</Text>
            <TextInput
              style={styles.input}
              placeholder={t('editProduct.productNamePlaceholder')}
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Category Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editProduct.category')}*</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              data={categoryDropdown}
              search
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder={t('editProduct.selectCategory')}
              searchPlaceholder={t('editProduct.search')}
              value={category}
              onChange={item => setCategory(item.value)}
              renderLeftIcon={() => <Feather style={styles.dropdownIcon} name="grid" size={20} color="#64748b" />}
            />
          </View>

          {/* Warehouse Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editProduct.warehouse')}*</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              data={warehouseDropdown}
              search
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder={t('editProduct.selectWarehouse')}
              searchPlaceholder={t('editProduct.search')}
              value={warehouse}
              onChange={item => setWarehouse(item.value)}
              renderLeftIcon={() => <Feather style={styles.dropdownIcon} name="archive" size={20} color="#64748b" />}
            />
          </View>

          {/* Unit and Quantity Row */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>{t('editProduct.unit')}*</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                iconStyle={styles.iconStyle}
                data={UNITS}
                labelField="label"
                valueField="value"
                placeholder={t('editProduct.selectUnit')}
                value={unit}
                onChange={item => setUnit(item.value)}
                renderLeftIcon={() => <Feather style={styles.dropdownIcon} name="divide-square" size={20} color="#64748b" />}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t('editProduct.quantity')}*</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
          </View>

          {/* Price Row */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>{t('editProduct.buyingPrice')}</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>ETB</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={t('editProduct.buyingPricePlaceholder')}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={buyingPrice}
                  onChangeText={setBuyingPrice}
                />
              </View>
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t('editProduct.sellingPrice')}</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>ETB</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={t('editProduct.sellingPricePlaceholder')}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                />
              </View>
            </View>
          </View>

          {/* Brand Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editProduct.brand')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('editProduct.brandPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={brand}
              onChangeText={setBrand}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={isSubmitting} // Disable the button
        >
          <LinearGradient
            colors={['#6d28d9', '#8b5cf6']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>{isSubmitting ? t('editProduct.updating') : t('editProduct.updateProduct')}</Text>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="check-circle" size={22} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* Zoom Modal */}
      <Modal visible={zoomVisible} transparent onRequestClose={() => setZoomVisible(false)}>
        <View style={styles.modalBackground}>
          <Image source={{ uri: imagePreview }} style={styles.zoomImage} resizeMode="contain" />
          <TouchableOpacity onPress={() => setZoomVisible(false)} style={styles.modalClose}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  priceInput: {
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  padding: 16,
  paddingLeft: 55, // Make space for currency symbol
  fontSize: 16,
  color: '#1e293b',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  textAlign: 'right',
},
currencySymbol: {
  position: 'absolute',
  left: 16,
  top: 16,
  fontSize: 16,
  color: '#64748b',
  zIndex: 1,
},
priceInputContainer: {
  position: 'relative',
},

    loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  thumbnail: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6d28d9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdown: {
    height: 52,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#1e293b',
    paddingLeft: 8,
  },
  iconStyle: {
    width: 24,
    height: 24,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
  },
  modalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
});

export default EditProductScreen;
