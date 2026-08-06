"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { setProfile } from "@/store/authSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface AddressBookEntry {
  id: string;
  label?: string;
  recipientName: string;
  phoneNumber?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

interface OrderItem {
  id?: string;
  sku: string;
  quantity: number;
  price?: number | { amount: number; currency?: string };
  unitPrice?: { amount: number; currency?: string } | number;
  productName?: string;
  name?: string;
}

interface Order {
  id: string;
  createdAt: string;
  status: string;
  totalAmount: number | { amount: number; currency?: string };
  currency?: string;
  items?: OrderItem[];
}

function ProfileContent() {
  const { user, profile } = useAppSelector((state) => state.auth);
  const cart = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders" | "security">("profile");

  // Personal Info Form State
  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Synchronize state when profile updates
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setPhoneNumber(profile.phoneNumber || "");
    }
  }, [profile]);

  // Address Form State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    recipientName: "",
    phoneNumber: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "US",
    isDefaultShipping: false,
    isDefaultBilling: false,
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Security State
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Update Profile Info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setProfileMsg({ type: "error", text: "First Name is required and cannot be empty." });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active authentication session");

      const token = await currentUser.getIdToken();
      const res = await fetch("/api/v1/users/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        const errorMsg = data.error?.message || data.message || "Failed to update profile";
        throw new Error(errorMsg);
      }

      dispatch(setProfile(data.data.profile));
      setProfileMsg({ type: "success", text: "Profile details updated successfully!" });
    } catch (err: any) {
      console.error("Update profile error:", err);
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  // Helper to open modal for adding
  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddressError(null);
    setNewAddress({
      label: "Home",
      recipientName: "",
      phoneNumber: "",
      company: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      countryCode: "US",
      isDefaultShipping: false,
      isDefaultBilling: false,
    });
    setShowAddressModal(true);
  };

  // Helper to open modal for editing an address
  const handleOpenEditModal = (addr: AddressBookEntry) => {
    setEditingAddressId(addr.id);
    setAddressError(null);
    setNewAddress({
      label: addr.label || "Home",
      recipientName: addr.recipientName || "",
      phoneNumber: addr.phoneNumber || "",
      company: addr.company || "",
      addressLine1: addr.addressLine1 || "",
      addressLine2: addr.addressLine2 || "",
      city: addr.city || "",
      stateProvince: addr.stateProvince || "",
      postalCode: addr.postalCode || "",
      countryCode: addr.countryCode || "US",
      isDefaultShipping: !!addr.isDefaultShipping,
      isDefaultBilling: !!addr.isDefaultBilling,
    });
    setShowAddressModal(true);
  };

  // Add / Edit Address Handler
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    setAddressError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active authentication session");

      const token = await currentUser.getIdToken();
      const endpoint = editingAddressId
        ? `/api/v1/users/me/addresses/${editingAddressId}`
        : "/api/v1/users/me/addresses";
      const method = editingAddressId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAddress),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || (editingAddressId ? "Failed to update address" : "Failed to add address"));
      }

      dispatch(setProfile(data.data.profile));
      setShowAddressModal(false);
      setEditingAddressId(null);
      setNewAddress({
        label: "Home",
        recipientName: "",
        phoneNumber: "",
        company: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        stateProvince: "",
        postalCode: "",
        countryCode: "US",
        isDefaultShipping: false,
        isDefaultBilling: false,
      });
    } catch (err: any) {
      console.error("Save address error:", err);
      setAddressError(err.message || "Failed to save address");
    } finally {
      setAddressLoading(false);
    }
  };

  // Delete Address Handler
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active authentication session");

      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/v1/users/me/addresses/${addressId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete address");
      }

      dispatch(setProfile(data.data.profile));
    } catch (err: any) {
      console.error("Delete address error:", err);
      alert(err.message || "Failed to delete address");
    }
  };

  // Set Default Address Handler
  const handleSetDefaultAddress = async (addressId: string, type: "shipping" | "billing") => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active authentication session");

      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/v1/users/me/addresses/${addressId}/default`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to set default address");
      }

      dispatch(setProfile(data.data.profile));
    } catch (err: any) {
      console.error("Set default address error:", err);
      alert(err.message || "Failed to set default address");
    }
  };

  // Fetch Order History
  useEffect(() => {
    if (activeTab === "orders") {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        setOrdersError(null);

        try {
          const currentUser = auth.currentUser;
          if (!currentUser) return;

          const token = await currentUser.getIdToken();
          const res = await fetch("/api/v1/orders", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();
          if (res.ok && data.status === "success") {
            setOrders(data.data?.orders || []);
          } else {
            throw new Error(data.message || "Failed to load orders");
          }
        } catch (err: any) {
          console.error("Fetch orders error:", err);
          setOrdersError(err.message || "Failed to load order history");
        } finally {
          setLoadingOrders(false);
        }
      };

      fetchOrders();
    }
  }, [activeTab]);

  // Send Password Reset
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetSent(false);
    setResetError(null);

    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setResetError(err.message || "Failed to send reset email");
    }
  };

  const getInitials = () => {
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.displayName) {
      const parts = user.displayName.split(" ");
      return parts.length > 1
        ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user?.email ? user.email.charAt(0).toUpperCase() : "U";
  };

  const hasName = Boolean(firstName?.trim() || lastName?.trim());
  const displayNameComputed = hasName
    ? `${firstName || ""} ${lastName || ""}`.trim()
    : user?.displayName || "Customer Profile";

  return (
    <div className="min-h-screen bg-background text-on-background transition-colors duration-300">
      {/* Header Banner */}
      <header className="sticky top-0 z-20 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/products" className="flex items-center gap-1.5 sm:gap-2 group">
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1 text-on-surface-variant shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-on-surface-variant group-hover:text-on-background transition-colors hidden xs:inline">
                Catalog
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-center">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-surface-tint">
              Account Hub
            </span>
            <span className="text-on-surface-variant text-xs hidden sm:inline">•</span>
            <h1 className="text-sm sm:text-lg font-extrabold uppercase tracking-tight text-on-background hidden sm:block">
              {activeTab === "profile" && "My Profile"}
              {activeTab === "addresses" && "Address Book"}
              {activeTab === "orders" && "Order History"}
              {activeTab === "security" && "Security & Account"}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/cart" className="relative p-2 bg-surface hover:bg-surface-container rounded-full border border-outline transition-colors" aria-label="Cart">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cart.items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-surface-tint text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {cart.items.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-surface border border-outline py-1.5 sm:py-2 px-3 sm:px-4 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-on-background transition-all duration-200 hover:bg-surface-container-low"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* User Hero Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar Pill */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary-container text-on-primary-container font-black text-2xl sm:text-3xl flex items-center justify-center shadow-inner border border-surface-tint/30 shrink-0">
              {getInitials()}
            </div>

            {/* Profile Info */}
            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-on-background tracking-tight">
                  {displayNameComputed}
                </h2>
              </div>

              <p className="text-sm font-medium text-on-surface-variant">
                {user?.email}
              </p>

              <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-6 text-xs text-on-surface-variant/80 font-sans">
                <div>
                  <span className="font-semibold text-on-surface">First Name:</span> {firstName || "Not provided"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface">Last Name:</span> {lastName || "Not provided"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface">Phone:</span> {phoneNumber || "Not provided"}
                </div>
                <div>
                  <span className="font-semibold text-on-surface">Saved Addresses:</span> {profile?.addresses?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-6 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === "profile"
                ? "border-surface-tint text-surface-tint"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            Personal Details
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`py-3 px-6 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === "addresses"
                ? "border-surface-tint text-surface-tint"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            Address Book ({profile?.addresses?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-3 px-6 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === "orders"
                ? "border-surface-tint text-surface-tint"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            Order History
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-3 px-6 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === "security"
                ? "border-surface-tint text-surface-tint"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            Security & Account
          </button>
        </div>

        {/* TAB 1: Personal Details */}
        {activeTab === "profile" && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 max-w-3xl shadow-sm">
            <h3 className="text-lg font-bold text-on-background mb-1">Personal Details</h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Update your account name and phone contact info stored in EasyCom.
            </p>

            {profileMsg && (
              <div
                className={`p-4 rounded-lg text-sm font-semibold mb-6 border-l-4 ${
                  profileMsg.type === "success"
                    ? "bg-primary-container/30 border-surface-tint text-on-background"
                    : "bg-error-container border-error text-on-error-container"
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    First Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    autoComplete="off"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full px-4 py-3 rounded-lg bg-surface border border-outline text-on-background placeholder-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-surface-tint text-sm transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    Last Name <span className="text-on-surface-variant/60 font-normal text-[10px] lowercase">(optional)</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="off"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full px-4 py-3 rounded-lg bg-surface border border-outline text-on-background placeholder-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-surface-tint text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="emailAddress" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Email Address (Read Only)
                </label>
                <input
                  id="emailAddress"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface-variant cursor-not-allowed text-sm"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Phone Number <span className="text-on-surface-variant/60 font-normal text-[10px] lowercase">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="off"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-outline text-on-background placeholder-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-surface-tint text-sm transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-primary-container text-on-primary-container font-bold uppercase tracking-wider text-xs px-6 py-3.5 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary-container/30 border-t-on-primary-container"></div>
                      Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Address Book */}
        {activeTab === "addresses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-on-background">Saved Addresses</h3>
                <p className="text-xs text-on-surface-variant">
                  Manage shipping & billing addresses for fast checkout.
                </p>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add New Address
              </button>
            </div>

            {/* Address List */}
            {(!profile?.addresses || profile.addresses.length === 0) ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center max-w-md mx-auto">
                <svg className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h4 className="font-bold text-on-background mb-1">No Addresses Saved</h4>
                <p className="text-xs text-on-surface-variant mb-6">
                  Add an address to speed up order checkout.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="bg-primary-container text-on-primary-container font-bold text-xs uppercase px-4 py-2.5 rounded-lg"
                >
                  Create Address
                </button>
              </div>
            ) : (
              <div className="max-h-[640px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.addresses.map((addr: AddressBookEntry) => (
                  <div
                    key={addr.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-surface-tint transition-colors relative"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-extrabold text-sm uppercase tracking-wider text-on-background bg-surface-container px-3 py-1 rounded-md">
                          {addr.label || "Address"}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {addr.isDefaultShipping && (
                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Default Shipping
                            </span>
                          )}
                          {addr.isDefaultBilling && (
                            <span className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Default Billing
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="font-bold text-sm text-on-background">{addr.recipientName}</p>
                      {addr.company && <p className="text-xs text-on-surface-variant font-medium">{addr.company}</p>}
                      <p className="text-xs text-on-surface-variant">{addr.addressLine1}</p>
                      {addr.addressLine2 && <p className="text-xs text-on-surface-variant">{addr.addressLine2}</p>}
                      <p className="text-xs text-on-surface-variant">
                        {addr.city}, {addr.stateProvince || ""} {addr.postalCode}
                      </p>
                      <p className="text-xs text-on-surface-variant font-semibold uppercase">{addr.countryCode}</p>
                      {addr.phoneNumber && <p className="text-xs text-on-surface-variant mt-2 font-mono">Tel: {addr.phoneNumber}</p>}
                    </div>

                    <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-end flex-wrap gap-3 text-xs">
                      <button
                        onClick={() => handleOpenEditModal(addr)}
                        className="text-surface-tint hover:underline font-bold text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-error hover:underline font-bold text-[11px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* TAB 3: Order History */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-on-background">Order History</h3>
              <p className="text-xs text-on-surface-variant">
                View your recent store purchases and status updates.
              </p>
            </div>

            {loadingOrders ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 animate-pulse space-y-3">
                    <div className="h-4 bg-surface-container rounded w-1/4"></div>
                    <div className="h-3 bg-surface-container rounded w-1/2"></div>
                    <div className="h-8 bg-surface-container rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : ordersError ? (
              <div className="bg-error-container border border-error p-6 rounded-2xl text-on-error-container max-w-lg">
                <h4 className="font-bold mb-1">Failed to Load Orders</h4>
                <p className="text-xs">{ordersError}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center max-w-md mx-auto">
                <svg className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h4 className="font-bold text-on-background mb-1">No Orders Found</h4>
                <p className="text-xs text-on-surface-variant mb-6">
                  You haven&apos;t placed any orders yet.
                </p>
                <Link href="/products" className="bg-primary-container text-on-primary-container font-bold text-xs uppercase px-4 py-2.5 rounded-lg inline-block">
                  Shop Products
                </Link>
              </div>
            ) : (
              <div className="max-h-[640px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {orders.map((order) => {
                  const total =
                    typeof order.totalAmount === "number"
                      ? order.totalAmount
                      : typeof order.totalAmount === "object" && order.totalAmount !== null
                      ? order.totalAmount.amount ?? 0
                      : 0;

                  return (
                    <div
                      key={order.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:border-surface-tint transition-colors"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-outline-variant/60 pb-4 mb-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Order ID</span>
                          <p className="font-mono font-bold text-sm text-on-background">{order.id}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Date</span>
                          <p className="text-xs font-semibold text-on-surface">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</span>
                          <span className="block mt-0.5 bg-primary-container/80 text-on-primary-container text-[10px] font-black uppercase px-2.5 py-0.5 rounded">
                            {order.status}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total</span>
                          <p className="font-black text-base text-on-background">${total.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Order items if present */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Items ({order.items.length})</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {order.items.map((item, idx) => {
                              const rawPrice = item.price ?? item.unitPrice;
                              const itemPrice =
                                typeof rawPrice === "number"
                                  ? rawPrice
                                  : typeof rawPrice === "object" && rawPrice !== null
                                  ? rawPrice.amount ?? 0
                                  : 0;

                              return (
                                <div key={idx} className="bg-surface p-3 rounded-lg border border-outline-variant flex items-center justify-between text-xs">
                                  <span className="font-semibold line-clamp-1">{item.productName || item.name || item.sku}</span>
                                  <span className="font-mono font-bold text-on-surface-variant shrink-0 ml-2">
                                    {item.quantity} x ${itemPrice.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Security & Account */}
        {activeTab === "security" && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 max-w-3xl shadow-sm space-y-8">
            <div>
              <h3 className="text-lg font-bold text-on-background mb-1">Security & Credentials</h3>
              <p className="text-xs text-on-surface-variant">
                Manage account authentication, passwords, and user identifiers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-surface rounded-xl border border-outline-variant">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Email Address</p>
                <p className="text-sm font-semibold text-on-background">{user?.email}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant space-y-4">
              <h4 className="font-bold text-sm text-on-background">Password Reset</h4>
              <p className="text-xs text-on-surface-variant">
                We can send a password reset email directly to <span className="font-semibold text-on-background">{user?.email}</span>.
              </p>

              {resetSent && (
                <div className="bg-primary-container/30 border-l-4 border-surface-tint text-on-background p-4 rounded-lg text-xs font-semibold">
                  Password reset email has been sent! Check your inbox.
                </div>
              )}

              {resetError && (
                <div className="bg-error-container border-l-4 border-error text-on-error-container p-4 rounded-lg text-xs font-semibold">
                  {resetError}
                </div>
              )}

              <button
                onClick={handlePasswordReset}
                className="bg-surface border border-outline text-on-background font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-surface-container transition-all"
              >
                Send Password Reset Email
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Address Creation Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-on-background uppercase tracking-tight">
                {editingAddressId ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-2 text-on-surface-variant hover:text-on-background transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {addressError && (
              <div className="bg-error-container border-l-4 border-error text-on-error-container p-4 rounded-lg text-xs font-semibold">
                {addressError}
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Address Type / Label <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint font-semibold"
                  >
                    <option value="Home">Home (7 AM - 9 PM delivery)</option>
                    <option value="Work">Work (9 AM - 6 PM delivery)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress.recipientName}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    autoComplete="off"
                    value={newAddress.phoneNumber}
                    onChange={(e) => setNewAddress({ ...newAddress, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                    placeholder="+1 555-0192"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAddress.company}
                    onChange={(e) => setNewAddress({ ...newAddress, company: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.addressLine1}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                  className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  placeholder="Street address or P.O. Box"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={newAddress.addressLine2}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                  className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  placeholder="Apt, suite, unit, building"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={newAddress.stateProvince}
                    onChange={(e) => setNewAddress({ ...newAddress, stateProvince: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Country Code (ISO 2-letter)
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.countryCode}
                  onChange={(e) => setNewAddress({ ...newAddress, countryCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-background focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  placeholder="US"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAddress.isDefaultShipping}
                    onChange={(e) => setNewAddress({ ...newAddress, isDefaultShipping: e.target.checked })}
                    className="rounded border-outline text-surface-tint focus:ring-surface-tint h-4 w-4"
                  />
                  <span className="text-xs text-on-surface font-medium">Set as Default Shipping Address</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAddress.isDefaultBilling}
                    onChange={(e) => setNewAddress({ ...newAddress, isDefaultBilling: e.target.checked })}
                    className="rounded border-outline text-surface-tint focus:ring-surface-tint h-4 w-4"
                  />
                  <span className="text-xs text-on-surface font-medium">Set as Default Billing Address</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2.5 bg-surface border border-outline text-xs font-bold uppercase rounded-lg text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressLoading}
                  className="px-5 py-2.5 bg-primary-container text-on-primary-container text-xs font-bold uppercase rounded-lg disabled:opacity-50"
                >
                  {addressLoading ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
