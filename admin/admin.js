/**
 * Admin Dashboard - Product Management
 */

let products = [];
let orders = [];

document.addEventListener('DOMContentLoaded', () => {
  // Setup menu navigation
  document.querySelectorAll('.menu-item').forEach(button => {
    button.addEventListener('click', (e) => {
      document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      
      e.target.classList.add('active');
      const section = e.target.dataset.section;
      document.getElementById(section).classList.add('active');
    });
  });

  // Load initial data
  loadProducts();
  loadOrders();

  // Form handlers
  document.getElementById('product-form').addEventListener('submit', handleAddProduct);
  document.getElementById('add-size-btn').addEventListener('click', addSizeInput);

  // Add initial size input
  addSizeInput();
});

// Load products from API
async function loadProducts() {
  try {
    const response = await fetch('/api/products?limit=100');
    products = await response.json();
    displayProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Display products in table
function displayProducts() {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';

  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${product.image_1}" alt="${product.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
      <td>${product.title}</td>
      <td>${product.category}</td>
      <td>₹${product.price}</td>
      <td><a href="#" onclick="viewProductStock('${product.id}')">View</a></td>
      <td>
        <button onclick="editProduct('${product.id}')" class="btn-small">Edit</button>
        <button onclick="deleteProduct('${product.id}')" class="btn-small btn-danger">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Load orders from API
async function loadOrders() {
  try {
    const response = await fetch('/api/orders');
    orders = await response.json();
    displayOrders();
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

// Display orders in table
function displayOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  tbody.innerHTML = '';

  orders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('en-IN');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.id.substring(0, 8)}...</td>
      <td>${order.customer_email || 'N/A'}</td>
      <td>₹${order.total}</td>
      <td><span class="status-badge status-${order.status}">${order.status}</span></td>
      <td>${date}</td>
      <td>
        <button onclick="viewOrder('${order.id}')" class="btn-small">View</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Add size input
function addSizeInput() {
  const container = document.getElementById('sizes-container');
  const input = document.createElement('div');
  input.className = 'size-input';
  input.innerHTML = `
    <input type="text" placeholder="Size (e.g., S, M, L, 28, 30)" class="size-name">
    <input type="number" placeholder="Stock Qty" min="0" class="stock-qty">
    <button type="button" onclick="this.parentElement.remove()" class="btn-small btn-danger">Remove</button>
  `;
  container.appendChild(input);
}

// Handle add product
async function handleAddProduct(e) {
  e.preventDefault();

  const sizes = [];
  document.querySelectorAll('.size-input').forEach(input => {
    const name = input.querySelector('.size-name').value;
    const qty = input.querySelector('.stock-qty').value;
    if (name && qty) {
      sizes.push({ size: name, stock_qty: parseInt(qty) });
    }
  });

  const productData = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    long_description: document.getElementById('long_description').value,
    care_instructions: document.getElementById('care_instructions').value,
    category: document.getElementById('category').value,
    keywords: document.getElementById('keywords').value.split(',').map(k => k.trim()),
    price: parseFloat(document.getElementById('price').value),
    discount_price: document.getElementById('discount_price').value ? parseFloat(document.getElementById('discount_price').value) : null,
    image_1: document.getElementById('image_1').value,
    image_2: document.getElementById('image_2').value || null,
    image_3: document.getElementById('image_3').value || null,
    image_4: document.getElementById('image_4').value || null,
    image_5: document.getElementById('image_5').value || null,
    sizes: sizes
  };

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (response.ok) {
      alert('Product added successfully!');
      document.getElementById('product-form').reset();
      document.getElementById('sizes-container').innerHTML = '';
      addSizeInput();
      loadProducts();
    } else {
      alert('Error adding product');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error adding product');
  }
}

// Delete product
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Product deleted successfully!');
      loadProducts();
    } else {
      alert('Error deleting product');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// View product stock
function viewProductStock(productId) {
  alert('View stock details for product: ' + productId);
  // Could open a modal with detailed stock info
}

// View order
function viewOrder(orderId) {
  alert('View order: ' + orderId);
  // Could open a modal with order details
}

// Edit product
function editProduct(productId) {
  alert('Edit product: ' + productId);
  // Could open a modal to edit product
}
