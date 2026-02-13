import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex items-center justify-center p-4">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-2xl rounded-2xl",
          },
        }}
        afterSignUpUrl="/onboarding"
        signInUrl="/sign-in"
      />
    </div>
  );
}
