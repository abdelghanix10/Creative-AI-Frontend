import { NextRequest, NextResponse } from "next/server";
import { ImageModel, experimental_generateImage as generateImage } from "ai";
import { fireworks } from "@ai-sdk/fireworks";
import { ProviderKey } from "~/lib/provider-config";
import { GenerateImageRequest } from "~/lib/api-types";
import { uploadImageToS3 } from "~/lib/s3";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { inngest } from "~/inngest/client";

/**
 * Intended to be slightly less than the maximum execution time allowed by the
 * runtime so that we can gracefully terminate our request.
 */
const TIMEOUT_MILLIS = 120 * 1000; // 2 minutes

const DEFAULT_IMAGE_SIZE = "1024x1024";
const DEFAULT_ASPECT_RATIO = "1:1";

interface ProviderConfig {
  createImageModel: (modelId: string) => ImageModel;
  dimensionFormat: "size" | "aspectRatio";
  supportsCustomAspectRatio?: boolean; // Add flag for custom aspect ratio support
}

const providerConfig: Record<ProviderKey, ProviderConfig> = {
  fireworks1: {
    createImageModel: fireworks.image,
    dimensionFormat: "aspectRatio",
  },
  fireworks2: {
    createImageModel: fireworks.image,
    dimensionFormat: "aspectRatio",
    supportsCustomAspectRatio: true, // Enable custom aspect ratio for fireworks2
  },
  fireworks3: {
    createImageModel: fireworks.image,
    dimensionFormat: "aspectRatio",
  },
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMillis: number,
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMillis),
    ),
  ]);
};

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const { prompt, provider, modelId, aspectRatio } =
    (await req.json()) as GenerateImageRequest;

  // Get the authenticated user
  const session = await auth();
  const userId = session?.user?.id;

  try {
    if (!prompt || !provider || !modelId || !providerConfig[provider]) {
      const error = "Invalid request parameters";
      console.error(`${error} [requestId=${requestId}]`);
      return NextResponse.json({ error }, { status: 400 });
    }

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with credits from database
    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!dbUser || dbUser.credits < 45) {
      return NextResponse.json(
        {
          error: "Insufficient credits. Image generation requires 45 credits.",
        },
        { status: 402 },
      );
    }

    const config = providerConfig[provider];
    const startstamp = performance.now();
    const generatePromise = generateImage({
      model: config.createImageModel(modelId),
      prompt,
      ...(config.dimensionFormat === "size"
        ? { size: DEFAULT_IMAGE_SIZE }
        : {
            aspectRatio:
              config.supportsCustomAspectRatio && aspectRatio
                ? aspectRatio
                : DEFAULT_ASPECT_RATIO,
          }),
    }).then(async ({ image, warnings }) => {
      if (warnings?.length > 0) {
        console.warn(
          `Warnings [requestId=${requestId}, provider=${provider}, model=${modelId}]: `,
          warnings,
        );
      }
      console.log(
        `Completed image request [requestId=${requestId}, provider=${provider}, model=${modelId}, elapsed=${(
          (performance.now() - startstamp) /
          1000
        ).toFixed(1)}s].`,
      );

      // Upload the image to S3
      const s3Key = await uploadImageToS3(image.base64, provider);

      // Save the image record to the database
      const imageRecord = await db.generatedImage.create({
        data: {
          userId,
          prompt,
          provider,
          modelId,
          s3Key,
        },
      });

      // Trigger the Inngest function
      await inngest.send({
        name: "image.generate.request",
        data: {
          imageId: imageRecord.id,
          userId: imageRecord.userId,
        },
      });

      // Deduct credits for the successful generation
      await db.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: 15,
          },
        },
      });

      return {
        provider,
        image: image.base64,
        s3Key,
      };
    });

    const result = await withTimeout(generatePromise, TIMEOUT_MILLIS);
    return NextResponse.json(result, {
      status: "image" in result ? 200 : 500,
    });
  } catch (error) {
    // Log full error detail on the server, but return a generic error message
    // to avoid leaking any sensitive information to the client.
    console.error(
      `Error generating image [requestId=${requestId}, provider=${provider}, model=${modelId}]: `,
      error,
    );

    // If user is authenticated, record the failed generation
    if (userId) {
      try {
        await db.generatedImage.create({
          data: {
            userId,
            prompt,
            provider,
            modelId,
            failed: true,
            s3Key: "", // Empty since generation failed
          },
        });
      } catch (dbError) {
        console.error("Failed to record failed generation:", dbError);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate image. Please try again later.",
      },
      { status: 500 },
    );
  }
}
