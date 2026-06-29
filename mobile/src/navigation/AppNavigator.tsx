import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/auth.store";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { tokenService } from "../services/token.service";
import { userApi } from "../api/user";

const RootStack = createNativeStackNavigator();

export function AppNavigator() {
  const { user, initialized, setSession, setInitialized, clearSession } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const refreshToken = await tokenService.getRefreshToken();
        if (!refreshToken) {
          await clearSession();
          return;
        }

        // Calling profile triggers Axios client interceptors.
        // If access token is empty, the client catches 401, runs token refresh with keychain, 
        // updates the tokens, and retries profile fetching automatically.
        const profile = await userApi.profile();
        const freshAccessToken = tokenService.getAccessToken();
        
        if (freshAccessToken) {
          await setSession(profile, freshAccessToken, refreshToken);
        } else {
          await clearSession();
        }
      } catch (error) {
        console.log("Auto-login session check complete (no active session or expired):", error);
        await clearSession();
      } finally {
        setInitialized(true);
      }
    };

    initializeAuth();

    // Attach token failure listener (automatic logouts on refresh failure)
    const unsubscribe = tokenService.onFailure(() => {
      clearSession();
    });

    return () => unsubscribe();
  }, [setSession, setInitialized, clearSession]);

  if (!initialized) {
    return <LoadingOverlay />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="App" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
