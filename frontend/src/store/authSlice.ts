import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface BackendProfile {
  id: string;
  uid: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber?: string | null;
  addresses: any[];
}

interface AuthState {
  user: UserProfile | null;
  profile: BackendProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.user = action.payload;
      if (!action.payload) {
        state.profile = null;
      }
      state.loading = false;
      state.error = null;
    },
    setProfile: (state, action: PayloadAction<BackendProfile | null>) => {
      state.profile = action.payload;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.profile = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setUser, setProfile, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;

