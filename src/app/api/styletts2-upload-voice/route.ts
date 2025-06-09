import { NextResponse } from 'next/server';
import { inngest } from '~/inngest/client'; 
import { auth } from '~/server/auth'; // Corrected import

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
    const session = await auth(); // Corrected usage
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

    // Validate file type and size if necessary (can also be done in Inngest)
    // For example, check file.type and file.size

    const fileBuffer = await streamToBuffer(file.stream());
    const fileBufferB64 = fileBuffer.toString('base64');

    // Send an event to Inngest to handle the actual upload to StyleTTS2 API
    await inngest.send({
      name: 'styletts2.voice.upload.request', // Matches the event in your Inngest function
      data: {
        fileBufferB64,
        fileName: file.name,
        contentType: file.type,
        voiceName: voiceName ?? undefined, // Pass if provided
        userId: userId, 
      },
    });

    // Respond to the client immediately
    // The actual upload status can be polled or updated via websockets if needed
    return NextResponse.json({ message: 'Voice upload initiated successfully', voice_key: voiceName ?? file.name }, { status: 202 }); // 202 Accepted

  } catch (error) {
    console.error('Error in styletts2-upload-voice API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Internal server error during voice upload initiation.', detail: errorMessage },
      { status: 500 }
    );
  }
}