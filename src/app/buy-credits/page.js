'use client'

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../../context/FirebaseAuthContext';
import { updateUserCredits } from '../../firebase/clientApp';
import { useRouter } from 'next/navigation';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { user, updateCredits } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setError(error.message);
      setProcessing(false);
    } else if (paymentIntent.status === 'succeeded') {
      // Payment successful, add credits to user
      const creditsToAdd = 100; // Adding 100 credits for $20
      await updateUserCredits(user.uid, creditsToAdd);
      await updateCredits();
      router.push('/');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe || processing} className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded">
        {processing ? 'Processing...' : 'Pay $20 for 100 credits'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
}

export default function BuyCreditsPage() {
    const [clientSecret, setClientSecret] = useState('');
  
    useEffect(() => {
      fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 20 }), // $20 for 100 credits
      })
        .then((res) => res.json())
        .then((data) => setClientSecret(data.clientSecret));
    }, []);
  
    return (
      <div className="max-w-md mx-auto mt-10">
        <h1 className="text-2xl font-bold mb-4">Buy Credits</h1>
        {process.env.NODE_ENV !== 'production' && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p className="font-bold">Test Mode</p>
            <p>Use test card number: 4242 4242 4242 4242</p>
            <p>Expiry: Any future date, CVC: Any 3 digits</p>
          </div>
        )}
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        )}
      </div>
    );
  }