import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

const duplicateResumeInputSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  targetJobTitle: z.string().trim().min(1).max(120).nullable().optional(),
  targetCompany: z.string().trim().min(1).max(120).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.targetCompany && !value.targetJobTitle) {
    ctx.addIssue({
      code: 'custom',
      path: ['targetJobTitle'],
      message: 'targetJobTitle is required when targetCompany is provided',
    });
  }
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await request.text();
    let body: unknown = {};

    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
    }

    const parsed = duplicateResumeInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const duplicated = await resumeRepository.duplicate(id, user.id, parsed.data);
    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error('POST /api/resume/[id]/duplicate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
