/**
 * Product Renderer - Universal rendering function with caching
 * Usage:
 *   productRenderer.renderProducts('featured', { ids: [23, 25, 24] })
 *   productRenderer.renderProducts('top-picks', { category: 'saree', limit: 4 })
 *   productRenderer.renderProducts('trending', { keywords: 'kurti', limit: 6 })
 *   productRenderer.renderProducts('new-in', { limit: 8, sort: 'newest' })
 */

const productRenderer = (() => {
  const cache = {};
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Generate cache key
  function getCacheKey(params) {
    return JSON.stringify(params);
  }

  // Check if cache is valid
  function isCacheValid(key) {
    if (!cache[key]) return false;
    return Date.now() - cache[key].timestamp < CACHE_DURATION;
  }

  // Build query string
  function buildQueryString(params) {
    const query = new URLSearchParams();
    
    if (params.ids) {
      query.append('ids', params.ids.join(','));
    }
    if (params.category) {
      query.append('category', params.category);
    }
    if (params.keywords) {
      query.append('keywords', params.keywords);
    }
    if (params.limit) {
      query.append('limit', params.limit);
    }
    if (params.sort) {
      query.append('sort', params.sort);
    }
    
    return query.toString();
  }

  // Create product card HTML
  function createProductCard(product) {
    const displayPrice = product.discount_price || product.price;
    const discount = product.discount_price 
      ? Math.round(((product.price - product.discount_price) / product.price) * 100) 
      : 0;

    return `
      <div class="product-card">
        <div class="product-image">
          <img src="${product.image_1}" alt="${product.title}">
          ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
        </div>
        <div class="product-info">
          <h3>${product.title}</h3>
          <p class="category">${product.category || 'General'}</p>
          <div class="price-section">
            <span class="price">₹${displayPrice}</span>
            ${product.discount_price ? `<span class="original-price">₹${product.price}</span>` : ''}
          </div>
          <button class="btn-view-details" onclick="window.location.href='/pages/product.html?id=${product.id}'">View Details</button>
        </div>
      </div>
    `;
  }

  // Render products to container
  async function renderProducts(containerId, params = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container with ID '${containerId}' not found`);
      return;
    }

    const cacheKey = getCacheKey(params);

    // Check cache
    if (isCacheValid(cacheKey)) {
      console.log('Using cached products for:', containerId);
      container.innerHTML = cache[cacheKey].html;
      return;
    }

    try {
      container.innerHTML = '<p>Loading products...</p>';

      const queryString = buildQueryString(params);
      const response = await fetch(`/api/products?${queryString}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const products = await response.json();

      if (!products || products.length === 0) {
        container.innerHTML = '<p>No products found</p>';
        return;
      }

      // Generate HTML
      const html = products.map(product => createProductCard(product)).join('');

      // Cache the result
      cache[cacheKey] = {
        html: html,
        timestamp: Date.now()
      };

      container.innerHTML = html;
    } catch (error) {
      console.error('Error rendering products:', error);
      container.innerHTML = '<p>Error loading products. Please try again.</p>';
    }
  }

  // Clear cache
  function clearCache() {
    Object.keys(cache).forEach(key => delete cache[key]);
    console.log('Cache cleared');
  }

  // Public API
  return {
    renderProducts,
    clearCache
  };
})();