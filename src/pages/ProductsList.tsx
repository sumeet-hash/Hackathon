// src/pages/ProductsList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Layers,
  Plus,
  Trash2,
  Tag,
  Sparkles,
  DollarSign,
  PackageCheck
} from 'lucide-react';
import { Product } from '../types';

export const ProductsList: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodType, setProdType] = useState('software_license');
  const [salesPrice, setSalesPrice] = useState('1200.00');
  const [costPrice, setCostPrice] = useState('350.00');
  const [prodNotes, setProdNotes] = useState('');

  // Variant manager modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [varAttribute, setVarAttribute] = useState('Brand');
  const [varValue, setVarValue] = useState('Odoo Certified Edition');
  const [varExtra, setVarExtra] = useState('560.00');
  const [varSku, setVarSku] = useState('ERP-ODOO-560');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts();
      setProducts(res.products);
      if (selectedProduct) {
        const found = res.products.find((p) => p.id === selectedProduct.id);
        setSelectedProduct(found || null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct({
        name: prodName,
        type: prodType,
        sales_price: parseFloat(salesPrice),
        cost_price: parseFloat(costPrice),
        notes: prodNotes
      });
      setShowAddModal(false);
      setProdName('');
      await fetchProducts();
    } catch (err: any) {
      alert('Error creating product: ' + err.message);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await api.addVariant(selectedProduct.id, {
        attribute_name: varAttribute,
        variant_value: varValue,
        price_extra: parseFloat(varExtra),
        sku: varSku
      });
      setVarValue('');
      await fetchProducts();
    } catch (err: any) {
      alert('Error adding variant: ' + err.message);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!selectedProduct) return;
    try {
      await api.deleteVariant(selectedProduct.id, variantId);
      await fetchProducts();
    } catch (err: any) {
      alert('Error deleting variant: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Products & Variants</h1>
          <p className="text-xs text-slate-500 mt-1">
            "The admin adds it with its name, type, sales price, cost price and notes, and offers it in variants, for example by brand, where choosing the Odoo brand adds 560 to the price."
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Launch New Product</span>
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {p.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Cost: ${p.cost_price.toFixed(2)}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.notes || 'No description provided.'}</p>

              <div className="mt-4 flex items-baseline space-x-1">
                <span className="text-xl font-extrabold text-slate-900 font-mono">${p.sales_price.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-medium">base sales price</span>
              </div>

              {/* Variants Section */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Configured Variants ({p.variants.length})
                </div>
                {p.variants.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Standard single product (no variants)</p>
                ) : (
                  <div className="space-y-1.5">
                    {p.variants.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">
                          {v.attribute_name}: <span className="font-semibold text-purple-900">{v.variant_value}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {v.price_extra > 0 ? `+$${v.price_extra.toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedProduct(p)}
                  className="w-full py-2 bg-slate-50 hover:bg-purple-50 text-purple-800 border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Configure Variants</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Launch New Product"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="e.g. Brightloop ERP Core"
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Type *</label>
            <select
              value={prodType}
              onChange={(e) => setProdType(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            >
              <option value="software_license">Software License</option>
              <option value="service">Service</option>
              <option value="addon">Add-on</option>
              <option value="consumable">Consumable</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sales Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes & Description</label>
            <textarea
              rows={2}
              value={prodNotes}
              onChange={(e) => setProdNotes(e.target.value)}
              placeholder="Internal product specs or customer facing notes..."
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Variant Manager Modal */}
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={`Configure Variants for: ${selectedProduct?.name}`}
        maxWidth="max-w-lg"
      >
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-purple-900">
              <span className="font-bold">Prompt Requirement Example:</span> choosing the Odoo brand adds 560 to the price.
            </div>

            {/* List existing variants */}
            <div className="space-y-2">
              <div className="font-bold text-slate-700">Existing Variants:</div>
              {selectedProduct.variants.length === 0 ? (
                <div className="text-slate-400 py-2">No variants created yet.</div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedProduct.variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div>
                        <span className="font-bold text-slate-800">{v.attribute_name}:</span> {v.variant_value}
                        {v.sku && <span className="text-[10px] text-slate-400 font-mono ml-2">SKU: {v.sku}</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-700">
                          {v.price_extra > 0 ? `+$${v.price_extra.toFixed(2)}` : '$0.00'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Variant Form */}
            <form onSubmit={handleAddVariant} className="pt-3 border-t border-slate-200 space-y-3">
              <div className="font-bold text-slate-800">Add New Variant:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-0.5">Attribute Name</label>
                  <input
                    type="text"
                    required
                    value={varAttribute}
                    onChange={(e) => setVarAttribute(e.target.value)}
                    placeholder="e.g. Brand, Tier, Region"
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-0.5">Variant Value</label>
                  <input
                    type="text"
                    required
                    value={varValue}
                    onChange={(e) => setVarValue(e.target.value)}
                    placeholder="e.g. Odoo Certified Edition"
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-0.5">Price Surcharge ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={varExtra}
                    onChange={(e) => setVarExtra(e.target.value)}
                    placeholder="560.00"
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-0.5">SKU / Code</label>
                  <input
                    type="text"
                    value={varSku}
                    onChange={(e) => setVarSku(e.target.value)}
                    placeholder="ERP-ODOO-560"
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-xs"
                >
                  Add Variant Surcharge
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

