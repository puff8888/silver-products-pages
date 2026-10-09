import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    // Load from localStorage if available
    try {
      const stored = localStorage.getItem('silversurface_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('silversurface_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, swatchId, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.swatchId === swatchId);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id && item.swatchId === swatchId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, swatchId, quantity }];
    });
  };

  const removeFromCart = (productId, swatchId) => {
    setCartItems(prev => prev.filter(item => !(item.product.id === productId && item.swatchId === swatchId)));
  };

  const updateQuantity = (productId, swatchId, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems(prev => prev.map(item => 
      item.product.id === productId && item.swatchId === swatchId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const clearCart = () => setCartItems([]);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
