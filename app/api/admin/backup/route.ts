import { NextRequest, NextResponse } from 'next/server'
import { userSession } from '@/services/users';
import { backup } from '@/services/admin';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  console.log('>> app.api.admin.backup.POST', {});

  const { user } = await userSession(request);

  if (!user.isAdmin) {
    return NextResponse.json(
      { success: false, message: 'authorization failed' },
      { status: 403 }
    );
  }

  const limerickIds = request.nextUrl.searchParams.get("limerick");
  const entities = request.nextUrl.searchParams.get("entity");
  console.log('>> app.api.admin.backup.POST', { limerickIds, entities });
  const ret = await backup(user, (entities ?? "").split(",").filter(Boolean), (limerickIds ?? "").split(",").filter(Boolean));
  console.log('>> app.api.admin.backup.POST', { ret });

  return NextResponse.json(ret);
}
