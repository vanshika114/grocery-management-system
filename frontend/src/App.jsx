import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store, ShoppingCart, Package, Plus, Trash2, Sparkles, Clock, Receipt, Search, ChevronRight, Leaf, Archive, RotateCcw, AlertTriangle, Download, Heart } from 'lucide-react';
import UiverseButton from '@/components/UiverseButton';
import ThemeToggle from '@/components/ThemeToggle';
import NotFound from '@/pages/NotFound';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import OrderRowSkeleton from '@/components/OrderRowSkeleton';
import ExportButton from '@/components/ui/ExportButton';
import NotificationBell from '@/components/NotificationBell';
import SearchBar from '@/components/SearchBar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { downloadReceiptPdf } from '@/lib/receipt';

const API_URL = 'http://127.0.0.1:5000/api';

const CATEGORIES = [
  'Dairy', 'Beverages', 'Snacks', 'Fruits and Vegetables',
  'Grains and Cereals', 'Bakery', 'Meat and Seafood',
  'Frozen Foods', 'Household', 'Other'
];

const CATEGORY_EMOJI = {
  'Dairy': '🥛', 'Beverages': '🧃', 'Snacks': '🍿',
  'Fruits and Vegetables': '🥬', 'Grains and Cereals': '🌾',
  'Bakery': '🥖', 'Meat and Seafood': '🥩',
  'Frozen Foods': '🧊', 'Household': '🏠', 'Other': '📦'
};

// Resolves the current view from the URL hash
const getViewFromHash = () => {
  const hash = window.location.hash;
  if (hash === '#/admin') return 'admin';
  if (hash === '#/wishlist') return 'wishlist';
  if (!hash || hash === '#/' || hash === '#/shop') return 'customer';
  return 'notfound';
};

export default function App() {
  const [view, setView] = useState(getViewFromHash);
  const [inventory, setInventory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);

  const [newItem, setNewItem] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCategory, setNewCategory] = useState('Other');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('none'); // 'none' | 'asc' | 'desc'
  const [wishlist, setWishlist] = useState([]); // array of item names
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('All');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [actionToast, setActionToast] = useState(null); // { message, type: 'success'|'error' }

  const loadData = async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    try {
      const prodRes = await fetch(`${API_URL}/products`);
      if (prodRes.ok) setInventory(await prodRes.json());
      
      const cartRes = await fetch(`${API_URL}/cart`);
      if (cartRes.ok) {
        const data = await cartRes.json();
        setCart(data.cart);
        setTotalPrice(data.total_price);
      }

      const ordersRes = await fetch(`${API_URL}/orders`);
      if (ordersRes.ok) setOrders(await ordersRes.json());

      const archivedRes = await fetch(`${API_URL}/products/archived`);
      if (archivedRes.ok) setArchivedProducts(await archivedRes.json());
    } catch (e) {
      console.error('API Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => setActionToast(null), 3000);
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/analytics`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) {
      console.error('Analytics API Error:', e);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Fetch analytics whenever the admin view becomes active
  useEffect(() => {
    if (view === 'admin') loadAnalytics();
  }, [view]);

  // Sync view with hash changes (back/forward navigation + direct URL edits)
  useEffect(() => {
    if (!window.location.hash) window.location.hash = '#/shop';
    const onHashChange = () => setView(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const addToCart = async (item) => {
    await fetch(`${API_URL}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, qty: 1 })
    });
    loadData();
  };

  const toggleWishlist = (item) => {
    setWishlist(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const updateCartQty = async (item, qty) => {
    await fetch(`${API_URL}/cart/${item}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: parseInt(qty) })
    });
    loadData();
  };

  const removeFromCart = async (item) => {
    await fetch(`${API_URL}/cart/${item}`, { method: 'DELETE' });
    loadData();
  };

  const handleCheckout = async () => {
    const res = await fetch(`${API_URL}/checkout`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setCheckoutSuccess(true);
      setTimeout(() => setCheckoutSuccess(false), 3000);
      loadData();
    } else {
      alert(data.message);
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'admin123' },
        body: JSON.stringify({ item: newItem, price: parseFloat(newPrice), qty: parseInt(newQty), category: newCategory, image_url: newImageUrl })
      });
      const data = await res.json();
      showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) {
        setNewItem(''); setNewPrice(''); setNewQty(''); setNewCategory('Other'); setNewImageUrl('');
      }
    } catch (err) {
      showToast('Network error — could not add product.', 'error');
    }
    await loadData();
  };

  const updateProductPrice = async (item, price) => {
    await fetch(`${API_URL}/products/${item}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'admin123' },
      body: JSON.stringify({ price: parseFloat(price) })
    });
    await loadData();
  };

  const updateProductQty = async (item, qty) => {
    await fetch(`${API_URL}/products/${item}/qty`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'admin123' },
      body: JSON.stringify({ qty: parseInt(qty) })
    });
    await loadData();
  };


  const deleteProduct = async (item) => {
    const res = await fetch(`${API_URL}/products/${item}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': 'admin123' }
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadData();
  };

  const restoreProduct = async (item) => {
    const res = await fetch(`${API_URL}/products/${item}/restore`, {
      method: 'POST',
      headers: { 'X-Admin-Password': 'admin123' }
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadData();
  };

  const permanentlyDeleteProduct = async (item) => {
    if (!window.confirm(`⚠️ Permanently delete "${item}"? This cannot be undone.`)) return;
    const res = await fetch(`${API_URL}/products/${item}/permanent`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': 'admin123' }
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadData();
  };

  const cartItemCount = Object.values(cart).reduce((sum, [, qty]) => sum + qty, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30 text-slate-800 dark:text-slate-100 flex flex-col items-center overflow-x-hidden font-sans selection:bg-violet-200 relative">
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-violet-200/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute top-[50%] left-[50%] w-[400px] h-[400px] bg-amber-100/20 rounded-full blur-[100px]"></div>
      </div>
      
      {/* Checkout success toast */}
      {checkoutSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-3 animate-bounce">
          <span className="text-xl">✓</span>
          <span className="font-semibold">Order placed successfully!</span>
        </div>
      )}

      {/* Action toast (archive / restore / delete) */}
      {actionToast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce ${
          actionToast.type === 'success'
            ? 'bg-violet-600 text-white shadow-violet-500/20'
            : 'bg-red-500 text-white shadow-red-500/20'
        }`}>
          <span className="text-xl">{actionToast.type === 'success' ? '✓' : '✕'}</span>
          <span className="font-semibold">{actionToast.message}</span>
        </div>
      )}
      
      <div className="w-full max-w-7xl p-4 sm:p-6 lg:p-8 relative z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center py-5 px-8 mb-8 bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xl rounded-2xl shadow-sm gap-5">
          <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/20">
              <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            Stock Smart
          </div>

          {/* NEW: search bar, only makes sense on the Shop view */}
          {view === 'customer' && (
      <div className="w-full md:w-auto md:flex-1 md:max-w-md">
        <SearchBar value={searchQuery} onSearch={setSearchQuery} />
        </div>
      )} 
          <div className="flex items-center gap-3">
            <nav className="flex gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              <button 
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${view === 'customer' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-md shadow-slate-200/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                onClick={() => { window.location.hash = '#/shop'; }}>
                🛒 Shop
              </button>
              <button 
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${view === 'admin' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-md shadow-slate-200/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                onClick={() => { window.location.hash = '#/admin'; }}>
                <Heart className="w-4 h-4" /> Wishlist
                {wishlist.length > 0 && (
                  <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{wishlist.length}</span>
                )}
              </button>
              <button 
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${view === 'admin' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-md shadow-slate-200/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                onClick={() => { window.location.hash = '#/admin'; }}>
                📊 Dashboard
              </button>
            </nav>
            {view === 'admin' && <NotificationBell />}
            <ThemeToggle />
          </div>
        </header>

        {view === 'customer' && (
          <>
            {/* Category Filter Pills */}
            <div className="mb-8 flex items-center gap-2 overflow-x-auto w-full px-1 py-1">
              <button 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 border ${selectedCategory === 'All' ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 shadow-sm'}`}
                onClick={() => setSelectedCategory('All')}>
                ✨ All
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 border ${selectedCategory === 'All' ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 shadow-sm'}`}
                  onClick={() => setSelectedCategory(cat)}>
                  {CATEGORY_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Product Grid Panel */}
              <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                      <Store className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Fresh Products</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                      >
                      <option value="none">Sort: Default</option>
                      <option value="asc">Price: Low to High</option>
                      <option value="desc">Price: High to Low</option>
                    </select>
                  
                  <span className="text-sm text-slate-400 font-medium">
                    {Object.keys(inventory).filter(item => {
                      const [, , category = 'Other'] = inventory[item];
                      return selectedCategory === 'All' || category === selectedCategory;
                    }).length} items
                  </span>
                </div>
                </div>

                
                <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {isLoading ? (
                    [...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)
                  ) : Object.keys(inventory).length === 0 ? (
                     <div className="col-span-full text-center text-slate-400 py-16 flex flex-col items-center gap-4">
                       <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                         <Sparkles className="w-7 h-7 text-slate-300" />
                       </div>
                       <p className="font-medium">No products available yet</p>
                       <p className="text-sm text-slate-400">Check back soon!</p>
                     </div>
                  ) : Object.keys(inventory).filter(item => {
                      const [, , category = 'Other'] = inventory[item];
                      const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
                      const matchesSearch = item.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesCategory && matchesSearch;
                    }).length === 0 ? (
                     <div className="col-span-full text-center text-slate-400 py-16 flex flex-col items-center gap-4">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                         <Search className="w-7 h-7 text-slate-300" />
                       </div>
                       <p className="font-medium text-slate-700 dark:text-slate-350">No products found</p>
                       <p className="text-sm text-slate-400">Try adjusting your search query or category filter</p>
                     </div>
                  ) : (
                    Object.keys(inventory).filter(item => {
                      const [, , category = 'Other'] = inventory[item];
                      const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
                      const matchesSearch = item.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesCategory && matchesSearch;
                    }).sort((a, b) => {
                      if (sortOrder === 'none') return 0;
                      const priceA = inventory[a][0];
                      const priceB = inventory[b][0];
                      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
                    }).map(item => {
                      const [price, qty, category = 'Other', imageUrl = ''] = inventory[item];
                      return (
                        <div key={item} className="group relative border border-slate-200/60 dark:border-slate-700/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80 hover:border-violet-300 dark:hover:border-violet-600 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-100/50 dark:hover:shadow-violet-900/30 transition-all duration-400 flex flex-col">
                          
                          {/* Product Image */}
                          
                          <div className="w-full h-36 bg-gradient-to-br from-slate-100 to-violet-50 dark:from-slate-700 dark:to-violet-900/30 flex items-center justify-center overflow-hidden relative">

                         {/* Wishlist button */}
                            <button
                              type="button"
                              onClick={() => toggleWishlist(item)}
                              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                              title={wishlist.includes(item) ? 'Remove from wishlist' : 'Add to wishlist'}
                              >
                              <Heart
                                className={`w-4 h-4 ${
                                  wishlist.includes(item)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-slate-400'
                                }`}
                                />
                            </button>
                            {/* Product image */}
                            {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={item}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }}
                              />
                            <div
                              className="absolute inset-0 items-center justify-center text-5xl"
                              style={{ display: 'none' }}
                              >
                              {CATEGORY_EMOJI[category] || '📦'}
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-5xl">
                            {CATEGORY_EMOJI[category] || '📦'}
                          </div>
                        )}
                          </div>

                          <div className="p-5 flex flex-col flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100 capitalize text-base mb-0.5 text-center">{item}</div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400 mb-4 text-center">{category}</div>
                            
                            <div className="flex items-end justify-center gap-0.5 mb-4">
                              <span className="text-sm text-slate-400 mb-0.5 font-medium">$</span>
                              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{price}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-5 bg-slate-50 dark:bg-slate-700/50 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-600/50">
                              <span className="font-medium">In Stock</span>
                              <span className={qty > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{qty > 0 ? `${qty} units` : 'Sold Out'}</span>
                            </div>

                            <UiverseButton className="w-full text-sm font-semibold h-11 mt-auto" disabled={qty === 0} onClick={() => addToCart(item)}>
                              <Plus className="w-4 h-4 mr-1.5"/> Add to Cart
                            </UiverseButton>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
              
              {/* Cart Panel */}
              <div>
                <div className="sticky top-6 bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-7 shadow-sm">
                  <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-100 rounded-xl">
                        <ShoppingCart className="w-5 h-5 text-amber-600" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Cart</h2>
                    </div>
                    {cartItemCount > 0 && (
                      <span className="bg-violet-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{cartItemCount}</span>
                    )}
                  </div>
                  
                  <div className="max-h-[420px] overflow-y-auto pr-1 flex flex-col gap-3 mb-6 custom-scrollbar">
                    {Object.keys(cart).length === 0 ? (
                      <div className="text-slate-400 text-sm text-center py-10 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl">🛒</div>
                        <p>Your cart is empty</p>
                        <button
                          onClick={() => document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' })}
                          className="mt-1 px-4 py-2 rounded-xl bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition-colors"
                        >
                          Browse Products
                        </button>
                      </div>
                    ) : (
                      Object.keys(cart).map(item => {
                        const cartItem = cart[item];
                        const price = Array.isArray(cartItem) ? cartItem[0] : cartItem.price;
                        const qty = Array.isArray(cartItem) ? cartItem[1] : (cartItem.quantity ?? cartItem.qty);
                        return (
                          <div key={item} className="flex justify-between items-center p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group">
                            <div>
                              <div className="font-semibold text-slate-700 dark:text-slate-200 capitalize text-sm">{item}</div>
                              <div className="text-xs font-medium text-slate-400 mt-0.5">${price} <span className="text-slate-300 mx-0.5">×</span> {qty} = <span className="text-violet-600 font-semibold">${(price * qty).toFixed(2)}</span></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                className="w-14 h-8 bg-white border-slate-200 text-slate-700 text-sm px-2 text-center rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-400" 
                                value={qty} 
                                onChange={(e) => updateCartQty(item, e.target.value)}
                                min="0"
                              />
                              <button className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors" onClick={() => removeFromCart(item)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 border border-violet-100 dark:border-violet-800/50 flex justify-between items-center text-sm font-semibold text-slate-700 dark:text-slate-200 mb-5">
                    <span>Total</span>
                    <span className="text-xl font-extrabold text-violet-700">${totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <UiverseButton className="w-full text-sm font-semibold h-12" disabled={Object.keys(cart).length === 0} onClick={handleCheckout}>
                    Checkout <ChevronRight className="w-4 h-4 ml-1" />
                  </UiverseButton>
                </div>
              </div>
            </div>

            {/* Customer Order History */}
            {orders.length > 0 && (
              <div className="mt-8 bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-7">
                  <div className="p-2.5 bg-emerald-100 rounded-xl">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Recent Orders</h2>
                </div>
                
                <div className="space-y-3">
                  {orders.map((order, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                      <div>
                        <div className="font-bold text-slate-700 mb-0.5 flex items-center gap-2">
                          <span className="text-violet-600">#{order.id}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">{order.timestamp}</div>
                      </div>
                      <div className="flex-1 max-w-md">
                        <div className="text-sm text-slate-500 leading-relaxed">
                          {order.items.map(item => `${item.qty}× ${item.item}`).join(' · ')}
                        </div>
                      </div>
                      <div className="text-emerald-600 font-extrabold text-lg bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                        ${order.total.toFixed(2)}
                      </div>
                      <button
                        onClick={() => downloadReceiptPdf(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Receipt
                        </button>
                        
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'admin' && (
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Add Product Panel */}
            <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-7">
                <div className="p-2.5 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                  <Plus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Add New Product</h2>
              </div>
              
              <form onSubmit={addProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                <Input placeholder="Product name" className="md:col-span-1 bg-white border-slate-200 text-slate-700 h-12 rounded-xl focus:border-violet-400 focus:ring-1 focus:ring-violet-400 placeholder:text-slate-400" value={newItem} onChange={e => setNewItem(e.target.value)} required />
                <Input type="number" step="0.01" min="0" placeholder="Price ($)" className="md:col-span-1 bg-white border-slate-200 text-slate-700 h-12 rounded-xl focus:border-violet-400 focus:ring-1 focus:ring-violet-400 placeholder:text-slate-400" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
                <Input type="number" min="1" placeholder="Stock qty" className="md:col-span-1 bg-white border-slate-200 text-slate-700 h-12 rounded-xl focus:border-violet-400 focus:ring-1 focus:ring-violet-400 placeholder:text-slate-400" value={newQty} onChange={e => setNewQty(e.target.value)} required />
                <select className="md:col-span-1 bg-white border-slate-200 text-slate-700 rounded-xl px-4 border text-sm h-12 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_EMOJI[cat]} {cat}</option>)}
                </select>
                <Input placeholder="Image URL (optional)" className="md:col-span-1 bg-white border-slate-200 text-slate-700 h-12 rounded-xl focus:border-violet-400 focus:ring-1 focus:ring-violet-400 placeholder:text-slate-400" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} />
                <UiverseButton type="submit" className="md:col-span-1 h-12 text-sm font-semibold rounded-xl">Add Product</UiverseButton>
              </form>
            </div>

            {/* Inventory Panel */}
            <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-7">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Inventory</h2>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <SearchBar value={searchQuery} onSearch={setSearchQuery} placeholder="Search inventory..." />
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <Search className="w-4 h-4 text-slate-400 ml-2" />
                    <select className="bg-transparent border-0 text-slate-600 rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer" value={adminCategoryFilter} onChange={e => setAdminCategoryFilter(e.target.value)}>
                      <option value="All">All Categories</option>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                    {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
                  </div>
                ) : (
                  <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50">
                      <TableHead className="text-slate-500 font-semibold h-12 px-6 text-xs uppercase tracking-wider">Product</TableHead>
                      <TableHead className="text-slate-500 font-semibold h-12 text-xs uppercase tracking-wider">Category</TableHead>
                      <TableHead className="text-slate-500 font-semibold text-right h-12 text-xs uppercase tracking-wider">Price</TableHead>
                      <TableHead className="text-slate-500 font-semibold text-right h-12 text-xs uppercase tracking-wider">Stock</TableHead>
                      <TableHead className="h-12 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(inventory).filter(item => {
                      const [, , category = 'Other'] = inventory[item];
                      return adminCategoryFilter === 'All' || category === adminCategoryFilter;
                    }).length === 0 ? (
                      <TableRow className="border-0">
                        <TableCell colSpan={5} className="text-center py-16 text-slate-400">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                              <Sparkles className="w-5 h-5 text-slate-300" />
                            </div>
                            <span className="font-medium">No products match this filter</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.keys(inventory).filter(item => {
                        const [, , category = 'Other'] = inventory[item];
                        return adminCategoryFilter === 'All' || category === adminCategoryFilter;
                      }).map(item => {
                        const [price, qty, category = 'Other'] = inventory[item];
                        return (
                          <TableRow key={item} className="border-slate-100 hover:bg-violet-50/30 transition-colors group">
                            <TableCell className="capitalize font-semibold text-slate-700 px-6 py-4">
                              <span className="mr-2">{CATEGORY_EMOJI[category] || '📦'}</span>
                              {item}
                            </TableCell>
                            <TableCell>
                              <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-[11px] font-bold tracking-wider uppercase">
                                {category}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-slate-400 text-sm">$</span>
                                <Input type="number" step="0.01" className="w-24 h-9 bg-slate-50 border-slate-200 text-slate-700 text-right px-3 rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-400" defaultValue={price} onBlur={(e) => updateProductPrice(item, e.target.value)} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Input type="number" className="w-20 ml-auto h-9 bg-slate-50 border-slate-200 text-slate-700 text-right px-3 rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-400" defaultValue={qty} onBlur={(e) => updateProductQty(item, e.target.value)} />
                            </TableCell>
                            <TableCell className="text-right px-4 py-4">
                              <button
                                className="text-slate-300 hover:text-amber-500 p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                onClick={() => deleteProduct(item)}
                                title="Archive product"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
                )}
              </div>
            </div>

            {/* Archived Products Panel */}
            <div className="bg-white/60 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-700/40 backdrop-blur-xl rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                    <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Archived Products</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Restore or permanently delete archived items</p>
                  </div>
                  {archivedProducts.length > 0 && (
                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-700">
                      {archivedProducts.length}
                    </span>
                  )}
                </div>
                <button
                  id="toggle-archived-panel"
                  className="text-sm font-semibold px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center gap-2"
                  onClick={() => setShowArchived(v => !v)}
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
              </div>

              {showArchived && (
                archivedProducts.length === 0 ? (
                  <div className="text-center py-14 flex flex-col items-center gap-3 text-slate-400">
                    <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                      <Archive className="w-6 h-6 text-amber-300" />
                    </div>
                    <p className="font-medium">No archived products</p>
                    <p className="text-sm">Archived products will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-amber-100 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-900/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-amber-100 dark:border-amber-800/50 hover:bg-transparent bg-amber-50/60 dark:bg-amber-900/20">
                          <TableHead className="text-amber-600 dark:text-amber-400 font-semibold h-12 px-6 text-xs uppercase tracking-wider">Product</TableHead>
                          <TableHead className="text-amber-600 dark:text-amber-400 font-semibold h-12 text-xs uppercase tracking-wider">Category</TableHead>
                          <TableHead className="text-amber-600 dark:text-amber-400 font-semibold text-right h-12 text-xs uppercase tracking-wider">Price</TableHead>
                          <TableHead className="text-amber-600 dark:text-amber-400 font-semibold text-right h-12 text-xs uppercase tracking-wider">Stock (at archive)</TableHead>
                          <TableHead className="h-12 w-40 text-amber-600 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedProducts.map(product => (
                          <TableRow
                            key={product.name}
                            className="border-amber-100/60 dark:border-amber-800/30 hover:bg-amber-50/60 dark:hover:bg-amber-900/20 transition-colors group"
                          >
                            <TableCell className="capitalize font-semibold text-slate-600 dark:text-slate-300 px-6 py-4">
                              <span className="mr-2">{CATEGORY_EMOJI[product.category] || '📦'}</span>
                              <span className="line-through opacity-60">{product.name}</span>
                            </TableCell>
                            <TableCell>
                              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-[11px] font-bold tracking-wider uppercase">
                                {product.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4 text-slate-500 dark:text-slate-400 font-medium">
                              ${product.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right py-4 text-slate-500 dark:text-slate-400 font-medium">
                              {product.quantity} units
                            </TableCell>
                            <TableCell className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  id={`restore-${product.name}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                                  onClick={() => restoreProduct(product.name)}
                                  title="Restore product"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restore
                                </button>
                                <button
                                  id={`delete-forever-${product.name}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                                  onClick={() => permanentlyDeleteProduct(product.name)}
                                  title="Permanently delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Forever
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              )}
            </div>
            {/* Analytics Dashboard — above Order Ledger */}
            <AnalyticsDashboard analyticsData={analyticsData} />

            <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-7">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                    <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Order Ledger</h2>
                </div>
                <ExportButton
                  label="Export Orders CSV"
                  endpoint={`${API_URL}/orders/export`}
                  filename={`orders-report-${new Date().toISOString().split('T')[0]}.csv`}
                />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50">
                      <TableHead className="text-slate-500 font-semibold h-12 px-6 text-xs uppercase tracking-wider">Order ID</TableHead>
                      <TableHead className="text-slate-500 font-semibold h-12 text-xs uppercase tracking-wider">Date & Time</TableHead>
                      <TableHead className="text-slate-500 font-semibold h-12 text-xs uppercase tracking-wider">Items</TableHead>
                      <TableHead className="text-slate-500 font-semibold text-right h-12 pr-6 text-xs uppercase tracking-wider">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)
                    ) : orders.length === 0 ? (
                      <TableRow className="border-0">
                        <TableCell colSpan={4} className="text-center py-14 text-slate-400 font-medium">No orders yet</TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order, i) => (
                        <TableRow key={i} className="border-slate-100 hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="font-bold text-violet-600 px-6 py-4">#{order.id}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{order.timestamp}</TableCell>
                          <TableCell className="text-slate-500 text-sm max-w-xs">
                            {order.items.map(item => `${item.qty}× ${item.item}`).join(' · ')}
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4 font-bold text-emerald-600">
                            ${order.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

          </div>
        )}
      </div>
      
      {/* Scrollbar styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}
