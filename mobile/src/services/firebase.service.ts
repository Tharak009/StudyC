import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

class FirebaseService {
  async requestUserPermission() {
    if (Platform.OS === "ios") {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log("Notification authorization status:", authStatus);
      }
    } else {
      console.log("Android notifications permissions configured.");
    }
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log("FCM Registration Token:", token);
      return token;
    } catch (error) {
      console.error("Failed to fetch FCM Token:", error);
      return null;
    }
  }

  setupListeners() {
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log("FCM foreground message received:", JSON.stringify(remoteMessage));
    });

    // Background message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("FCM background message received:", remoteMessage);
    });

    return () => {
      unsubscribeForeground();
    };
  }
}

export const firebaseService = new FirebaseService();
