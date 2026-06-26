/**
 * MTN MoMo Payment Integration Service
 * 
 * This service implements the real MTN Mobile Money Collection API (Request to Pay).
 * It reads credentials from process.env and makes direct HTTPS requests using standard Node.js fetch.
 * 
 * If MTN API credentials are not set, it operates in an Integration-Ready Demo Mode,
 * simulating real checkout prompt states (Pending -> Approved/Cancelled) so you can test
 * the full user experience of on-device prompt approvals seamlessly!
 */

import { randomUUID } from 'crypto';

// Setup environment variable defaults.
// In production, these should be populated via your host control panel or .env file.
const MOMO_API_BASE_URL = process.env.MOMO_API_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY || '';
const MOMO_API_USER = process.env.MOMO_API_USER || '';
const MOMO_API_KEY = process.env.MOMO_API_KEY || '';
const MOMO_TARGET_ENV = process.env.MOMO_TARGET_ENV || 'sandbox'; // sandbox or production
const MERCHANT_CODE = process.env.MOMO_MERCHANT_CODE || '914105';
const MERCHANT_PHONE = process.env.MOMO_PHONE_NUMBER || '0791728473';

// Mock state tracker for when API keys are not supplied (Demo mode)
interface PendingMockTransaction {
  refId: string;
  phone: string;
  amount: number;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  createdAt: number;
}
const mockTransactionsDb = new Map<string, PendingMockTransaction>();

/**
 * Checks if the actual MTN credentials are fully configured.
 */
export function isMomoConfigured(): boolean {
  return !!(MOMO_SUBSCRIPTION_KEY && MOMO_API_USER && MOMO_API_KEY);
}

/**
 * MTN MoMo: Obtain Access Token using basic authentication credentials
 */
async function getMomoAccessToken(): Promise<string> {
  const tokenEndpoint = `${MOMO_API_BASE_URL}/collection/token/`;
  
  // Basic Auth header using (API User ID : API Key)
  const authHeader = Buffer.from(`${MOMO_API_USER}:${MOMO_API_KEY}`).toString('base64');
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MTN Access Token fetch failed: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();
  return data.access_token;
}

/**
 * Initiates an MTN Mobile Money "Request to Pay" prompt.
 * 
 * @param phone Current donor's MTN phone number (e.g. "0791728473" or international like "250791728473")
 * @param amount Amount to request (greater than 0)
 * @param donorName Optional name of the donor
 * @returns Transaction details with unique transactionReference (uuid)
 */
export async function createMomoPayment(phone: string, amount: number, donorName?: string): Promise<{
  referenceId: string;
  isMock: boolean;
  message: string;
}> {
  const referenceId = randomUUID(); // Generation of the unique X-Reference-Id UUIDv4

  // Check if API keys are missing. If so, fall back to our high-fidelity Simulator Mode
  if (!isMomoConfigured()) {
    console.log(`💡 MTN MoMo is not fully configured (MOMO_SUBSCRIPTION_KEY missing). Initializing Realistic Merchant Transaction in DEMO Mode...`);
    
    // Save to demo tracker. Simulate an active prompt that will be approved
    // We default to "PENDING", and after 4 seconds we will treat it as "SUCCESSFUL" to resemble genuine payment confirmation
    mockTransactionsDb.set(referenceId, {
      refId: referenceId,
      phone,
      amount,
      status: 'PENDING',
      createdAt: Date.now()
    });

    return {
      referenceId,
      isMock: true,
      message: `Direct Request-To-Pay initiated for prompt on phone ${phone}. [Demo Mode]`
    };
  }

  try {
    const accessToken = await getMomoAccessToken();
    const payEndpoint = `${MOMO_API_BASE_URL}/collection/v1_0/requesttopay`;

    // Format phone number to international code standard (e.g. Rwanda uses +250 or 250)
    let formattedPhone = phone.trim().replace(/\+/g, '');
    if (formattedPhone.startsWith('0')) {
      // Default sandbox assumes East Africa code 250 (RWF) or similar. Let's prepend country code 250 if starting with 0
      formattedPhone = '250' + formattedPhone.substring(1);
    }

    const payload = {
      amount: amount.toString(),
      currency: 'RWF', // Replace with dynamic currency or GHS/UGX/RWF depending on requirement
      externalId: Math.floor(Math.random() * 10000000).toString(),
      payer: {
        partyIdType: 'MSISDN',
        partyId: formattedPhone
      },
      payerMessage: `Donation to Ubuntu Flimsy from ${donorName || 'Anonymous'}`,
      payeeNote: `MoMo Pay Code: ${MERCHANT_CODE}`
    };

    console.log(`⚡ Sending MTN RequestToPay: [Ref: ${referenceId}] [Phone: ${formattedPhone}] [Amount: ${amount}]`);

    const response = await fetch(payEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': MOMO_TARGET_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.status !== 202) {
      const errText = await response.text();
      throw new Error(`MTN Payment request failed with status ${response.status}: ${errText}`);
    }

    return {
      referenceId,
      isMock: false,
      message: 'Request to Pay dispatched successfully.'
    };
  } catch (err: any) {
    console.error('❌ MTN MoMo API direct payment error:', err);
    throw new Error(`MTN MoMo Integration error: ${err.message}`);
  }
}

/**
 * Checks/polls the current status of the requested MTN Mobile Money transaction.
 * 
 * @param referenceId The unique reference UUID returned by createMomoPayment
 */
export async function checkMomoPaymentStatus(referenceId: string): Promise<{
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  details?: string;
}> {
  // If mock transaction, fetch from local state and update state based on transition delay
  if (mockTransactionsDb.has(referenceId)) {
    const tx = mockTransactionsDb.get(referenceId)!;
    
    // Simulate real delay. If transaction time is more than 5 seconds ago, mark it successful
    // This perfectly lets users see the countdown loader progress bar, transition, and success screen!
    const delay = Date.now() - tx.createdAt;
    if (tx.status === 'PENDING') {
      if (delay > 5200) {
        // High fidelity test cases: 
        // If the amount is exactly 123, simulate dynamic cancellation/failed response!
        if (tx.amount === 123) {
          tx.status = 'FAILED';
        } else {
          tx.status = 'SUCCESSFUL';
        }
        mockTransactionsDb.set(referenceId, tx);
      }
    }

    return {
      status: tx.status,
      details: tx.status === 'SUCCESSFUL' 
        ? 'Approved on mobile device via simulator' 
        : tx.status === 'FAILED'
        ? 'Cancelled by payer or expired'
        : 'Awaiting device MoMo PIN entry'
    };
  }

  try {
    const accessToken = await getMomoAccessToken();
    const statusEndpoint = `${MOMO_API_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`;

    const response = await fetch(statusEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Target-Environment': MOMO_TARGET_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`MTN status poll query failed with status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    
    // MTN MoMo collection response statuses are: "PENDING", "SUCCESSFUL", "FAILED"
    const mtnStatus = (data.status || 'PENDING').toUpperCase();

    if (mtnStatus === 'SUCCESSFUL' || mtnStatus === 'SUCCESS') {
      return { status: 'SUCCESSFUL', details: 'Payment completed successfully.' };
    } else if (mtnStatus === 'FAILED') {
      return { status: 'FAILED', details: data.reason || 'Transaction failed or rejected.' };
    }

    return { status: 'PENDING', details: 'Awaiting user PIN entry.' };
  } catch (err: any) {
    console.error(`❌ MTN status query issue for [ID: ${referenceId}]:`, err);
    // Return pending as fallback while checking, or fail if we get an authentication error
    return { status: 'PENDING', details: `Retry tracking: ${err.message}` };
  }
}
