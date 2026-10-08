import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PRODUCTS, Product, formatPrice } from '../data/products';
import { useCart } from '../state/CartContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;

function ProductCard({ product }: { product: Product }) {
  const { add, decrement, quantityOf } = useCart();
  const qty = quantityOf(product.id);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{product.name}</Text>
        <Text style={styles.cardPrice}>{formatPrice(product.price)}</Text>
      </View>
      <Text style={styles.cardDesc}>{product.description}</Text>

      {qty === 0 ? (
        <TouchableOpacity style={styles.addButton} onPress={() => add(product)}>
          <Text style={styles.addButtonText}>Add to cart</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => decrement(product.id)}
          >
            <Text style={styles.stepButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepQty}>{qty}</Text>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => add(product)}
          >
            <Text style={styles.stepButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ShopScreen({ navigation }: Props) {
  const { itemCount, total } = useCart();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.tagline}>Ground fresh, ready for pickup in Dresden</Text>
      </View>

      <FlatList
        data={PRODUCTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.list}
      />

      {itemCount > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartBarText}>
            {itemCount} item{itemCount > 1 ? 's' : ''} · {formatPrice(total)}
          </Text>
          <Text style={styles.cartBarCta}>View cart ›</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  brand: { fontSize: 28, fontWeight: '800', color: colors.text },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 4 },
  list: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: colors.primary },
  cardDesc: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 14 },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  stepQty: { minWidth: 44, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartBarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cartBarCta: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
