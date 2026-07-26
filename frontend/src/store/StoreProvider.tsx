"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore, useAppDispatch } from "./store";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { setUser, setProfile, setLoading, setError } from "./authSlice";
import { fetchCart } from "./cartSlice";
import ThemeProvider from "./ThemeProvider";

function AuthStateListener() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          })
        );
        dispatch(fetchCart());
        dispatch(setLoading(true));
        user.getIdToken()
          .then((token) => {
            return fetch("/api/v1/users/me", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch profile: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (data.status === "success" && data.data?.profile) {
              dispatch(setProfile(data.data.profile));
            } else {
              throw new Error(data.message || "Failed to retrieve profile data");
            }
          })
          .catch((err) => {
            console.error("Error fetching user profile from backend:", err);
            dispatch(setError(err.message || "Failed to load user profile"));
          });
      } else {
        dispatch(setUser(null));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return null;
}

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>(undefined);
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <ThemeProvider>
        <AuthStateListener />
        {children}
      </ThemeProvider>
    </Provider>
  );
}
