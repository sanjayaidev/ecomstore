/**
 * Cart Manager - Handles shopping cart operations
 * Features:
 *   - Add/remove items
 *   - Update quantities
 *   - Persistent localStorage storage
 *   - Cart update events
 */

const cartManager = (() => {
  const CART_KEY = 'cart';

  // Add item to cart
  function addToCart(item) {
    let cart = getCart();
    
    // Check if item already exists (same product + size)
    const existingIndex = cart.findIndex(
      i => i.product_id === item.product_id && i.size === item.size
    );

    if (existingIndex >= 0) {
      // Update quantity
      cart[existingIndex].quantity += item.quantity;
    } else {
      // Add new item
      cart.push(item);
    }

    saveCart(cart);
    dispatchCartUpdate();
    return cart;
  }

  // Remove item from cart
  function removeFromCart(index) {
    let cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    dispatchCartUpdate();
    return cart;
  }

  // Update item quantity
  function updateQuantity(index, quantity) {
    let cart = getCart();
    if (quantity > 0) {
      cart[index].quantity = quantity;
      saveCart(cart);
      dispatchCartUpdate();
    } else {
      removeFromCart(index);
    }
    return cart;
  }

  // Get cart from localStorage
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (error) {
      console.error('Error reading cart:', error);
      return [];
    }
  }

  // Save cart to localStorage
  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  // Clear cart
  function clearCart() {
    localStorage.removeItem(CART_KEY);
    dispatchCartUpdate();
  }

  // Get cart totals
  function getCartTotals() {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shipping = 100;
    const total = subtotal + tax + shipping;

    return {
      subtotal,
      tax,
      shipping,
      total,
      itemCount: cart.length,
      items: cart
    };
  }

  // Dispatch custom event
  function dispatchCartUpdate() {
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: getCartTotals()
    }));
  }

  // Public API
  return {
    addToCart,
    removeFromCart,
    updateQuantity,
    getCart,
    clearCart,
    getCartTotals
  };
})();