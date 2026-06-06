"use client";
 
import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, Product } from '../../../lib/supabaseClient';
import { Plus, Package, Trash, Edit, Search } from 'lucide-react';
import CompetitorMonitor from '../../../components/CompetitorMonitor';
 
export default function ProductsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [monitoringProduct, setMonitoringProduct] = useState<Product | null>(null);
 
  // Form State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('Textile');
  const [productDesc, setProductDesc] = useState('');
  const [productStock, setProductStock] = useState('15');
  const [productImg, setProductImg] = useState('👕');
  const [productImageUrl, setProductImageUrl] = useState('');
 
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 120;
          const MAX_HEIGHT = 120;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setProductImageUrl(compressedBase64);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
 
  useEffect(() => {
    const loadStoreAndProducts = async () => {
      setLoading(true);
      let activeId = 'store-1';
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) activeId = saved;
      }
 
      const allStores = await db.getStores();
      const currentStore = allStores.find(s => s.id === activeId) || allStores[0];
      if (currentStore) {
        setStore(currentStore);
        const data = await db.getProducts(currentStore.id);
        setProducts(data);
      }
      setLoading(false);
    };
 
    loadStoreAndProducts();
  }, []);
 
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !productName.trim() || !productPrice.trim()) return;
 
    if (editingProduct) {
      await db.updateProduct(editingProduct.id, {
        name: productName,
        price: parseFloat(productPrice),
        category: productCategory,
        description: productDesc,
        stock: parseInt(productStock) || 10,
        image: productImg,
        image_url: productImageUrl
      });
      setEditingProduct(null);
    } else {
      await db.addProduct({
        store_id: store.id,
        name: productName,
        price: parseFloat(productPrice),
        category: productCategory,
        description: productDesc || 'Imported catalog item.',
        stock: parseInt(productStock) || 10,
        image: productImg,
        image_url: productImageUrl
      });
    }
 
    // Reset Form
    setProductName('');
    setProductPrice('');
    setProductDesc('');
    setProductStock('15');
    setProductImageUrl('');
    setShowAddForm(false);
     
    // Reload items
    const data = await db.getProducts(store.id);
    setProducts(data);
  };
 
  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setProductName(prod.name);
    setProductPrice(String(prod.price));
    setProductCategory(prod.category);
    setProductDesc(prod.description);
    setProductStock(String(prod.stock));
    setProductImg(prod.image);
    setProductImageUrl(prod.image_url || '');
    setShowAddForm(true);
  };
 
  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const success = await db.deleteProduct(id);
      if (success && store) {
        const data = await db.getProducts(store.id);
        setProducts(data);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
        <h3>Loading inventory...</h3>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Product Catalog</h1>
            <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>Add items and verify stock availability.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingProduct(null); setShowAddForm(true); }}>
            <Plus size={16} /> Add Product
          </button>
        </div>

        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '550px', background: '#0b0f19', color: '#f3f4f6' }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>
                  {editingProduct ? 'Edit Catalog Item' : 'New Catalog Item'}
                </h3>
                <button 
                  onClick={() => { setShowAddForm(false); setEditingProduct(null); }}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleAddProduct}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Product Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Leather Cover" 
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Price ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        placeholder="e.g. 29.99" 
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Stock Units</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={productStock}
                        onChange={(e) => setProductStock(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Category</label>
                      <select className="form-control" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                        <option value="Textile">Textile</option>
                        <option value="Building Materials">Building Materials</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Drone">Drone</option>
                        <option value="Bubble Tea">Bubble Tea</option>
                        <option value="Architecture Equipment">Architecture Equipment</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Logistics & Shipping">Logistics & Shipping</option>
                        <option value="Cooking Equipment">Cooking Equipment</option>
                        <option value="Shop Fitting">Shop Fitting</option>
                        <option value="Single Restaurant & Takeaway">Single Restaurant & Takeaway</option>
                        <option value="Branding & Visual Design">Branding & Visual Design</option>
                        <option value="Start Up Online-Shop">Start Up Online-Shop</option>
                        <option value="AI Courses">AI Courses</option>
                        <option value="Retail Shop">Retail Shop</option>
                        <option value="Travel & Tourism">Travel & Tourism</option>
                        <option value="Voluntary Service (Non-Profit)">Voluntary Service (Non-Profit)</option>
                        <option value="Education & Tuition">Education & Tuition</option>
                        <option value="Clothe Providers">Clothe Providers</option>
                        <option value="Commercial Building Materials">Commercial Building Materials</option>
                        <option value="Home Furniture">Home Furniture</option>
                        <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                        <option value="Herbs & Natural Products">Herbs & Natural Products</option>
                        <option value="Ceramics">Ceramics</option>
                        <option value="Phone Accessories">Phone Accessories</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Visual Emoji</label>
                      <select className="form-control" value={productImg} onChange={(e) => setProductImg(e.target.value)}>
                        <option value="👕">👕 Apparel</option>
                        <option value="💻">💻 Computer</option>
                        <option value="🎧">🎧 Audio</option>
                        <option value="🕶️">🕶️ Glasses</option>
                        <option value="☕">☕ Cup</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Product Image File</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control" 
                      onChange={handleImageUpload} 
                      style={{ padding: '0.4rem 0.75rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-control" 
                      rows={2} 
                      placeholder="Product description..."
                      value={productDesc}
                      onChange={(e) => setProductDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowAddForm(false); setEditingProduct(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editingProduct ? 'Save Changes' : 'Save Catalog Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {monitoringProduct && (
          <CompetitorMonitor 
            product={monitoringProduct} 
            onClose={() => setMonitoringProduct(null)} 
          />
        )}

        <div className="glass-panel table-panel" style={{ marginTop: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Visual</th>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--saas-text-muted)' }}>
                    No products live in catalog. Toggle cogs in the Integrations Panel to sync external items!
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontSize: '2rem', width: '50px' }}>{prod.image}</td>
                    <td style={{ width: '60px' }}>
                      {prod.image_url ? (
                        <img 
                          src={prod.image_url} 
                          alt={prod.name} 
                          style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--saas-border)' }} 
                        />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>
                          N/A
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{prod.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>{prod.description}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--saas-text-secondary)' }}>
                        {prod.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>${prod.price.toFixed(2)}</td>
                    <td>
                      <span style={{ color: prod.stock > 5 ? 'var(--saas-success)' : 'var(--saas-warning)', fontWeight: 600 }}>
                        {prod.stock} units left
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.5rem', color: 'var(--saas-primary)' }}
                          onClick={() => setMonitoringProduct(prod)}
                          title="Monitor Competitor Prices"
                        >
                          <Search size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.5rem' }}
                          onClick={() => handleEditClick(prod)}
                          title="Edit Product"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.5rem', color: 'var(--saas-danger)' }}
                          onClick={() => handleDeleteProduct(prod.id)}
                          title="Delete Product"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
