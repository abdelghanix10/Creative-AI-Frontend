"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  updateUserName,
  updateUserEmail,
  updateUserPassword,
} from "~/actions/account";
import {
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  type UpdateNameFormValues,
  type UpdateEmailFormValues,
  type UpdatePasswordFormValues,
} from "~/schemas/account";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { PageLayout } from "~/components/client/page-layout";

export default function AccountSettingsPage() {
  const { data: session, update } = useSession();
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Name form
  const nameForm = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: {
      name: session?.user?.name ?? "",
    },
  });

  // Email form
  const emailForm = useForm<UpdateEmailFormValues>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      email: session?.user?.email ?? "",
    },
  });
  // Password form
  const passwordForm = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  // Update form values when session changes
  useEffect(() => {
    if (session?.user) {
      nameForm.setValue("name", session.user.name ?? "");
      emailForm.setValue("email", session.user.email ?? "");
    }
  }, [session, nameForm, emailForm]);

  const onUpdateName = async (data: UpdateNameFormValues) => {
    setIsNameLoading(true);
    try {
      const result = await updateUserName(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success!);
        // Update the session with new name
        await update({ name: data.name });
      }
    } catch (error) {
      toast.error("Failed to update name");
      console.error(error);
    } finally {
      setIsNameLoading(false);
    }
  };

  const onUpdateEmail = async (data: UpdateEmailFormValues) => {
    setIsEmailLoading(true);
    try {
      const result = await updateUserEmail(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success!);
        // Update the session with new email
        await update({ email: data.email });
      }
    } catch (error) {
      toast.error("Failed to update email");
      console.error(error);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const onUpdatePassword = async (data: UpdatePasswordFormValues) => {
    setIsPasswordLoading(true);
    try {
      const result = await updateUserPassword(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success!);
        // Reset the password form
        passwordForm.reset();
      }
    } catch (error) {
      toast.error("Failed to update password");
      console.error(error);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Please sign in to access account settings.</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout title={"Settings"} service={"settings"} showSidebar={false}>
      <div className="w-full p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Account Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account information and security settings.
            </p>
          </div>

          {/* Name Settings */}
          <Card className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:gap-24">
            <CardHeader className="basis-1/3">
              <CardTitle>Name</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
            </CardHeader>
            <CardContent className="basis-2/3">
              <form
                onSubmit={nameForm.handleSubmit(onUpdateName)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...nameForm.register("name")}
                    placeholder="Enter your full name"
                  />
                  {nameForm.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-500">
                      {nameForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={isNameLoading}>
                  {isNameLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Name
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:gap-24">
            <CardHeader className="basis-1/3">
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Update your email address.</CardDescription>
            </CardHeader>
            <CardContent className="basis-2/3">
              <form
                onSubmit={emailForm.handleSubmit(onUpdateEmail)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...emailForm.register("email")}
                    placeholder="Enter your email address"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={isEmailLoading}>
                  {isEmailLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Email
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Password Settings */}
          <Card className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:gap-24">
            <CardHeader className="basis-1/3">
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your account password. Make sure to use a strong
                password.
              </CardDescription>
            </CardHeader>
            <CardContent className="basis-2/3">
              <form
                onSubmit={passwordForm.handleSubmit(onUpdatePassword)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    placeholder="Enter your current password"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-500">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register("newPassword")}
                    placeholder="Enter your new password"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-red-500">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    placeholder="Confirm your new password"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:gap-24">
            <CardHeader className="basis-1/3">
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and subscription information.
              </CardDescription>
            </CardHeader>
            <CardContent className="basis-2/3 space-y-2">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span>{session.user.name ?? "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span>{session.user.username ?? "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{session.user.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
