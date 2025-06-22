"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  ArrowRight,
  Star,
  LetterText,
  ImageIcon,
  LayoutTemplate,
  Languages,
  AudioLines,
  Sparkles,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { useTheme } from "next-themes";
import { getSubscriptionPlans } from "~/actions/subscription";
import ParticlesBackground from "./particles-background";
import { WavyBackground } from "../ui/wavy-background";

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface MotionVariants {
  [key: string]: {
    opacity: number;
    transition?: {
      staggerChildren: number;
    };
  };
  hidden: { opacity: number };
  show: {
    opacity: number;
    transition: {
      staggerChildren: number;
    };
  };
}

interface MotionItemVariant {
  [key: string]: { opacity: number; y: number };
  hidden: { opacity: number; y: number };
  show: { opacity: number; y: number };
}

interface HomeProps {
  user: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  credits: number;
  price: number;
  yearlyPrice: number | null;
  features: string;
  isActive: boolean;
  stripePriceId?: string | null;
  stripeYearlyPriceId?: string | null;
}

export default function Home({ user }: HomeProps) {
  console.log("User:", user);

  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = (): void => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const subscriptionPlans = await getSubscriptionPlans();
        setPlans(subscriptionPlans ?? []);
      } catch (error) {
        console.error("Error fetching subscription plans:", error);
        setPlans([]);
      } finally {
        setPlansLoading(false);
      }
    };

    void fetchPlans();
  }, []);

  const toggleTheme = (): void => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Helper functions for subscription plans
  const formatPrice = (price: number) => {
    if (price === 0) return "$0";
    return `$${price.toFixed(2)}`;
  };

  const parseFeatures = (featuresJson: string): string[] => {
    try {
      return JSON.parse(featuresJson) as string[];
    } catch {
      return [];
    }
  };

  const getYearlyPrice = (monthlyPrice: number, yearlyPrice: number | null) => {
    return yearlyPrice ?? monthlyPrice * 12 * 0.8; // 20% discount if no yearly price set
  };

  const container: MotionVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item: MotionItemVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const features: Feature[] = [
    {
      title: "AI Text Generation",
      description:
        "Craft compelling articles, marketing copy, scripts, or emails with just a few prompts.",
      icon: <LetterText className="size-5" />,
    },
    {
      title: "Image & Video Creation",
      description:
        "Turn your ideas into stunning visuals using advanced AI image & video generation tools.",
      icon: <ImageIcon className="size-5" />,
    },
    {
      title: "Voice Synthesis",
      description:
        "Produce natural-sounding voiceovers or clone voices with lifelike precision.",
      icon: <AudioLines className="size-5" />,
    },
    {
      title: "Multi-Language Support",
      description:
        "Create content in multiple languages to reach a global audience effortlessly.",
      icon: <Languages className="size-5" />,
    },
    {
      title: "Personalized Templates",
      description:
        "Use professionally designed templates tailored to your industry and goals.",
      icon: <LayoutTemplate className="size-5" />,
    },
    {
      title: "24/7 Support",
      description:
        "Get help whenever you need it with our dedicated support team.",
      icon: <Star className="size-5" />,
    },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <header
        className={`sticky top-0 z-50 w-full backdrop-blur-lg transition-all duration-300 ${isScrolled ? "bg-background/80 shadow-sm" : "bg-transparent"}`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <Sparkles className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Craetive AI</span>
            </div>
          </div>
          <nav className="hidden gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Testimonials
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {mounted && theme === "dark" ? (
                <Sun className="size-[18px]" />
              ) : (
                <Moon className="size-[18px]" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            {user ? (
              ""
            ) : (
              <Link
                href="/app/sign-in"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
            )}
            <Button className="rounded-full">
              <Link href={user ? "/app/dashboard" : "/app/sign-up"}>
                {user ? "Go to Dashboard" : "Get Started"}
              </Link>
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {mounted && theme === "dark" ? (
                <Sun className="size-[18px]" />
              ) : (
                <Moon className="size-[18px]" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-x-0 top-16 border-b bg-background/95 backdrop-blur-lg md:hidden"
          >
            <div className="container mx-auto flex flex-col gap-4 px-4 py-4">
              <Link
                href="#features"
                className="py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                className="py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </Link>
              <Link
                href="#pricing"
                className="py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="#faq"
                className="py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <div className="flex flex-col gap-2 border-t pt-2">
                {user ? (
                  ""
                ) : (
                  <Link
                    href="/app/sign-in"
                    className="py-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                )}
                <Button className="rounded-full">
                  <Link href={user ? "/app/dashboard" : "/app/sign-up"}>
                    {user ? "Go to Dashboard" : "Get Started"}
                  </Link>
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full overflow-hidden">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:bg-black dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)]"></div>
          <div className="relative mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="container mx-auto mb-12 max-w-3xl px-4 py-12 text-center md:px-6"
            >
              <Badge
                className="mb-4 rounded-full px-4 py-1.5 text-sm font-medium"
                variant="secondary"
              >
                CreativeAI
              </Badge>
              <h1 className="mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl">
                The most realistic AI platform
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
                AI models and products powering millions of developers,
                creators, and enterprises. From low‑latency conversational
                agents to the leading AI voice generator for voiceovers and
                audiobooks.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button size="lg" className="h-12 rounded-full px-8 text-base">
                  <Link href={user ? "/app/dashboard" : "/app/sign-up"}>
                    {user ? "Go to Dashboard" : "Start Free Trial"}
                  </Link>
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative mx-auto py-12"
            >
              <WavyBackground
                key={theme}
                backgroundFill={theme === "dark" ? "#000000" : "#ffffff"}
                className="mx-auto flex max-w-4xl items-center justify-center p-10"
              >
                <div className="overflow-hidden rounded-xl bg-gradient-to-b from-background to-muted/20 shadow-2xl">
                  <Image
                    src="/Dashboard.jpg"
                    width={1280}
                    height={720}
                    alt="SaaSify dashboard"
                    className="h-auto w-full"
                    priority
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
                </div>
                <div className="absolute -bottom-6 -right-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 opacity-70 blur-3xl"></div>
                <div className="absolute -left-6 -top-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 opacity-70 blur-3xl"></div>
              </WavyBackground>
            </motion.div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="w-full border-y bg-muted/30 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Trusted by innovative companies worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Image
                    key={i}
                    src={`/placeholder-logo.svg`}
                    alt={`Company logo ${i}`}
                    width={120}
                    height={60}
                    className="h-8 w-auto opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12 flex flex-col items-center justify-center space-y-4 text-center"
            >
              <Badge
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                variant="secondary"
              >
                Features
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Unleash Your Creative Potential
              </h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                CreativeAi offers a complete suite of AI-powered tools designed
                to transform how you create content—smarter, faster, and more
                intuitively than ever.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, i) => (
                <motion.div key={i} variants={item}>
                  <Card className="h-full overflow-hidden border border-black/10 bg-gradient-to-b from-background/80 to-muted/20 backdrop-blur-md transition-all hover:border-black/20 hover:shadow-lg dark:border-white/20 dark:hover:border-white/30">
                    <CardContent className="flex h-full flex-col p-6">
                      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                        {feature.icon}
                      </div>
                      <h3 className="mb-2 text-xl font-bold">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative w-full overflow-hidden bg-muted/30 py-20 md:py-32">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)] dark:bg-black dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)]"></div>

          <div className="container relative mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-16 flex flex-col items-center justify-center space-y-4 text-center"
            >
              <Badge
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                variant="secondary"
              >
                How It Works
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Simple Process, Powerful Results
              </h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Get started in minutes and see the difference our platform can
                make for your business.
              </p>
            </motion.div>

            <div className="relative grid gap-8 md:grid-cols-3 md:gap-12">
              <div className="absolute left-0 right-0 top-1/2 z-0 hidden h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent md:block"></div>

              {[
                {
                  step: "01",
                  title: "Create Account",
                  description:
                    "Sign up in seconds using your email—no credit card needed. Start exploring CreativeAi instantly.",
                },
                {
                  step: "02",
                  title: "Set Up Your Creative Space",
                  description:
                    "Choose your content goals and customize your workspace for writing, design, or voice generation.",
                },
                {
                  step: "03",
                  title: "Create with AI",
                  description:
                    "Leverage powerful tools to generate stunning content, boost productivity, and bring your ideas to life.",
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative z-10 flex flex-col items-center space-y-4 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12 flex flex-col items-center justify-center space-y-4 text-center"
            >
              <Badge
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                variant="secondary"
              >
                Testimonials
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Loved by Teams Worldwide
              </h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Don&apos;t just take our word for it. See what our customers
                have to say about their experience.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  quote:
                    "CreativeAi a complètement changé notre façon de produire du contenu. Les outils d'IA sont puissants, rapides, et simples à utiliser.",
                  author: "Claire Dubois",
                  role: "Responsable Marketing, CréaPlus",
                  rating: 5,
                },
                {
                  quote:
                    "L'outil de génération vocale est bluffant. Nous avons pu créer des voix off professionnelles sans passer par un studio.",
                  author: "Nassim El Hariri",
                  role: "Producteur Audio, StudioWave",
                  rating: 5,
                },
                {
                  quote:
                    "Grâce à CreativeAi, notre équipe gagne un temps fou sur la rédaction de contenu SEO. C'est devenu un pilier de notre stratégie digitale.",
                  author: "Lucie Garnier",
                  role: "Consultante SEO, Web&Rank",
                  rating: 5,
                },
                {
                  quote:
                    "La génération d'images est tout simplement incroyable. Nos visuels marketing ont atteint un nouveau niveau de créativité.",
                  author: "Antoine Lefèvre",
                  role: "Directeur Artistique, NovaDesign",
                  rating: 5,
                },
                {
                  quote:
                    "Nous travaillons à distance, et CreativeAi a permis une collaboration fluide entre nos équipes grâce à ses outils cloud intégrés.",
                  author: "Fatima Benkacem",
                  role: "Coordinatrice de Projet, GlobalEdu",
                  rating: 5,
                },
                {
                  quote:
                    "J'ai testé plusieurs plateformes IA, mais aucune n'égale la qualité, la simplicité et la richesse des fonctionnalités de CreativeAi.",
                  author: "Thomas Morel",
                  role: "Fondateur, ContentForge",
                  rating: 5,
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <Card className="h-full overflow-hidden border border-black/10 bg-gradient-to-b from-background/80 to-muted/20 backdrop-blur-md transition-all hover:border-black/20 hover:shadow-lg dark:border-white/20 dark:hover:border-white/30">
                    <CardContent className="flex h-full flex-col p-6">
                      <div className="mb-4 flex">
                        {Array(testimonial.rating)
                          .fill(0)
                          .map((_, j) => (
                            <Star
                              key={j}
                              className="size-4 fill-yellow-500 text-yellow-500"
                            />
                          ))}
                      </div>
                      <p className="mb-6 flex-grow text-lg">
                        {testimonial.quote}
                      </p>
                      <div className="mt-auto flex items-center gap-4 border-t border-black/10 pt-4 dark:border-white/20">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium text-foreground">
                          {testimonial.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{testimonial.author}</p>
                          <p className="text-sm text-muted-foreground">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          className="relative w-full overflow-hidden bg-muted/30 py-20 md:py-32"
        >
          <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)] dark:bg-black dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)]"></div>

          <div className="container relative mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12 flex flex-col items-center justify-center space-y-4 text-center"
            >
              <Badge
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                variant="secondary"
              >
                Pricing
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Choose the plan that&apos;s right for your business. All plans
                include a 14-day free trial.
              </p>
            </motion.div>

            <div className="mx-auto max-w-5xl">
              {plansLoading ? (
                <div className="space-y-8">
                  <div className="mb-8 flex justify-center">
                    <Skeleton className="h-10 w-64 rounded-full" />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-96 w-full" />
                    ))}
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="monthly" className="w-full">
                  <div className="mb-8 flex justify-center">
                    <TabsList className="rounded-full p-1">
                      <TabsTrigger
                        value="monthly"
                        className="rounded-full px-6"
                      >
                        Monthly
                      </TabsTrigger>
                      <TabsTrigger
                        value="annually"
                        className="rounded-full px-6"
                      >
                        Annually (Save 20%)
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="monthly">
                    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                      {plans.map((plan, i) => (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                          <Card
                            className={`relative h-full overflow-hidden ${
                              plan.name === "Pro"
                                ? "border-primary shadow-lg"
                                : "border-border/40 shadow-md"
                            } bg-gradient-to-b from-background to-muted/10 backdrop-blur`}
                          >
                            {plan.name === "Pro" && (
                              <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                                Most Popular
                              </div>
                            )}
                            <CardContent className="flex h-full flex-col p-6">
                              <h3 className="text-2xl font-bold">
                                {plan.displayName}
                              </h3>
                              <div className="mt-4 flex items-baseline">
                                <span className="text-4xl font-bold">
                                  {formatPrice(plan.price)}
                                </span>
                                <span className="ml-1 text-muted-foreground">
                                  /month
                                </span>
                              </div>
                              <p className="mt-2 text-muted-foreground">
                                {plan.description ??
                                  `${plan.credits.toLocaleString()} credits per month`}
                              </p>
                              <ul className="my-6 flex-grow space-y-3">
                                {parseFeatures(plan.features).map(
                                  (feature, j) => (
                                    <li key={j} className="flex items-center">
                                      <Check className="mr-2 size-4 text-primary" />
                                      <span>{feature}</span>
                                    </li>
                                  ),
                                )}
                              </ul>
                              <Button
                                className={`mt-auto w-full rounded-full ${
                                  plan.name === "Pro"
                                    ? "bg-primary hover:bg-primary/90"
                                    : "bg-muted hover:bg-muted/80"
                                }`}
                                variant={
                                  plan.name === "Pro" ? "default" : "outline"
                                }
                                asChild
                              >
                                <Link href="/app/sign-up">
                                  {plan.price === 0
                                    ? "Get Started Free"
                                    : "Start Free Trial"}
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="annually">
                    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                      {plans.map((plan, i) => {
                        const yearlyPrice = getYearlyPrice(
                          plan.price,
                          plan.yearlyPrice,
                        );
                        const monthlyEquivalent = yearlyPrice / 12;

                        return (
                          <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                          >
                            <Card
                              className={`relative h-full overflow-hidden ${
                                plan.name === "Pro"
                                  ? "border-primary shadow-lg"
                                  : "border-border/40 shadow-md"
                              } bg-gradient-to-b from-background to-muted/10 backdrop-blur`}
                            >
                              {plan.name === "Pro" && (
                                <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                                  Most Popular
                                </div>
                              )}
                              <CardContent className="flex h-full flex-col p-6">
                                <h3 className="text-2xl font-bold">
                                  {plan.displayName}
                                </h3>
                                <div className="mt-4 flex items-baseline">
                                  <span className="text-4xl font-bold">
                                    {formatPrice(monthlyEquivalent)}
                                  </span>
                                  <span className="ml-1 text-muted-foreground">
                                    /month
                                  </span>
                                  {plan.price > 0 && (
                                    <span className="ml-2 text-sm text-muted-foreground line-through">
                                      {formatPrice(plan.price)}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-muted-foreground">
                                  {plan.description ??
                                    `${plan.credits.toLocaleString()} credits per month`}
                                  {plan.price > 0 &&
                                    " • Save 20% with annual billing"}
                                </p>
                                <ul className="my-6 flex-grow space-y-3">
                                  {parseFeatures(plan.features).map(
                                    (feature, j) => (
                                      <li key={j} className="flex items-center">
                                        <Check className="mr-2 size-4 text-primary" />
                                        <span>{feature}</span>
                                      </li>
                                    ),
                                  )}
                                  {plan.price > 0 && (
                                    <li className="flex items-center">
                                      <Check className="mr-2 size-4 text-primary" />
                                      <span>Save 20% with annual billing</span>
                                    </li>
                                  )}
                                </ul>
                                <Button
                                  className={`mt-auto w-full rounded-full ${
                                    plan.name === "Pro"
                                      ? "bg-primary hover:bg-primary/90"
                                      : "bg-muted hover:bg-muted/80"
                                  }`}
                                  variant={
                                    plan.name === "Pro" ? "default" : "outline"
                                  }
                                  asChild
                                >
                                  <Link href="/app/sign-up">
                                    {plan.price === 0
                                      ? "Get Started Free"
                                      : "Start Free Trial"}
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12 flex flex-col items-center justify-center space-y-4 text-center"
            >
              <Badge
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                variant="secondary"
              >
                FAQ
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Find answers to common questions about our platform.
              </p>
            </motion.div>

            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                {[
                  {
                    question: "How does the 14-day free trial work?",
                    answer:
                      "Our 14-day free trial gives you full access to all features of your selected plan. No credit card is required to sign up, and you can cancel at any time during the trial period with no obligation.",
                  },
                  {
                    question: "Can I change plans later?",
                    answer:
                      "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the new pricing will be prorated for the remainder of your billing cycle. If you downgrade, the new pricing will take effect at the start of your next billing cycle.",
                  },
                  {
                    question: "Is there a limit to how many users I can add?",
                    answer:
                      "The number of users depends on your plan. The Starter plan allows up to 5 team members, the Professional plan allows up to 20, and the Enterprise plan has no limit on team members.",
                  },
                  {
                    question:
                      "Do you offer discounts for nonprofits or educational institutions?",
                    answer:
                      "Yes, we offer special pricing for nonprofits, educational institutions, and open-source projects. Please contact our sales team for more information.",
                  },
                  {
                    question: "How secure is my data?",
                    answer:
                      "We take security very seriously. All data is encrypted both in transit and at rest. We use industry-standard security practices and regularly undergo security audits. Our platform is compliant with GDPR, CCPA, and other relevant regulations.",
                  },
                  {
                    question: "What kind of support do you offer?",
                    answer:
                      "Support varies by plan. All plans include email support, with the Professional plan offering priority email support. The Enterprise plan includes 24/7 phone and email support. We also have an extensive knowledge base and community forum available to all users.",
                  },
                ].map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <AccordionItem
                      value={`item-${i}`}
                      className="border-b border-border/40 py-2"
                    >
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <ParticlesBackground user={user} />
      </main>
      <footer className="w-full border-t bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-8 px-4 py-10 md:px-6 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Craetive AI</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Create Smarter, Work Faster, All-in-one AI platform to
                streamline content creation, boost productivity, and grow your
                business.
              </p>
              <div className="flex gap-4">
                <Link
                  href="https://www.facebook.com"
                  target="_blank"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link
                  href="https://www.x.com"
                  target="_blank"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                  <span className="sr-only">Twitter</span>
                </Link>
                <Link
                  href="https://www.LinkedIn.com"
                  target="_blank"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect width="4" height="12" x="2" y="9"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  <span className="sr-only">LinkedIn</span>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#testimonials"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Testimonials
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#faq"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} CreativeAI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
