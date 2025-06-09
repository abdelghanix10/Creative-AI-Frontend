import { NextResponse } from 'next/server';
import { inngest } from '~/inngest/client'; 
import { auth } from '~/server/auth';

// Helper to convert ReadableStream to Buffer, then to Base64
async function streamToBuffer(readableStream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const voiceName = formData.get('voice_name') as string | null; // Optional

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileBuffer = await streamToBuffer(file.stream());
    const fileBufferB64 = fileBuffer.toString('base64');

    // Send an event to Inngest to handle the actual upload to SeedVC API
    await inngest.send({
      name: 'seedvc.voice.upload.request', // Matches the event in your Inngest function
      data: {
        fileBufferB64,
        fileName: file.name,
        contentType: file.type,
        voiceName: voiceName ?? undefined, // Pass if provided
        userId: userId, 
      },
    });

    return NextResponse.json({ message: 'SeedVC voice upload initiated successfully', voice_key: voiceName ?? file.name }, { status: 202 }); // 202 Accepted

  } catch (error) {
    console.error('Error in seedvc-upload-voice API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Internal server error during SeedVC voice upload initiation.', detail: errorMessage },
      { status: 500 }
    );
  }
}