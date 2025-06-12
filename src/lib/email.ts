import nodemailer from "nodemailer";

// Email configuration
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const transporter = nodemailer.createTransport({
  // Configure with your email provider
  // Example for Gmail:
  // service: "gmail",
  // auth: {
  //   user: process.env.EMAIL_USER,
  //   pass: process.env.EMAIL_PASS,
  // },
  // Example for SMTP:
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(template: EmailTemplate) {
  if (!process.env.EMAIL_ENABLED || process.env.EMAIL_ENABLED !== "true") {
    console.log("Email sending is disabled");
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@creativeai.com",
      ...template,
    });
    console.log(`Email sent to ${template.to}: ${template.subject}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  subscriptionCreated: (userEmail: string, planName: string) => ({
    to: userEmail,
    subject: "Welcome to Creative AI - Subscription Confirmed",
    html: `
      <h2>Welcome to Creative AI!</h2>
      <p>Your ${planName} subscription has been activated successfully.</p>
      <p>You can now enjoy all the features included in your plan.</p>
      <p>Thank you for choosing Creative AI!</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/dashboard">Go to Dashboard</a></p>
    `,
    text: `Welcome to Creative AI! Your ${planName} subscription has been activated successfully.`,
  }),

  subscriptionCanceled: (
    userEmail: string,
    planName: string,
    periodEnd: Date,
  ) => ({
    to: userEmail,
    subject: "Creative AI - Subscription Canceled",
    html: `
      <h2>Subscription Canceled</h2>
      <p>Your ${planName} subscription has been canceled.</p>
      <p>You'll continue to have access to your subscription features until ${periodEnd.toLocaleDateString()}.</p>
      <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/settings/billing">Manage Subscription</a></p>
    `,
    text: `Your ${planName} subscription has been canceled. Access continues until ${periodEnd.toLocaleDateString()}.`,
  }),

  paymentSucceeded: (
    userEmail: string,
    amount: number,
    invoiceUrl?: string,
  ) => ({
    to: userEmail,
    subject: "Creative AI - Payment Received",
    html: `
      <h2>Payment Received</h2>
      <p>Thank you! Your payment of $${amount.toFixed(2)} has been processed successfully.</p>
      ${invoiceUrl ? `<p><a href="${invoiceUrl}">View Invoice</a></p>` : ""}
      <p>Your subscription remains active and all features are available.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/dashboard">Go to Dashboard</a></p>
    `,
    text: `Payment of $${amount.toFixed(2)} processed successfully. Thank you!`,
  }),

  paymentFailed: (userEmail: string, amount: number, retryUrl?: string) => ({
    to: userEmail,
    subject: "Creative AI - Payment Failed",
    html: `
      <h2>Payment Failed</h2>
      <p>We were unable to process your payment of $${amount.toFixed(2)}.</p>
      <p>Please update your payment method to continue using Creative AI without interruption.</p>
      ${retryUrl ? `<p><a href="${retryUrl}">Update Payment Method</a></p>` : ""}
      <p><a href="${process.env.NEXTAUTH_URL}/app/settings/billing">Manage Billing</a></p>
    `,
    text: `Payment of $${amount.toFixed(2)} failed. Please update your payment method.`,
  }),

  subscriptionUpgraded: (
    userEmail: string,
    oldPlan: string,
    newPlan: string,
  ) => ({
    to: userEmail,
    subject: "Creative AI - Subscription Upgraded",
    html: `
      <h2>Subscription Upgraded</h2>
      <p>Congratulations! You've successfully upgraded from ${oldPlan} to ${newPlan}.</p>
      <p>You now have access to all the enhanced features of your new plan.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/dashboard">Explore Your New Features</a></p>
    `,
    text: `Subscription upgraded from ${oldPlan} to ${newPlan}. Enjoy your enhanced features!`,
  }),

  invoiceCreated: (
    userEmail: string,
    amount: number,
    dueDate: Date,
    invoiceUrl?: string,
  ) => ({
    to: userEmail,
    subject: "Creative AI - New Invoice",
    html: `
      <h2>New Invoice</h2>
      <p>A new invoice for $${amount.toFixed(2)} has been created for your Creative AI subscription.</p>
      <p>Due date: ${dueDate.toLocaleDateString()}</p>
      ${invoiceUrl ? `<p><a href="${invoiceUrl}">View and Pay Invoice</a></p>` : ""}
      <p>Thank you for using Creative AI!</p>
    `,
    text: `New invoice for $${amount.toFixed(2)} due ${dueDate.toLocaleDateString()}.`,
  }),
};

// Convenience functions for specific email types
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  planName: string,
  credits: string,
) {
  const template = {
    to: userEmail,
    subject: "Welcome to Creative AI - Subscription Confirmed",
    html: `
      <h2>Welcome to Creative AI, ${userName}!</h2>
      <p>Your ${planName} subscription has been activated successfully.</p>
      <p>You now have ${credits} credits to start creating amazing content.</p>
      <p>You can now enjoy all the features included in your plan.</p>
      <p>Thank you for choosing Creative AI!</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/dashboard">Go to Dashboard</a></p>
    `,
    text: `Welcome to Creative AI! Your ${planName} subscription has been activated successfully.`,
  };

  return sendEmail(template);
}

export async function sendPaymentSuccessEmail(
  userEmail: string,
  userName: string,
  amount: string,
  currency: string,
  date: string,
) {
  const template = {
    to: userEmail,
    subject: "Creative AI - Payment Received",
    html: `
      <h2>Payment Received</h2>
      <p>Hi ${userName},</p>
      <p>Thank you! Your payment of ${amount} ${currency} has been processed successfully on ${date}.</p>
      <p>Your subscription remains active and all features are available.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/dashboard">Go to Dashboard</a></p>
    `,
    text: `Payment of ${amount} ${currency} processed successfully. Thank you!`,
  };

  return sendEmail(template);
}

export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
  amount: string,
  currency: string,
  reason: string,
) {
  const template = {
    to: userEmail,
    subject: "Creative AI - Payment Failed",
    html: `
      <h2>Payment Failed</h2>
      <p>Hi ${userName},</p>
      <p>We were unable to process your payment of ${amount} ${currency}.</p>
      <p>Reason: ${reason}</p>
      <p>Please update your payment method to continue using Creative AI without interruption.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/billing">Update Payment Method</a></p>
    `,
    text: `Payment of ${amount} ${currency} failed. Please update your payment method.`,
  };

  return sendEmail(template);
}

export async function sendSubscriptionCancelledEmail(
  userEmail: string,
  userName: string,
  cancelDate: string,
) {
  const template = {
    to: userEmail,
    subject: "Creative AI - Subscription Canceled",
    html: `
      <h2>Subscription Canceled</h2>
      <p>Hi ${userName},</p>
      <p>Your Creative AI subscription has been canceled on ${cancelDate}.</p>
      <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/billing">Manage Subscription</a></p>
    `,
    text: `Your Creative AI subscription has been canceled on ${cancelDate}.`,
  };

  return sendEmail(template);
}

export async function sendInvoiceEmail(
  userEmail: string,
  userName: string,
  amount: string,
  currency: string,
  dueDate: string,
  invoiceUrl: string,
) {
  const template = {
    to: userEmail,
    subject: "Creative AI - New Invoice",
    html: `
      <h2>New Invoice</h2>
      <p>Hi ${userName},</p>
      <p>A new invoice for ${amount} ${currency} has been created for your Creative AI subscription.</p>
      <p>Due date: ${dueDate}</p>
      ${invoiceUrl ? `<p><a href="${invoiceUrl}">View and Pay Invoice</a></p>` : ""}
      <p>Thank you for using Creative AI!</p>
    `,
    text: `New invoice for ${amount} ${currency} due ${dueDate}.`,
  };

  return sendEmail(template);
}

export async function sendSubscriptionUpgradeEmail(
  userEmail: string,
  userName: string,
  oldPlanName: string,
  newPlanName: string,
) {
  const template = {
    to: userEmail,
    subject: "Creative AI - Subscription Upgraded",
    html: `
      <h2>Subscription Upgraded</h2>
      <p>Hi ${userName},</p>
      <p>Congratulations! You've successfully upgraded from ${oldPlanName} to ${newPlanName}.</p>
      <p>You now have access to all the enhanced features of your new plan.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/app/dashboard">Explore Your New Features</a></p>
    `,
    text: `Subscription upgraded from ${oldPlanName} to ${newPlanName}. Enjoy your enhanced features!`,
  };

  return sendEmail(template);
}
