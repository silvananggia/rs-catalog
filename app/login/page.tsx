import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-catalog-canvas px-4">
      <Suspense
        fallback={
          <div className="h-64 w-full max-w-md animate-pulse rounded-2xl bg-catalog-raised" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
