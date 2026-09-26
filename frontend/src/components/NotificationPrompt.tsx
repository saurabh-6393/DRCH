import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationPrompt() {
  const { isAuthenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, []);

  if (!isAuthenticated || permission !== 'default' || dismissed) {
    return null;
  }

  const handleEnableNotifications = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Fetch public VAPID key from server
        const keyRes = await axios.get('/api/v1/notifications/vapid-public-key');
        const publicKey = keyRes.data?.data?.publicKey;

        if (publicKey) {
          const applicationServerKey = urlBase64ToUint8Array(publicKey);
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any,
          });

          const subJson = subscription.toJSON();
          if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            await axios.post(
              '/api/v1/notifications/subscribe',
              {
                endpoint: subJson.endpoint,
                keys: {
                  p256dh: subJson.keys.p256dh,
                  auth: subJson.keys.auth,
                },
              },
              { withCredentials: true }
            );
            setStatusMessage('Emergency push alerts enabled successfully.');
          }
        }
      } else {
        setStatusMessage('Notification permission was not granted.');
      }
    } catch (err: any) {
      console.warn('Failed to subscribe to Web Push:', err.message);
      setStatusMessage('Failed to subscribe to push alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Emergency Notifications Consent"
      className="mb-6 p-4 rounded-xl bg-gray-900 border border-blue-500/30 shadow-lg text-gray-200"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">
              Enable Real-Time Emergency Alerts
            </h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed max-w-xl">
              Receive life-safety alerts, evacuation warnings, and disaster response updates
              for your area directly on your device through browser push notifications.
            </p>
            {statusMessage && (
              <p className="text-xs text-blue-400 mt-2">{statusMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setDismissed(true)}
            className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable Push Alerts'}
          </button>
        </div>
      </div>
    </div>
  );
}
