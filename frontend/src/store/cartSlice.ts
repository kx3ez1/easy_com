import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { auth } from "@/app/firebase";
import { Money } from "@/models/types/shared.types";

export interface CartItem {
  sku: string;
  qty: number;
  price: any;
  name?: string; // Optional metadata for displaying in UI
  productName?: string;
  productId?: string;
  variantId?: string;
  imageUrl?: string; // Optional metadata for displaying in UI
  status?: string;
  stockQuantity?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
}

interface CartState {
  items: CartItem[];
  cartVersion: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  cartVersion: 0,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (_, { rejectWithValue }) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");
      const token = await user.getIdToken();

      const res = await fetch("/api/v1/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch cart: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status === "success") {
        return {
          items: data.data.items || [],
          cartVersion: data.data.cart_version || 0,
        };
      } else {
        throw new Error(data.message || "Failed to retrieve cart.");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Something went wrong fetching the cart");
    }
  }
);

export const syncCartWithBackend = createAsyncThunk(
  "cart/syncCartWithBackend",
  async (items: { sku: string; qty: number; price: Money | number }[], { rejectWithValue }) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");
      const token = await user.getIdToken();

      const res = await fetch("/api/v1/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update cart: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status === "success") {
        return {
          items: data.data.items || [],
          cartVersion: data.data.cart_version || 0,
        };
      } else {
        throw new Error(data.message || "Failed to update cart.");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Something went wrong syncing the cart");
    }
  }
);

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    clearCartLocal: (state) => {
      state.items = [];
      state.cartVersion = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action: PayloadAction<{ items: CartItem[]; cartVersion: number }>) => {
        state.loading = false;
        state.items = action.payload.items;
        state.cartVersion = action.payload.cartVersion;
      })
      .addCase(fetchCart.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Sync Cart
      .addCase(syncCartWithBackend.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncCartWithBackend.fulfilled, (state, action: PayloadAction<{ items: CartItem[]; cartVersion: number }>) => {
        state.loading = false;
        state.items = action.payload.items;
        state.cartVersion = action.payload.cartVersion;
      })
      .addCase(syncCartWithBackend.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCartLocal } = cartSlice.actions;
export default cartSlice.reducer;
