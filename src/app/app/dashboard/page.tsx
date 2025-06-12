import StatsCards from "~/components/client/dashboard/StatsCards";
import RecentGenerations from "~/components/client/dashboard/RecentGenerations";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { PageLayout } from "~/components/client/page-layout";

export default async function Page() {
  const session = await auth();
  const user = session?.user;
  const userId = session?.user.id;

  let imageCount = 0;
  let modelCount = 0;
  let credits = 0;
  type RecentGenerations = {
    images: {
      id: string;
      prompt: string;
      provider: string;
      modelId: string;
      s3Key: string;
      createdAt: Date;
    }[];
    audioClips: {
      id: string;
      text: string;
      voice: string;
      s3Key: string;
      service: string;
      createdAt: Date;
    }[];
    voices: {
      id: string;
      text: string;
      voice: string;
      s3Key: string;
      service: string;
      createdAt: Date;
    }[];
    videos: {
      id: string;
      prompt: string;
      provider: string;
      modelId: string;
      mode: string;
      resolution: string | null;
      aspectRatio: string | null;
      duration: number | null;
      imageUrl: string | null;
      videoUrl: string | null;
      createdAt: Date;
    }[];
  };
  let recentGenerations: RecentGenerations = {
    images: [],
    audioClips: [],
    voices: [],
    videos: [],
  };

  if (userId) {
    // Get user data including credits
    const userData = await db.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
      },
    });

    // Get count of generated images for this user
    const imageCountData = await db.generatedImage.count({
      where: {
        userId: userId,
        failed: false, // Only count successful generations
      },
    });

    // Get count of user voices (models) for this user
    const voiceCountData = await db.generatedAudioClip.count({
      where: {
        userId: userId,
        service: "make-an-audio",
        failed: false,
      },
    });

    // Get recent generations
    const [recentImages, recentAudioClips, recentVoices, recentVideos] =
      await Promise.all([
        // Recent images
        db.generatedImage.findMany({
          where: {
            userId: userId,
            failed: false,
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            prompt: true,
            provider: true,
            modelId: true,
            s3Key: true,
            createdAt: true,
          },
        }),
        // Recent audio clips (StyleTTS2 and SeedVC)
        db.generatedAudioClip.findMany({
          where: {
            userId: userId,
            failed: false,
            service: { in: ["styletts2", "seedvc"] },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            text: true,
            voice: true,
            s3Key: true,
            service: true,
            createdAt: true,
          },
        }),
        // Recent voices (Make-an-Audio / Sound Effects)
        db.generatedAudioClip.findMany({
          where: {
            userId: userId,
            failed: false,
            service: "make-an-audio",
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            text: true,
            voice: true,
            s3Key: true,
            service: true,
            createdAt: true,
          },
        }),
        // Recent videos
        db.generatedVideo.findMany({
          where: {
            userId: userId,
            failed: false,
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            prompt: true,
            provider: true,
            modelId: true,
            mode: true,
            resolution: true,
            aspectRatio: true,
            duration: true,
            imageUrl: true,
            videoUrl: true,
            createdAt: true,
          },
        }),
      ]);

    credits = userData?.credits ?? 0;
    imageCount = imageCountData;
    modelCount = voiceCountData;
    recentGenerations = {
      images: recentImages,
      audioClips: recentAudioClips.map((clip) => ({
        ...clip,
        text: clip.text ?? "",
        voice: clip.voice ?? "",
        s3Key: clip.s3Key ?? "",
      })),
      voices: recentVoices.map((voice) => ({
        ...voice,
        text: voice.text ?? "",
        voice: voice.voice ?? "",
        s3Key: voice.s3Key ?? "",
      })),
      videos: recentVideos,
    };
  }

  return (
    <PageLayout title={"Dashboard"} service={"text2image"} showSidebar={false}>
      <section className="container mx-auto flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h2>
        </div>

        <StatsCards
          imageCount={imageCount}
          voiceCount={modelCount}
          credits={credits}
        />

        <RecentGenerations
          images={recentGenerations.images}
          audioClips={recentGenerations.audioClips}
          voices={recentGenerations.voices}
          videos={recentGenerations.videos}
        />
      </section>
    </PageLayout>
  );
}
