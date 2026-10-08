import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider, useApp } from './src/state/CartContext';
import { RootStackParamList } from './src/navigation/types';
import ShopScreen from './src/screens/ShopScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import OwnerScreen from './src/screens/OwnerScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import HeaderMenu from './src/components/HeaderMenu';
import StripeReturnHandler from './src/components/StripeReturnHandler';
import { colors } from './src/theme';
import { APP_MODE } from './src/config';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: colors.background },
  headerRight: () => <HeaderMenu />,
};

// Locks the role in context to match the build-time APP_MODE.
function RoleLock() {
  const { setRole } = useApp();
  useEffect(() => {
    if (APP_MODE) setRole(APP_MODE);
  }, []);
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <StripeReturnHandler />
          <RoleLock />
          <Stack.Navigator screenOptions={screenOptions}>
            {APP_MODE === 'owner' ? (
              // ── Owner build: only order-management screens ──
              <>
                <Stack.Screen name="Owner" component={OwnerScreen} options={{ title: 'Incoming Orders' }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
                {/* Keep these so deep-links / navigation calls don't crash */}
                <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Order Tracking' }} />
                <Stack.Screen name="Shop" component={ShopScreen} options={{ title: 'Shop (preview)' }} />
                <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Cart' }} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
                <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
                <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
              </>
            ) : APP_MODE === 'customer' ? (
              // ── Customer build: shopping + order-tracking screens ──
              <>
                <Stack.Screen name="Shop" component={ShopScreen} options={{ title: 'Fresh Dosa Batter' }} />
                <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Cart' }} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
                <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
                <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
                <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Order Tracking' }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
                {/* Keep so navigation calls don't crash */}
                <Stack.Screen name="Owner" component={OwnerScreen} options={{ title: 'Incoming Orders' }} />
              </>
            ) : (
              // ── Dev / unset: all screens + role-switch ──
              <>
                <Stack.Screen name="Shop" component={ShopScreen} options={{ title: 'Fresh Dosa Batter' }} />
                <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Cart' }} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
                <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
                <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
                <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Order Tracking' }} />
                <Stack.Screen name="Owner" component={OwnerScreen} options={{ title: 'Incoming Orders' }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </SafeAreaProvider>
  );
}
