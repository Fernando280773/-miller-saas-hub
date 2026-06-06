"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, Product } from '../../../lib/supabaseClient';
import { Plus, Trash, Edit, Search, Tag, X, Check, Video, Upload, Image } from 'lucide-react';
import CompetitorMonitor from '../../../components/CompetitorMonitor';
import VideoThumb from '../../../components/VideoThumb';
import VideoMaker from '../../../components/VideoMaker';
import ImageThumb from '../../../components/ImageThumb';
import ImageMaker from '../../../components/ImageMaker';
import { saveProductVideo, deleteProductVideo, checkVideoDuration } from '../../../lib/videoDb';
import { saveProductImage, deleteProductImage } from '../../../lib/imageDb';

// ── Category helpers ──────────────────────────────────────────────────────────
function catKey(storeId: string) { return `store_categories_${storeId}`; }
const DEFAULT_CATEGORIES = ['General', 'Hot Drink', 'Cold Drink', 'Breakfast', 'Lunch', 'Can Drink'];

function loadCategories(storeId: string): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(catKey(storeId));
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) return parsed; }
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES;
}
function saveCategories(storeId: string, cats: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem(catKey(storeId), JSON.stringify(cats));
}

export default function ProductsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [monitoringProduct, setMonitoringProduct] = useState<Product | null>(null);

  // Categories
  const [categories, setCategories] = useState<string[]>(['General']);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const newCatRef = useRef<HTMLInputElement>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productStock, setProductStock] = useState('15');
  const [productImg, setProductImg] = useState('🛍️');
  const [productImageUrl, setProductImageUrl] = useState('');
  // Video clip (IndexedDB — no upload)
  const [productVideo, setProductVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState('');
  const [videoChanged, setVideoChanged] = useState(false);
  const [showVideoMaker, setShowVideoMaker] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Image (processed, IndexedDB)
  const [productImageBlob, setProductImageBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [showImageMaker, setShowImageMaker] = useState(false);
  const imagePreviewRef = useRef<string | null>(null);
 
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError('');
    try {
      await checkVideoDuration(file, 10);
      // Revoke previous preview URL
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setProductVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoChanged(true);
    } catch (err) {
      setVideoError((err as Error).message);
      setProductVideo(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setProductVideo(null);
    setVideoPreview(null);
    setVideoError('');
    setVideoChanged(true);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleVideoMakerSave = (blob: Blob) => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    // Wrap Blob as File so existing flow works
    const file = new File([blob], 'product-clip.webm', { type: blob.type });
    setProductVideo(file);
    setVideoPreview(URL.createObjectURL(blob));
    setVideoChanged(true);
    setVideoError('');
    setShowVideoMaker(false);
  };

  const handleImageMakerSave = (blob: Blob) => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const url = URL.createObjectURL(blob);
    imagePreviewRef.current = url;
    setProductImageBlob(blob);
    setImagePreview(url);
    setImageChanged(true);
    setShowImageMaker(false);
  };

  const clearImage = () => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    imagePreviewRef.current = null;
    setProductImageBlob(null);
    setImagePreview(null);
    setImageChanged(true);
  };

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
        const cats = loadCategories(currentStore.id);
        setCategories(cats);
        setProductCategory(cats[0] || 'General');
        const data = await db.getProducts(currentStore.id);
        setProducts(data);
      }
      setLoading(false);
    };

    loadStoreAndProducts();
  }, []);

  // ── Category management ──────────────────────────────────────────────────
  const addCategory = () => {
    const name = newCatName.trim();
    if (!name || !store) return;
    if (categories.includes(name)) { setNewCatName(''); return; }
    const updated = [...categories, name];
    setCategories(updated);
    saveCategories(store.id, updated);
    setNewCatName('');
    newCatRef.current?.focus();
  };

  const deleteCategory = (cat: string) => {
    if (!store) return;
    const updated = categories.filter(c => c !== cat);
    setCategories(updated.length ? updated : ['General']);
    saveCategories(store.id, updated.length ? updated : ['General']);
    if (productCategory === cat) setProductCategory(updated[0] || 'General');
  };

  const moveCategory = (index: number, dir: -1 | 1) => {
    if (!store) return;
    const to = index + dir;
    if (to < 0 || to >= categories.length) return;
    const updated = [...categories];
    [updated[index], updated[to]] = [updated[to], updated[index]];
    setCategories(updated);
    saveCategories(store.id, updated);
  };
 
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
        image_url: productImageUrl,
      });
      // Save/clear video for edited product
      if (videoChanged) {
        if (productVideo) await saveProductVideo(editingProduct.id, productVideo);
        else await deleteProductVideo(editingProduct.id);
      }
      // Save/clear image for edited product
      if (imageChanged) {
        if (productImageBlob) await saveProductImage(editingProduct.id, productImageBlob);
        else await deleteProductImage(editingProduct.id);
      }
      setEditingProduct(null);
    } else {
      const newProd = await db.addProduct({
        store_id: store.id,
        name: productName,
        price: parseFloat(productPrice),
        category: productCategory,
        description: productDesc || 'Imported catalog item.',
        stock: parseInt(productStock) || 10,
        image: productImg,
        image_url: productImageUrl,
      });
      // Save video clip to IndexedDB with new product ID
      if (productVideo && newProd?.id) {
        await saveProductVideo(newProd.id, productVideo);
      }
      // Save processed image to IndexedDB
      if (productImageBlob && newProd?.id) {
        await saveProductImage(newProd.id, productImageBlob);
      }
    }

    // Reset form
    setProductName('');
    setProductPrice('');
    setProductDesc('');
    setProductStock('15');
    setProductImageUrl('');
    setProductImg('🛍️');
    clearVideo();
    setVideoChanged(false);
    clearImage();
    setImageChanged(false);
    setShowAddForm(false);

    // Reload
    const data = await db.getProducts(store.id);
    setProducts(data);
  };
 
  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setProductName(prod.name);
    setProductPrice(String(prod.price));
    // Use product's existing category; if not in list add it temporarily
    if (!categories.includes(prod.category) && prod.category) {
      const updated = [...categories, prod.category];
      setCategories(updated);
      if (store) saveCategories(store.id, updated);
    }
    setProductCategory(prod.category || categories[0] || 'General');
    setProductDesc(prod.description);
    setProductStock(String(prod.stock));
    setProductImg(prod.image);
    setProductImageUrl(prod.image_url || '');
    // Reset video + image state — existing data stays in IndexedDB untouched unless user uploads new
    clearVideo();
    setVideoChanged(false);
    clearImage();
    setImageChanged(false);
    setShowAddForm(true);
  };
 
  const handleDeleteProduct = async (id: string) => {
    if (confirm('Delete this product?')) {
      await db.deleteProduct(id);
      await deleteProductVideo(id).catch(() => {}); // clean up video IndexedDB
      await deleteProductImage(id).catch(() => {}); // clean up image IndexedDB
      if (store) {
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setShowCatModal(true); setTimeout(() => newCatRef.current?.focus(), 100); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Tag size={15} /> Manage Categories
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingProduct(null); setProductCategory(categories[0] || 'General'); setShowAddForm(true); }}>
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* ── Video Maker Modal ── */}
        {showVideoMaker && (
          <VideoMaker
            onSave={handleVideoMakerSave}
            onClose={() => setShowVideoMaker(false)}
          />
        )}

        {/* ── Image Maker Modal ── */}
        {showImageMaker && (
          <ImageMaker
            storeLogo={store.logo_text}
            onSave={handleImageMakerSave}
            onClose={() => setShowImageMaker(false)}
          />
        )}

        {/* ── Category Manager Modal ── */}
        {showCatModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '440px', background: '#0b0f19', color: '#f3f4f6' }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tag size={18} style={{ color: 'var(--saas-primary)' }} /> Manage Categories
                </h3>
                <button onClick={() => setShowCatModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)', margin: 0 }}>
                  Set categories specific to your business. These appear in the product form dropdown.
                </p>

                {/* Add new */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    ref={newCatRef}
                    className="form-control"
                    placeholder="e.g. Hot Drinks, Main Course, Packages..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCatName.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ whiteSpace: 'nowrap', opacity: newCatName.trim() ? 1 : 0.4 }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Category list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {categories.length === 0 && (
                    <p style={{ color: 'var(--saas-text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>
                      No categories yet. Add your first one above.
                    </p>
                  )}
                  {categories.map((cat, i) => (
                    <div key={cat} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {/* Order index badge */}
                      <span style={{ fontSize: '0.65rem', color: 'var(--saas-text-muted)', minWidth: '18px', textAlign: 'center', fontWeight: 700 }}>
                        {i + 1}
                      </span>

                      {/* Up / Down arrows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <button
                          onClick={() => moveCategory(i, -1)}
                          disabled={i === 0}
                          style={{ background: 'none', border: 'none', color: i === 0 ? 'rgba(255,255,255,0.1)' : 'var(--saas-text-muted)', cursor: i === 0 ? 'default' : 'pointer', padding: '1px 3px', lineHeight: 1, fontSize: '0.6rem' }}
                          title="Move up"
                        >▲</button>
                        <button
                          onClick={() => moveCategory(i, 1)}
                          disabled={i === categories.length - 1}
                          style={{ background: 'none', border: 'none', color: i === categories.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--saas-text-muted)', cursor: i === categories.length - 1 ? 'default' : 'pointer', padding: '1px 3px', lineHeight: 1, fontSize: '0.6rem' }}
                          title="Move down"
                        >▼</button>
                      </div>

                      {/* Name */}
                      <span style={{ fontSize: '0.88rem', fontWeight: 500, flexGrow: 1 }}>{cat}</span>

                      {/* Delete */}
                      <button
                        onClick={() => deleteCategory(cat)}
                        style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.45)', cursor: 'pointer', padding: '0.1rem', lineHeight: 1 }}
                        title="Remove category"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', margin: 0 }}>
                  ▲▼ reorder — this order controls how categories display on your product website.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setShowCatModal(false)}>
                  <Check size={14} /> Done
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '550px', background: '#0b0f19', color: '#f3f4f6', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
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
              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1 }}>
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
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Category</span>
                        <button
                          type="button"
                          onClick={() => { setShowAddForm(false); setShowCatModal(true); setTimeout(() => newCatRef.current?.focus(), 100); }}
                          style={{ background: 'none', border: 'none', color: 'var(--saas-primary)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                        >
                          + New category
                        </button>
                      </label>
                      <select className="form-control" value={productCategory} onChange={e => setProductCategory(e.target.value)}>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        {categories.length === 0 && <option value="General">General</option>}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Video size={13} style={{ color: 'var(--saas-primary)' }} />
                        Product Video Clip <span style={{ fontSize: '0.68rem', color: 'var(--saas-text-muted)', fontWeight: 400 }}>(max 10s · stored in browser)</span>
                      </label>

                      {/* Upload / Make buttons */}
                      {!videoPreview && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* Upload from file */}
                          <div
                            onClick={() => videoInputRef.current?.click()}
                            style={{
                              flex: 1, border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)',
                              padding: '0.75rem', textAlign: 'center', cursor: 'pointer',
                              background: 'rgba(99,102,241,0.03)', transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--saas-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}
                          >
                            <Upload size={16} style={{ color: 'var(--saas-primary)', opacity: 0.6, marginBottom: '0.2rem' }} />
                            <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-secondary)', fontWeight: 600 }}>Upload clip</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--saas-text-muted)' }}>MP4 / MOV · max 10s</div>
                          </div>

                          {/* Video Maker button */}
                          <button
                            type="button"
                            onClick={() => setShowVideoMaker(true)}
                            style={{
                              flex: 1, border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)',
                              padding: '0.75rem', textAlign: 'center', cursor: 'pointer',
                              background: 'rgba(99,102,241,0.03)', transition: 'border-color 0.2s, background 0.2s',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saas-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                          >
                            <span style={{ fontSize: '1.2rem' }}>🎬</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--saas-primary)', fontWeight: 700 }}>Video Maker</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--saas-text-muted)' }}>Record from camera</div>
                          </button>
                        </div>
                      )}

                      {/* Preview */}
                      {videoPreview && (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', maxHeight: '120px', display: 'flex', justifyContent: 'center' }}>
                          <video src={videoPreview} muted autoPlay loop playsInline style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain' }} />
                          <button
                            type="button"
                            onClick={clearVideo}
                            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <X size={12} />
                          </button>
                          <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: '0.65rem', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>🎬 Clip ready</div>
                        </div>
                      )}

                      {/* Hidden input */}
                      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: 'none' }} />

                      {/* Error */}
                      {videoError && (
                        <p style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ⚠ {videoError}
                        </p>
                      )}

                      {/* Emoji fallback (small, secondary) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)' }}>Fallback icon:</span>
                        <select value={productImg} onChange={e => setProductImg(e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#f3f4f6', padding: '0.15rem 0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <option value="🛍️">🛍️</option><option value="☕">☕</option><option value="🧋">🧋</option>
                          <option value="🍱">🍱</option><option value="🍔">🍔</option><option value="🍕">🍕</option>
                          <option value="🥗">🥗</option><option value="🎂">🎂</option><option value="🍰">🍰</option>
                          <option value="👕">👕</option><option value="💻">💻</option><option value="🎧">🎧</option>
                          <option value="✈️">✈️</option><option value="🏨">🏨</option><option value="💄">💄</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Product Image ── */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Image size={13} style={{ color: 'var(--saas-primary)' }} />
                      Product Image <span style={{ fontSize: '0.68rem', color: 'var(--saas-text-muted)', fontWeight: 400 }}>(auto-enhanced · stored in browser)</span>
                    </label>

                    {!imagePreview ? (
                      <button
                        type="button"
                        onClick={() => setShowImageMaker(true)}
                        style={{
                          width: '100%', border: '2px dashed rgba(99,102,241,0.35)',
                          borderRadius: 'var(--radius-md)', padding: '0.9rem',
                          background: 'rgba(99,102,241,0.03)', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saas-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.09)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>📸</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--saas-primary)', fontWeight: 700 }}>Open Image Maker</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--saas-text-muted)' }}>Upload · take photo · auto-enhance · store badge</div>
                      </button>
                    ) : (
                      <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', maxHeight: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={imagePreview} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                        <button
                          type="button"
                          onClick={clearImage}
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowImageMaker(true)}
                          style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(99,102,241,0.8)', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                        >
                          📸 Change
                        </button>
                        <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: '0.65rem', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>✨ Enhanced</div>
                      </div>
                    )}
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
                <th>Video</th>
                <th>Photo</th>
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
                    <td style={{ width: '56px' }}>
                      <VideoThumb productId={prod.id} fallbackEmoji={prod.image} size={44} />
                    </td>
                    <td style={{ width: '56px' }}>
                      <ImageThumb productId={prod.id} fallbackEmoji={prod.image} size={44} />
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
