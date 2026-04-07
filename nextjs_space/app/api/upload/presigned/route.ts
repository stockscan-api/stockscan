import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, contentType, isPublic } = body;

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic ?? false
    );

    // For public files, also return the public URL they'll be accessible at after upload
    let publicUrl: string | undefined;
    if (isPublic) {
      publicUrl = await getFileUrl(cloud_storage_path, true);
    }

    return NextResponse.json({ uploadUrl, cloud_storage_path, publicUrl });
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
