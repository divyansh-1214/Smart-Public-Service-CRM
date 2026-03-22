"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ComplaintCategory, Priority } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Camera, 
  FileText, 
  Info,
  Loader2
} from "lucide-react";

const complaintSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide more details (min 20 characters)"),
  category: z.nativeEnum(ComplaintCategory),
  priority: z.nativeEnum(Priority),
  locationAddress: z.string().min(5, "Please provide a valid address"),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  photosUrls: z.array(z.string().url()),
});

type ComplaintFormData = z.input<typeof complaintSchema>;

interface GrievanceFormProps {
  citizenId: string;
  onSuccess: (complaint: any) => void;
}

export default function GrievanceForm({ citizenId, onSuccess }: GrievanceFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      category: ComplaintCategory.OTHER,
      priority: Priority.MEDIUM,
      photosUrls: [],
    },
    mode: "onChange",
  });

  const formData = watch();

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: ComplaintFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, citizenId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit grievance");
      }

      onSuccess(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Category", icon: Info },
    { id: 2, title: "Details", icon: FileText },
    { id: 3, title: "Location", icon: MapPin },
    { id: 4, title: "Review", icon: CheckCircle2 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Progress Bar */}
      <div className="bg-gray-50 px-8 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-300" 
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  step >= s.id ? "bg-blue-600 text-white" : "bg-white text-gray-400 border-2 border-gray-200"
                }`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs mt-2 font-medium ${step >= s.id ? "text-blue-600" : "text-gray-400"}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What type of issue are you reporting?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(ComplaintCategory).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setValue("category", cat)}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        formData.category === cat 
                          ? "border-blue-600 bg-blue-50 text-blue-700" 
                          : "border-gray-100 hover:border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="text-sm font-medium">{cat.replace(/_/g, " ")}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Priority Level
                </label>
                <div className="flex gap-3">
                  {Object.values(Priority).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setValue("priority", p)}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                        formData.priority === p 
                          ? "bg-blue-600 text-white border-blue-600" 
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Complaint Title
                </label>
                <input
                  {...register("title")}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Summarize the issue (e.g., Broken Streetlight near Central Park)"
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Detailed Description
                </label>
                <textarea
                  {...register("description")}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Please provide as much detail as possible..."
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    {...register("locationAddress")}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter full address or landmark"
                  />
                </div>
                {errors.locationAddress && <p className="mt-1 text-xs text-red-500">{errors.locationAddress.message}</p>}
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Our system will automatically route your complaint to the nearest officer based on this location.
                </p>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{formData.title || "Untitled Complaint"}</h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                      {formData.category} • {formData.priority} PRIORITY
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setStep(2)}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">{formData.description}</p>
                <div className="pt-4 border-t border-gray-200 flex items-center gap-2 text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{formData.locationAddress}</span>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center px-4">
                By submitting, you agree to our Terms of Service and verify that the information provided is accurate.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 flex gap-4">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          
          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              Next Step
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="flex-[2] bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Grievance
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
