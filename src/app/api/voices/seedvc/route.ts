import { NextResponse } from 'next/server';
import { env } from '~/env.js';

export async function GET() {
  try {
    const response = await fetch(`${env.SEED_VC_API_ROUTE}/voices`, {
      method: 'GET',
      headers: {
        'Authorization': env.BACKEND_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch SeedVC voices from external API:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch SeedVC voices: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in SeedVC voices API route:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching SeedVC voices' },
      { status: 500 }
    );
  }
}