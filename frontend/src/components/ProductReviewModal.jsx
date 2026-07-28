import React, { useState, useEffect } from 'react';
import { X, Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProductReviewModal({ product, onClose, API_URL, onReviewAdded }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/products/${product}/reviews`);
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [product]);

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/products/${product}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review_text: reviewText, customer_name: customerName || 'Anonymous' })
      });
      if (res.ok) {
        setReviewText('');
        setCustomerName('');
        setRating(5);
        fetchReviews();
        if(onReviewAdded) onReviewAdded();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
            Reviews for {product}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {isLoading ? (
            <div className="text-center text-slate-400 py-10">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center text-slate-400 py-10">No reviews yet. Be the first to review!</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{rev.customer_name}</div>
                    <div className="flex items-center text-amber-500 text-sm">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className={`w-3.5 h-3.5 ${idx < rev.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-600'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{rev.review_text}</p>
                  <div className="text-[10px] text-slate-400 mt-2">{rev.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-3xl">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 text-sm">Write a Review</h3>
          <form onSubmit={submitReview} className="space-y-3">
            <div className="flex gap-3">
              <Input 
                placeholder="Your Name (optional)" 
                className="flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-10 rounded-xl text-sm"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <select 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-sm font-medium focus:outline-none"
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Share your thoughts..." 
                className="flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-10 rounded-xl text-sm"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                required
              />
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
