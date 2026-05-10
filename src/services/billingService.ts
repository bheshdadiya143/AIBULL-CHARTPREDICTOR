import { Capacitor } from '@capacitor/core';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

// Note: capacitor-billing is a standard wrapper. 
// If it's not available in the environment, we use a simulation 
// that triggers the actual Firestore update so the app 'works' in preview.

export interface PurchaseResult {
  success: boolean;
  token?: string;
  productId?: string;
  error?: string;
}

export const BillingService = {
  /**
   * Initializes the billing plugin if on a native platform.
   */
  async initialize() {
    if (Capacitor.isNativePlatform()) {
      console.log("BillingService: Initializing Native Google Play Billing...");
      // In a real app, you might call Billing.initialize() here
    }
  },

  /**
   * Starts the move purchase flow.
   * @param tierId The internal tier ID (e.g., 'monthly', 'yearly')
   * @param userUid The current authentication UID
   */
  async purchaseTier(tierId: string, userUid: string): Promise<PurchaseResult> {
    const productMap: Record<string, string> = {
      'monthly': 'sub_standard_monthly',
      '3-months': 'sub_growth_quarterly',
      '6-months': 'sub_pro_half_yearly',
      'yearly': 'sub_institution_yearly'
    };

    const productId = productMap[tierId];

    if (Capacitor.isNativePlatform()) {
      try {
        // This is where you call the REAL Google Play Billing pop-up
        // const result = await Billing.purchase({ productId });
        // return { success: true, token: result.receipt, productId };
        
        // Since we are in a dev environment, we'll log it.
        console.log(`Native: Triggering Google Play Billing for ${productId}`);
        return { success: true, token: "mock_google_play_token_" + Date.now(), productId };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      // WEB SIMULATION (for AI Studio Preview)
      console.log(`Web: Simulating Google Play Checkout for ${productId}`);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, token: "web_sim_token_" + Date.now(), productId });
        }, 2000);
      });
    }
  },

  /**
   * Persists the subscription state to Firestore.
   * This is called AFTER a successful Google Play payment.
   */
  async activateSubscriptionInFirestore(userUid: string, tierId: string, token: string) {
    const durationMap: Record<string, number> = {
      'monthly': 30 * 24 * 60 * 60 * 1000,
      '3-months': 90 * 24 * 60 * 60 * 1000,
      '6-months': 180 * 24 * 60 * 60 * 1000,
      'yearly': 365 * 24 * 60 * 60 * 1000
    };

    const expiresAt = Date.now() + (durationMap[tierId] || 30 * 24 * 60 * 60 * 1000);
    const userPath = `users/${userUid}`;
    const userRef = doc(db, userPath);
    
    try {
      await updateDoc(userRef, {
        isSubscribed: true,
        planId: tierId,
        subscriptionExpiresAt: expiresAt,
        paymentToken: token, // Store the token for server-side verification if needed
        updatedAt: serverTimestamp()
      });

      return { isSubscribed: true, planId: tierId, subscriptionExpiresAt: expiresAt };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
      throw error;
    }
  }
};

