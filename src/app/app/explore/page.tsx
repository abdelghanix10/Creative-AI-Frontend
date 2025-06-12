import { PageLayout } from "~/components/client/page-layout";
import ExploreGallery from "~/components/client/explore/ExploreGallery";

export default async function ExplorePage() {
  // Fetch all public media content
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/explore`,
    {
      cache: "no-store", // Always get fresh data
    },
  );
  let exploreData: {
    images: [];
    soundEffects: [];
    videos: [];
    totalItems: number;
  } = {
    images: [],
    soundEffects: [],
    videos: [],
    totalItems: 0,
  };

  if (response.ok) {
    exploreData = (await response.json()) as typeof exploreData;
  }

  return (
    <PageLayout title="Explore" service="explore" showSidebar={false}>
      <section className="container mx-auto flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Explore Gallery
            </h1>
            <p className="text-muted-foreground">
              Discover amazing content created by our community (
              {exploreData.totalItems} public items)
            </p>
          </div>
        </div>{" "}
        <ExploreGallery
          images={exploreData.images}
          soundEffects={exploreData.soundEffects}
          videos={exploreData.videos}
        />
      </section>
    </PageLayout>
  );
}
