/**
 * Product Renderer - Vercel Serverless Compatible
 * Usage:
 *   productRenderer.renderProducts('featured', { ids: [23, 25, 24] })
 *   productRenderer.renderProducts('top-picks', { category: 'saree', limit: 4 })
 *   productRenderer.renderProducts('trending', { keywords: 'kurti', limit: 6 })
 *   productRenderer.renderProducts('new-in', { limit: 8, sort: 'newest' })
 */

const productRenderer = (() => {
  const cache = {};
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const MAX_RETRIES = 2; // For serverless cold starts
  const RETRY_DELAY = 300; // ms

  // Generate cache key
  function getCacheKey(params) {
    return JSON.stringify(params);
  }

  // Check if cache is valid
  function isCacheValid(key) {
    if (!cache[key]) return false;
    return Date.now() - cache[key].timestamp < CACHE_DURATION;
  }

  // Build query string (matches api/products.js expectations)
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

  // Create product card HTML (updated for DB schema fields)
  function createProductCard(product) {
    const displayPrice = product.discount_price || product.price;
    const discount = product.discount_price 
      ? Math.round(((product.price - product.discount_price) / product.price) * 100) 
      : 0;

    const sizeLabels = Array.isArray(product.sizes)
      ? product.sizes.map(s => typeof s === 'string' ? s : s.name || s.size || String(s))
      : [];

    const defaultSize = sizeLabels.length > 0 ? sizeLabels[0] : 'One size';

    // Handle sizes array from DB
    const sizesHtml = sizeLabels.length > 0
      ? `<div class="sizes-preview">${sizeLabels.slice(0, 3).join(', ')}${sizeLabels.length > 3 ? '+' : ''}</div>`
      : '';

    return `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-image">
          <img src="${product.image_1}" alt="${product.title}" loading="lazy" onerror="this.src='/images/placeholder.webp'">
          ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
          ${product.stock === 0 ? `<span class="sold-out-badge">SOLD OUT</span>` : ''}
        </div>
        <div class="product-info">
          <h3>${product.title}</h3>
          <p class="category">${product.category || 'General'}</p>
          ${sizesHtml}
          <div class="price-section">
            <span class="price">₹${displayPrice}</span>
            ${product.discount_price ? `<span class="original-price">₹${product.price}</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-view-details" data-id="${product.id}">View Details</button>
            <button class="btn-secondary btn-add-cart"
              data-id="${product.id}"
              data-title="${product.title}"
              data-price="${displayPrice}"
              data-image="${product.image_1}"
              data-size="${defaultSize}">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Fetch with retry logic for serverless cold starts
  async function fetchWithRetry(url, retries = 0) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        // Vercel serverless functions may have cold starts
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      // Handle 503 (cold start) or 429 (rate limit)
      if ((response.status === 503 || response.status === 429) && retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
        return fetchWithRetry(url, retries + 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError' && retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
        return fetchWithRetry(url, retries + 1);
      }
      throw error;
    }
  }

  // Render products to container
  async function renderProducts(containerId, params = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container with ID '${containerId}' not found`);
      return;
    }

    const cacheKey = getCacheKey(params);

    // Check cache first
    if (isCacheValid(cacheKey)) {
      console.log('📦 Cache hit for:', containerId);
      container.innerHTML = cache[cacheKey].html;
      // Re-attach event listeners after cache render
      attachButtonListeners();
      return;
    }

    try {
      container.innerHTML = '<p class="loading">Loading products...</p>';

      const queryString = buildQueryString(params);
      const apiUrl = `/api/products?${queryString}`;
      
      console.log('🔍 Fetching:', apiUrl);
      const products = await fetchWithRetry(apiUrl);

      if (!products || products.length === 0) {
        container.innerHTML = '<p class="no-products">No products found</p>';
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
      
      // Attach click listeners after render
      attachButtonListeners();
      
    } catch (error) {
      console.error('❌ Error rendering products:', error);
      container.innerHTML = `
        <div class="error-state">
          <p>⚠️ Failed to load products</p>
          <button class="btn-retry" onclick="productRenderer.renderProducts('${containerId}', ${JSON.stringify(params).replace(/"/g, '&quot;')})">
            Try Again
          </button>
        </div>
      `;
    }
  }

  // Attach event listeners to dynamically rendered buttons
  function attachButtonListeners() {
    document.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const productId = btn.dataset.id;
        if (productId) {
          window.location.href = `/pages/product.html?id=${productId}`;
        }
      };
    });

    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        if (typeof cartManager === 'undefined') {
          alert('Cart is not available yet.');
          return;
        }

        const item = {
          product_id: btn.dataset.id,
          title: btn.dataset.title,
          quantity: 1,
          price: Number(btn.dataset.price),
          image: btn.dataset.image,
          size: btn.dataset.size || 'One size'
        };

        cartManager.addToCart(item);
        alert('Product added to cart!');
      };
    });
  }

  // Clear cache (useful after admin updates)
  function clearCache(key = null) {
    if (key) {
      delete cache[key];
      console.log('🗑️ Cache cleared for key:', key);
    } else {
      Object.keys(cache).forEach(k => delete cache[k]);
      console.log('🗑️ All cache cleared');
    }
  }

  // Refresh specific container (bypass cache)
  async function refresh(containerId, params = {}) {
    const cacheKey = getCacheKey(params);
    delete cache[cacheKey]; // Force fresh fetch
    return renderProducts(containerId, params);
  }

  // Public API
  return {
    renderProducts,
    refresh,
    clearCache,
    // Expose for debugging
    _cache: cache,
    _buildQueryString: buildQueryString
  };
})();

// Auto-attach listeners on initial page load
document.addEventListener('DOMContentLoaded', () => {
  // Handle browser back/forward cache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Re-attach listeners after bfcache restore
      document.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          const productId = btn.dataset.id;
          if (productId) {
            window.location.href = `/pages/product.html?id=${productId}`;
          }
        };
      });
    }
  });
});
