import { ImagePlayground } from "~/components/client/image/ImagePlayground";
import { PageLayout } from "~/components/client/page-layout";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getRandomSuggestions } from "~/lib/suggestions";
import "~/styles/globals.css";
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  const userId = session?.user.id;

  let credits = 0;

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
      },
    });
    credits = user?.credits ?? 0;
  }


  return (
    <PageLayout
      title={"Text to Image"}
      service={"text2image"}
      showSidebar={false}
    >
      <ImagePlayground suggestions={getRandomSuggestions()} />
    </PageLayout>
  );
}
