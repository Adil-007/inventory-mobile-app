import { UNITS } from '@/constants/units';
import categoryService from '@/services/categoryService';
import productService from '@/services/productService';
import warehouseService from '@/services/warehouseService';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

const AddProductScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [buyingPrice, setBuyingPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('');
  const [unit, setUnit] = useState(UNITS[0].value);
  const [brand, setBrand] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [zoomVisible, setZoomVisible] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


useEffect(() => {
  const fetchDropdowns = async () => {
    try {
      const cats = await categoryService.getAllCategories();
      const whs = await warehouseService.getAllWarehouses();
      setCategories(cats);
      setWarehouses(whs);
    } catch {
      // Optionally show alert or toast here
      // Reset dropdowns so loaders don't stick indefinitely
      setCategories([]);
      setWarehouses([]);
      // Optional: show some inline error message state for user feedback
      // Alert.alert(t('addProduct.errorTitle'), t('addProduct.errorLoadingDropdowns'));
    }
  };
  fetchDropdowns();
}, [t]);


  const handleImagePick = async () => {
    try {
      setImageLoading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t('addProduct.permissionDeniedTitle'), t('addProduct.permissionDeniedMessage'));
        return;
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
      Alert.alert(t('addProduct.errorTitle'), t('addProduct.errorImageSelection'));
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // prevent double taps
    setIsSubmitting(true);

    if (!name || !category || !warehouse || !quantity || !unit) {
      return Alert.alert(t('addProduct.validationTitle'), t('addProduct.validationMessage'));
    }

    if (buyingPrice && isNaN(Number(buyingPrice))) {
      return Alert.alert(t('addProduct.errorTitle'), t('addProduct.invalidBuyingPrice'));
    }
    if (sellingPrice && isNaN(Number(sellingPrice))) {
      return Alert.alert(t('addProduct.errorTitle'), t('addProduct.invalidSellingPrice'));
    }

    try {
      let imageUrl: string | null = null;

      if (thumbnail && !thumbnail.startsWith('http')) {
        // Resize before uploading
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          thumbnail,
          [{ resize: { width: 800 } }],
          {
            compress: 0.5,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        imageUrl = await productService.uploadImage(manipulatedImage.uri);
      }

      const payload = {
        name,
        category,
        warehouse,
        unit,
        quantity: Number(quantity),
        brand,
        buyingPrice: buyingPrice ? Number(buyingPrice) : null,
        sellingPrice: sellingPrice ? Number(sellingPrice) : null,
        image: imageUrl,
      };

      await productService.addProduct(payload);
      Alert.alert(t('addProduct.successTitle'), t('addProduct.successMessage'));
      router.replace('/products');
    } catch {
      Alert.alert(t('addProduct.errorTitle'), t('addProduct.errorCreateProduct'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryDropdown = useMemo(() => {
    return categories.map(cat => ({ label: cat.name, value: cat._id }));
  }, [categories]);

  const warehouseDropdown = useMemo(() => {
    return warehouses.map(w => ({ label: w.name, value: w._id }));
  }, [warehouses]);

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
        <Text style={styles.headerTitle}>{t('addProduct.title')}</Text>
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
                <Text style={styles.placeholderText}>{t('addProduct.productImage')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageButton} onPress={handleImagePick} disabled={imageLoading}>
            {imageLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={18} color="#fff" />
                <Text style={styles.imageButtonText}>{t('addProduct.uploadPhoto')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.formCard}>
          {/* Product Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('addProduct.productName')}*</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addProduct.productNamePlaceholder')}
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

  {/* Category Dropdown */}
  <View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>{t('addProduct.category')}*</Text>
  {categories.length === 0 ? (
    // Show message when fetching is done but no categories found
    <View style={styles.dropdownPlaceholder}>
      <Text style={styles.noDataText}>{t('addProduct.noCategoriesFound')}</Text>
    </View>
  ) : (
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
        placeholder={t('addProduct.selectCategory')}
        searchPlaceholder={t('addProduct.search')}
        value={category}
        onChange={item => setCategory(item.value)}
        renderLeftIcon={() => (
          <Feather style={styles.dropdownIcon} name="grid" size={20} color="#64748b" />
        )}
      />
    )}
  </View>

  {/* Warehouse Dropdown */}
  <View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>{t('addProduct.warehouse')}*</Text>
  {warehouses.length === 0 ? (
    <View style={styles.dropdownPlaceholder}>
      <Text style={styles.noDataText}>{t('addProduct.noWarehousesFound')}</Text>
    </View>
  ) : (
    <Dropdown
      // ... your existing dropdown props
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
      placeholder={t('addProduct.selectWarehouse')}
      searchPlaceholder={t('addProduct.search')}
      value={warehouse}
      onChange={item => setWarehouse(item.value)}
      renderLeftIcon={() => (
        <Feather style={styles.dropdownIcon} name="archive" size={20} color="#64748b" />
      )}
      />
    )}
  </View>

  {/* Unit and quantity Row */}
  <View style={styles.row}>
    {/* Unit Dropdown */}
    <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
      <Text style={styles.inputLabel}>{t('addProduct.unit')}*</Text>
      <Dropdown
        style={styles.dropdown}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        iconStyle={styles.iconStyle}
        data={UNITS}
        labelField="label"
        valueField="value"
        placeholder={t('addProduct.selectUnit')}
        value={unit}
        onChange={item => setUnit(item.value)}
        renderLeftIcon={() => (
          <Feather style={styles.dropdownIcon} name="divide-square" size={20} color="#64748b" />
        )}
      />
    </View>

    {/* quantity Input */}
    <View style={[styles.inputContainer, { flex: 1 }]}>
      <Text style={styles.inputLabel}>{t('addProduct.quantity')}*</Text>
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
    {/* Buying Price */}
    <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
      <Text style={styles.inputLabel}>{t('addProduct.buyingPrice')}</Text>
      <View style={styles.priceInputContainer}>
        <Text style={styles.currencySymbol}>ETB</Text>
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder={t('addProduct.buyingPricePlaceholder')}
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={buyingPrice}
          onChangeText={setBuyingPrice}
        />
      </View>
    </View>

    {/* Selling Price */}
    <View style={[styles.inputContainer, { flex: 1 }]}>
      <Text style={styles.inputLabel}>{t('addProduct.sellingPrice')}</Text>
      <View style={styles.priceInputContainer}>
        <Text style={styles.currencySymbol}>ETB</Text>
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder={t('addProduct.sellingPricePlaceholder')}
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
    <Text style={styles.inputLabel}>{t('addProduct.brand')}</Text>
    <TextInput
      style={styles.input}
      placeholder={t('addProduct.brandPlaceholder')}
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
          disabled={isSubmitting} // prevent double taps
        >
          <LinearGradient
            colors={['#6d28d9', '#8b5cf6']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting ? t('addProduct.creating') : t('addProduct.createProduct')}
            </Text>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="plus-circle" size={22} color="#fff" />
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
},
priceInputContainer: {
  position: 'relative',
},
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    dropdownPlaceholder: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#64748b',
    fontSize: 16,
    fontStyle: 'italic',
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

export default AddProductScreen;