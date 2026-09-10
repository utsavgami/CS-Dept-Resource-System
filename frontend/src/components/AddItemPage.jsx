import React, { useState } from "react";
import { api } from "../lib/apiClient";
import {
  PlusCircle,
  Image,
  MapPin,
  DollarSign,
  Tag,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Trash2,
} from "lucide-react";

export const AddItemPage = ({ onSuccess, onCancel, editingItem }) => {
  const [title, setTitle] = useState(editingItem?.title || "");
  const [category, setCategory] = useState(
    editingItem?.category || "Calculators",
  );
  const [description, setDescription] = useState(
    editingItem?.description || "",
  );
  const [rentPricePerDay, setRentPricePerDay] = useState(
    editingItem?.rentPricePerDay ? String(editingItem.rentPricePerDay) : "5",
  );
  const [securityDeposit, setSecurityDeposit] = useState(
    editingItem?.securityDeposit ? String(editingItem.securityDeposit) : "20",
  );
  const [condition, setCondition] = useState(
    editingItem?.condition || "Good",
  );
  const [pickupLocation, setPickupLocation] = useState(
    editingItem?.pickupLocation || "CS Lab 3, 2nd Floor Engineering Building",
  );
  const [bill, setBill] = useState(editingItem?.bill || "");
  const [billUrl, setBillUrl] = useState("");

  const handleBillUrl = () => {
    if (billUrl.trim()) {
      setBill(billUrl.trim());
      setBillUrl("");
    }
  };

  const handleBillFileUpload = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setBill(reader.result);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const [images, setImages] = useState(
    editingItem?.images || [
      "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&q=80&w=800",
    ],
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Books",
    "Calculators",
    "Laptop Accessories",
    "Electronics",
    "Lab Equipment",
    "Project Components",
    "Sports Items",
    "Other",
  ];

  const presetImages = [
    {
      label: "TI Graphing Calculator",
      url: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&q=80&w=800",
    },
    {
      label: "Raspberry Pi 4 Board",
      url: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=800",
    },
    {
      label: "Algorithms CS Textbook",
      url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
    },
    {
      label: "Digital Oscilloscope Lab",
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
    },
    {
      label: "Arduino Circuit Board",
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    },
  ];

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !description || !rentPricePerDay || !pickupLocation) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title,
        category,
        description,
        images:
          images.length > 0
            ? images
            : [
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800",
              ],
        bill: bill || undefined,
        rentPricePerDay: Number(rentPricePerDay),
        securityDeposit: Number(securityDeposit || 0),
        condition,
        pickupLocation,
      };

      if (editingItem) {
        await api.updateItem(editingItem._id, payload);
      } else {
        await api.createItem(payload);
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save resource listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {editingItem ? "Edit Resource Listing" : "List New CS Resource"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share equipment, books, or lab components with fellow Computer
              Science students
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Resource Title / Item Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Texas Instruments TI-84 Plus CE Graphing Calculator"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Item Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          {/* Pricing & Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rental Price Per Day ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={rentPricePerDay}
                onChange={(e) => setRentPricePerDay(e.target.value)}
                placeholder="5"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Refundable Security Deposit ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="20"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pickup Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Campus Pickup Location *
            </label>
            <input
              type="text"
              required
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. CS Lab 3, 2nd Floor Engineering Building or CS Dept Library"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Resource Details & Description *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specifications, accessories included, or usage rules (e.g., includes charging cable, battery lasts 2 weeks, ideal for CS 301)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Image Upload / URLs */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Listing Images (Cloudinary / File / URL)
            </label>

            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group"
                >
                  <img
                    src={img}
                    alt="Resource"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bill Upload / URL */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Original Bill / Purchase Receipt
              </label>

              {bill && (
                <div className="relative w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                  {bill.startsWith("data:image") ||
                  /\.(jpg|jpeg|png|webp)$/i.test(bill) ? (
                    <img
                      src={bill}
                      alt="Bill"
                      className="w-full h-48 object-contain rounded-lg"
                    />
                  ) : (
                    <a
                      href={bill}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs font-semibold"
                    >
                      View Bill
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setBill("")}
                    className="mt-2 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200"
                  >
                    Remove Bill
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={billUrl}
                  onChange={(e) => setBillUrl(e.target.value)}
                  placeholder="Paste Bill URL..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />

                <button
                  type="button"
                  onClick={handleBillUrl}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200"
                >
                  Add Bill
                </button>

                <label className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-100 flex items-center justify-center space-x-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bill</span>

                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleBillFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <p className="text-[10px] text-slate-400">
                Upload the original purchase bill/receipt to help verify the
                listing.
              </p>
            </div>

            {/* Quick Presets or File Upload */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste Image URL or select preset below..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200"
              >
                Add URL
              </button>
              <label className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-100 flex items-center justify-center space-x-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-semibold self-center mr-1">
                Sample Photos:
              </span>
              {presetImages.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setImages([p.url])}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {editingItem ? "Update Listing" : "Publish Resource Listing"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
