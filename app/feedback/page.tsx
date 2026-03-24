"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Star, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Send
} from "lucide-react";
import { FeedbackTag } from "@prisma/client";

export default function FeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const complaintId = searchParams.get("complaintId");
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedTags, setSelectedTags] = useState<FeedbackTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: FeedbackTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !complaintId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId,
          rating,
          comment,
          tags: selectedTags,
          isAnonymous
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to submit feedback");
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Feedback Submitted</h1>
          <p className="text-gray-500 font-medium mt-4">Thank you for helping us improve our services. Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Rate Service</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 space-y-10">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold tracking-tight">{error}</p>
            </div>
          )}

          {/* Rating Stars */}
          <div className="text-center space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">How was your experience?</label>
            <div className="flex items-center justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-2 transition-all hover:scale-125 ${rating >= star ? "text-amber-400 drop-shadow-sm" : "text-gray-200"}`}
                >
                  <Star className={`w-10 h-10 ${rating >= star ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Quick Tags (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(FeedbackTag).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                    selectedTags.includes(tag) 
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" 
                      : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  {tag.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Area */}
          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" /> Share more details
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what went well or what we can improve..."
              className="w-full h-32 bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all outline-none resize-none"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">Anonymous Submission</p>
              <p className="text-xs font-medium text-gray-500">Hide your name from the resolving officer</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isAnonymous ? "bg-blue-600 shadow-lg shadow-blue-100" : "bg-gray-300"}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${isAnonymous ? "translate-x-6" : ""}`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || !rating}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-600 hover:shadow-2xl transition-all disabled:opacity-50 group"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
