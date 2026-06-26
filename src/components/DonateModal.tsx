import React, { useState, useEffect } from 'react';
import { X, Smartphone, DollarSign, User, Sparkles, CheckCircle, AlertCircle, Loader, Heart } from 'lucide-react';
import { apiFetch as fetch } from '../apiFetch';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('5000');
  
  // Checkout sequence state machine
  // 'idle' | 'initiating' | 'pending_pin' | 'successful' | 'failed'
  const [payState, setPayState] = useState<'idle' | 'initiating' | 'pending_pin' | 'successful' | 'failed'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [refId, setRefId] = useState('');
  const [statusDetails, setStatusDetails] = useState('');
  const [pollCountdown, setPollCountdown] = useState(60);

  // Quick preset donation amounts
  const presetAmounts = ['1000', '2000', '5000', '10000', '25000', '50000'];

  // Handle Close & Reset
  const handleClose = () => {
    onClose();
    // Reset state after a slight delay to avoid flashing back to first tab during fadeout
    setTimeout(() => {
      setPayState('idle');
      setDonorName('');
      setDonorPhone('');
      setAmount('5000');
      setErrorMsg('');
      setRefId('');
      setStatusDetails('');
      setPollCountdown(60);
    }, 300);
  };

  // Run status polling while user is in 'pending_pin' state
  useEffect(() => {
    let intervalId: any = null;
    if (payState === 'pending_pin' && refId) {
      intervalId = setInterval(() => {
        setPollCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setPayState('failed');
            setErrorMsg("Transaction timed out. Please request again and approve the MTN MoMo prompt within 60 seconds.");
            return 0;
          }
          return prev - 1;
        });

        // Fetch transaction status from the Express backend
        fetch(`/api/donate/status/${refId}`)
          .then((res) => {
            if (!res.ok) throw new Error("Status query failed");
            return res.json();
          })
          .then((data) => {
            if (data.status === 'SUCCESSFUL') {
              clearInterval(intervalId);
              setPayState('successful');
              setStatusDetails(data.details || 'Payment received successfully!');
            } else if (data.status === 'FAILED') {
              clearInterval(intervalId);
              setPayState('failed');
              setErrorMsg(data.details || 'Transaction was rejected or cancelled on your mobile device.');
            } else if (data.details) {
              setStatusDetails(data.details); // Show status log like "Awaiting MTN PIN..."
            }
          })
          .catch((err) => {
            console.warn("Polling error:", err);
          });
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [payState, refId]);

  // Initiate Request to Pay payment
  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusDetails('');

    // Form Validations
    if (!donorPhone.trim()) {
      setErrorMsg("MTN phone number is required to receive the MoMo payment prompt.");
      return;
    }
    const cleanPhone = donorPhone.trim().replace(/\s/g, '');
    // Simple verification (must be a plausible phone format)
    if (cleanPhone.length < 8 || isNaN(Number(cleanPhone.replace('+', '')))) {
      setErrorMsg("Please enter a valid active MTN phone number (e.g. 0791728473).");
      return;
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Donation amount must be a number greater than 0.");
      return;
    }

    setPayState('initiating');

    try {
      const response = await fetch('/api/donate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorName: donorName.trim() || 'Anonymous',
          donorPhone: cleanPhone,
          amount: numAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate MTN MoMo payment prompt.");
      }

      setRefId(data.referenceId);
      setPollCountdown(60);
      setPayState('pending_pin');
      setStatusDetails(data.message || 'Payment request sent. Please check your phone for prompt.');
    } catch (err: any) {
      setPayState('idle');
      setErrorMsg(err.message || 'An error occurred while connecting to MTN Mobile Money gateway.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id="donate-modal-overlay">
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-md overflow-hidden bg-[#1f0729] border border-[#521c60] rounded-2xl shadow-2xl transition-all duration-300"
        id="donate-modal-body"
      >
        {/* MTN Brand Header bar Accent */}
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-[#e95420] to-[#dd4814]" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          id="donate-modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* --- STATE 1: EDIT FORM --- */}
        {payState === 'idle' && (
          <form onSubmit={handleDonateSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <Heart className="w-6 h-6 fill-current animate-pulse text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Donate with MTN MoMo</h2>
              <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto">
                Support Ubuntu Flimsy! Contributions help secure faster streaming servers, high grade assets and educational textbooks.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Phone number field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400 block">
                  Your MTN Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#d3ad0d] text-sm font-mono font-semibold select-none flex items-center space-x-1">
                    <span>📱</span>
                  </span>
                  <input
                    type="tel"
                    required
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="e.g. 0791728473"
                    className="w-full bg-[#110118] text-white placeholder-gray-500 text-sm py-3 pl-11 pr-4 rounded-xl border border-[#4d165c] focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-mono">
                  Prompt will be pushed to this device. Sandbox Merchant code: <span className="text-yellow-400 font-semibold">914105</span>.
                </p>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400 block">
                  Donation Amount (RWF)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#d3ad0d] text-sm font-semibold select-none font-mono">
                    RWF
                  </span>
                  <input
                    type="number"
                    min="100"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-[#110118] text-white text-base py-3 pl-14 pr-4 rounded-xl border border-[#4d165c] font-bold font-mono focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  />
                </div>

                {/* Preset suggestions */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-1.5 px-2 bg-[#2d0f39] text-gray-200 border text-xs font-semibold rounded-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition duration-150 font-mono ${
                        amount === preset ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5' : 'border-[#421450]'
                      }`}
                    >
                      {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Name */}
              <div className="space-y-1.5 block">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400 block">
                  Donor Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full bg-[#110118] text-white placeholder-gray-500 text-sm py-3 pl-11 pr-4 rounded-xl border border-[#4d165c] focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-[#000000] font-sans font-bold text-sm uppercase tracking-wider rounded-xl transition duration-200 shadow-xl flex items-center justify-center space-x-2"
            >
              <Smartphone className="w-4 h-4 fill-current" />
              <span>Donate Now via MoMo</span>
            </button>
          </form>
        )}

        {/* --- STATE 2: INITIATING STAGE --- */}
        {payState === 'initiating' && (
          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center animate-spin">
              <Loader className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Contacting MTN network...</h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
                Dispatched Request to Pay payment prompt directly to your phone. Waiting for confirmation response...
              </p>
            </div>
          </div>
        )}

        {/* --- STATE 3: PENDING DIRECT MOBILE prompt --- */}
        {payState === 'pending_pin' && (
          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            {/* Pulsing prompt indicator */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-yellow-400/30 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-yellow-400 text-black flex items-center justify-center">
                <Smartphone className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2.5 max-w-sm">
              <span className="text-[10px] font-mono bg-yellow-400/15 text-yellow-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
                Awaiting Authorization
              </span>
              <h3 className="text-lg font-bold text-white">Check Your Code/Device!</h3>
              
              <div className="p-3 bg-[#110118] border border-[#521c60] rounded-xl text-xs space-y-1.5 font-mono text-gray-200 text-left">
                <div className="flex justify-between">
                  <span>Donor:</span>
                  <span className="text-white font-sans">{donorName || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="text-yellow-400 font-bold font-sans">{Number(amount).toLocaleString()} RWF</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="text-white font-sans">{donorPhone}</span>
                </div>
              </div>

              <p className="text-xs text-yellow-300/90 italic font-mono pt-1">
                {statusDetails || 'Awaiting MTN prompt pin confirmation...'}
              </p>
            </div>

            {/* Polling Timer Progress Bar */}
            <div className="w-full bg-[#110118] h-1.5 rounded-full overflow-hidden border border-[#4d165c]">
              <div 
                className="bg-yellow-400 h-full transition-all duration-1000 ease-linear" 
                style={{ width: `${(pollCountdown / 60) * 100}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-[10px] font-mono text-gray-400">
              <span>Time remaining: {pollCountdown}s</span>
              <span>Wait code response</span>
            </div>

            <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
              Unlock your phone. Enter your <span className="text-yellow-400">MoMo PIN</span> as prompted on your network operator to approve.
            </p>
          </div>
        )}

        {/* --- STATE 4: SUCCESS VIEW --- */}
        {payState === 'successful' && (
          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center text-green-400">
              <CheckCircle className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-sans text-green-400">Thank you for your donation!</h3>
              <p className="text-sm font-sans text-white font-bold">
                Payment received successfully.
              </p>
              <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed pt-1.5">
                Your support of <span className="text-yellow-400 font-bold">{Number(amount).toLocaleString()} RWF</span> has been processed securely. We appreciate your helpful hands.
              </p>
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl w-full max-w-xs text-left font-mono text-[11px] text-gray-300 space-y-1">
              <div><span className="text-gray-400">Donor Account:</span> {donorPhone}</div>
              <div><span className="text-gray-400">Receipt Ref:</span> {refId.slice(0, 18)}...</div>
              <div><span className="text-gray-400">MoMo Gateway:</span> MTN Collection Service</div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full max-w-xs py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition duration-150 uppercase text-xs font-sans tracking-wide"
            >
              Continue
            </button>
          </div>
        )}

        {/* --- STATE 5: FAILURE VIEW --- */}
        {payState === 'failed' && (
          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center text-red-400">
              <AlertCircle className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-red-400">Donation Request Unresolved</h3>
              <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
                {errorMsg || "The prompt was cancelled, rejected, or timed out. Please verify that your cellular account has sufficient funds and try again."}
              </p>
            </div>

            <div className="flex space-x-3 w-full">
              <button
                type="button"
                onClick={() => setPayState('idle')}
                className="flex-1 py-3 bg-[#e95420] hover:bg-[#e95420]/80 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 bg-[#2d0f39] border border-[#521c60] hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
