import React, { useEffect } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { firebaseService } from "./src/services/firebase.service";

// Create TanStack Query client for API caching and server state synchronization
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache expiry by default
    },
  },
});

function App() {
  const isDarkMode = useColorScheme() === "dark";

  useEffect(() => {
    // Prepare notifications foundation (Phase 7 - Architecture)
    const initNotifications = async () => {
      try {
        await firebaseService.requestUserPermission();
        await firebaseService.getFCMToken();
      } catch (err) {
        console.log("Firebase initialized (mock/development configuration):", err);
      }
    };

    initNotifications();

    // Register push notification active listeners
    const unsubscribeNotifications = firebaseService.setupListeners();

    return () => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
          <AppNavigator />
        </ErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
