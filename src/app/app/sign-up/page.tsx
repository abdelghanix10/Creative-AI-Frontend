"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { signUp } from "~/actions/auth";
import type { SignUpFormValues } from "~/schemas/auth";
import { signUpSchema } from "~/schemas/auth";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const name = watch("name");
  const username = watch("username");
  const email = watch("email");
  const password = watch("password");

  useEffect(() => {
    setIsFormValid(!!name && !!username && !!email && !!password);
  }, [name, username, email, password]);

  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    setError(null);

    const result = await signUp(data);

    if (result?.error) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Something went wrong",
      );
      setIsLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      redirect: false,
      emailOrUsername: data.email, // Use email for sign-in after registration
      password: data.password,
    });

    if (signInResult?.error) {
      router.push("/app/sign-in");
      return;
    }

    router.push("/app/dashboard");
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="relative w-full lg:w-1/2">
        <div className="absolute left-8 top-6 flex items-center gap-2 font-bold">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <Sparkles className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-foreground">
              Craetive AI
            </span>
          </div>
        </div>

        {/* Centered sign up form */}
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md p-8">
            <h2 className="mb-6 text-center text-2xl font-semibold text-foreground">
              Create your account
            </h2>

            {error && (
              <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  placeholder="Enter your full name"
                  required
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground placeholder:text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  {...register("username")}
                  placeholder="Enter your username"
                  required
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground placeholder:text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter your email address"
                  required
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground placeholder:text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground placeholder:text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className={`my-4 w-full rounded-full py-2.5 text-sm transition-colors ${isLoading ? "cursor-not-allowed bg-muted text-muted-foreground" : isFormValid ? "bg-primary text-primary-foreground hover:bg-primary/90" : "cursor-not-allowed bg-muted text-muted-foreground"}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  "Sign up"
                )}
              </button>

              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  Already have an account?
                  <a
                    className="font-medium text-primary underline hover:text-primary/80"
                    href="/app/sign-in"
                  >
                    Sign in
                  </a>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="hidden py-[3vh] pr-[3vh] lg:block lg:w-1/2">
        <div className="hidden h-full rounded-3xl bg-gradient-to-b from-indigo-100 via-purple-100 to-[#5960d7] lg:block">
          <div className="flex h-full flex-col p-12">
            <div className="flex h-full items-center justify-center">
              <img
                className="w-full rounded-lg"
                alt="Dashboard preview"
                src="/placeholder.png"
              />
            </div>

            <div className="h-fit w-full max-w-lg">
              <div className="mb-3 flex w-fit rounded-2xl bg-indigo-100 bg-opacity-40 px-3 py-1">
                <span className="text-xs font-medium uppercase tracking-wider text-white">
                  Latest updates
                </span>
              </div>
              <h3 className="text-lg text-white xl:text-xl 2xl:text-2xl 2xl:leading-10">
                Use the text-to-speech editor to create voiceovers in multiple
                voices using AI.
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
