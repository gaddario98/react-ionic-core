import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
} from "@capacitor/push-notifications";
import {
  getMessaging,
  getToken,
  MessagePayload,
  onMessage,
} from "firebase/messaging"; // Added import

type NotificationPermissionStatus = "granted" | "denied" | "default";

export interface UseNotificationsReturn {
  pushToken: string;
  permissionStatus: NotificationPermissionStatus;
  initializeNotifications: (id: string) => Promise<void>;
}

type NotificationSchema =
  | (PushNotificationSchema & { type: "native" })
  | (MessagePayload & { type: "web" });

interface Props {
  setNotification: (notification: NotificationSchema) => void;
  updateToken?: (token: string) => void;
  fcmkey?: string; // Optional FCM key for web
}

export const useIonicNotifications = ({
  updateToken,
  setNotification,
  fcmkey,
}: Props): UseNotificationsReturn => {
  const [pushToken, setPushToken] = useState<string>("");
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("default");
  const registerForPushNotificationsAsync = useCallback(async (): Promise<
    string | undefined
  > => {
    if (!Capacitor.isNativePlatform()) {
      // Per web, usa l'API Notification
      if (!("Notification" in window)) {
        console.error("Il browser non supporta le notifiche.");
        return undefined;
      }
      // Richiedi i permessi se non ancora concessi
      const currentStatus = Notification.permission;
      let finalStatus = currentStatus;
      if (currentStatus !== "granted") {
        finalStatus = await Notification.requestPermission();
      }
      setPermissionStatus(finalStatus as NotificationPermissionStatus);

      if (finalStatus !== "granted") {
        return undefined;
      }

      // Use Firebase Messaging for web
      try {
        const messaging = getMessaging();
        // Assicurati che VITE_FIREBASE_VAPID_KEY sia configurata nel tuo ambiente Vite
        // const fcmToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
        const fcmToken = await getToken(messaging, {
          vapidKey: fcmkey,
        }); // Sostituisci con la tua VAPID key o risolvi import.meta.env
        if (fcmToken) {
          onMessage(messaging, (payload) => {
            console.log("Message received. ", payload);
            // Assumi che il payload sia compatibile o adatta la struttura a PushNotificationSchema
            setNotification({ ...payload, type: "web" });
          });
          return fcmToken;
        } else {
          console.error(
            "Nessun token di registrazione FCM disponibile. Assicurati che il service worker sia configurato."
          );
          return undefined;
        }
      } catch (err) {
        console.error("Errore durante l'ottenimento del token FCM:", err);
        return undefined;
      }
    } else {
      // Per piattaforme native (iOS/Android), usa Capacitor Push Notifications
      try {
        // Richiesta dei permessi
        const result = await PushNotifications.requestPermissions();

        if (result.receive === "granted") {
          setPermissionStatus("granted");

          // Registra con Apple / Google per ricevere il token push
          await PushNotifications.register();

          // Imposta i listener per gli eventi push
          PushNotifications.addListener("registration", (token: Token) => {
            setPushToken(token.value);
            return token.value;
          });

          PushNotifications.addListener("registrationError", (error) => {
            console.error("Errore nella registrazione push:", error);
          });

          PushNotifications.addListener(
            "pushNotificationReceived",
            (notification: PushNotificationSchema) => {
              setNotification({ ...notification, type: "native" });
            }
          );

          // Il token verrà impostato nel listener 'registration'
          return undefined;
        } else {
          setPermissionStatus("denied");
          return undefined;
        }
      } catch (error) {
        console.error("Errore nella registrazione push:", error);
        return undefined;
      }
    }
  }, [fcmkey, setNotification]);

  const initializeNotifications = useCallback(
    async (id: string): Promise<void> => {
      try {
        if (!id) return;
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setPushToken(token);
        }
      } catch (error) {
        throw new Error("Impossibile inizializzare le notifiche: " + error);
      }
    },
    [registerForPushNotificationsAsync]
  );

  useEffect(() => {
    if (pushToken) {
      // Aggiorna il token push se è cambiato
      updateToken?.(pushToken);
    }
  }, [pushToken, updateToken]);

  return {
    pushToken,
    permissionStatus,
    initializeNotifications,
  };
};
