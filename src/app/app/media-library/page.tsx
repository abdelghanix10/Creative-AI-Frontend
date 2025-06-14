import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { PageLayout } from "~/components/client/page-layout";
import MediaLibrary from "~/components/client/media-library/MediaLibrary";

export default async function MediaLibraryPage() {
  const session = await auth();
  const userId = session?.user.id;
  type MediaLibraryData = {
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
      text: string | null;
      voice: string | null;
      s3Key: string | null;
      service: string;
      createdAt: Date;
    }[];
    voices: {
      id: string;
      text: string | null;
      voice: string | null;
      s3Key: string | null;
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
    totalItems: number;
  };

  let mediaData: MediaLibraryData = {
    images: [],
    audioClips: [],
    voices: [],
    videos: [],
    totalItems: 0,
  };

  if (userId) {
    // Get all generations for this user (without limit for full media library)
    const [allImages, allAudioClips, allVoices, allVideos] = await Promise.all([
      // All images
      db.generatedImage.findMany({
        where: {
          userId: userId,
          failed: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          provider: true,
          modelId: true,
          s3Key: true,
          createdAt: true,
        },
      }),
      // All audio clips (speech synthesis: styletts2 & seedvc only)
      db.generatedAudioClip.findMany({
        where: {
          userId: userId,
          failed: false,
          service: { in: ["styletts2", "seedvc"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          text: true,
          voice: true,
          s3Key: true,
          service: true,
          createdAt: true,
        },
      }),
      // All voices (sound effects: make-an-audio only)
      db.generatedAudioClip.findMany({
        where: {
          userId: userId,
          failed: false,
          service: "make-an-audio",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          text: true,
          voice: true,
          s3Key: true,
          service: true,
          createdAt: true,
        },
      }),
      // All videos
      db.generatedVideo.findMany({
        where: {
          userId: userId,
          failed: false,
        },
        orderBy: { createdAt: "desc" },
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
    mediaData = {
      images: allImages,
      audioClips: allAudioClips,
      voices: allVoices,
      videos: allVideos,
      totalItems:
        allImages.length +
        allAudioClips.length +
        allVoices.length +
        allVideos.length,
    };
  }

  return (
    <PageLayout
      title="Media Library"
      service="media-library"
      showSidebar={false}
    >
      <section className="container mx-auto flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Media Library</h2>
            <p className="text-muted-foreground">
              Browse and manage all your generated content (
              {mediaData.totalItems} items)
            </p>
          </div>
        </div>
        <MediaLibrary
          images={mediaData.images}
          audioClips={mediaData.audioClips}
          voices={mediaData.voices}
          videos={mediaData.videos}
        />
      </section>
    </PageLayout>
  );
}
