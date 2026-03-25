import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">PS-CRM</h1>
          <p className="text-gray-500 font-medium mb-8">Sign in to your citizen or officer portal</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
