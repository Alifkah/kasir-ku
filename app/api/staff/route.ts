import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, outletId, permissions, phone, isActive } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Check if Supabase server-side is configured
    const isConfigured =
      supabaseUrl !== '' &&
      serviceRoleKey !== '' &&
      !supabaseUrl.includes('your-project-id') &&
      !serviceRoleKey.includes('your-supabase-service-role-key');

    if (!isConfigured) {
      console.warn('API Route /api/staff called in Local Fallback mode.');
      return NextResponse.json({
        success: true,
        message: 'Mock signup successful (Local Fallback Mode)',
        user: {
          id: `mock-user-${Date.now()}`,
          email,
          name,
          role,
        },
      });
    }

    // Initialize Supabase admin client with service_role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email to avoid verification delays
      user_metadata: { name },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Failed to retrieve created user ID' }, { status: 500 });
    }

    // 2. Create/update the corresponding profile in the profiles table (handles auto-trigger creations gracefully)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert([
        {
          id: userId,
          name,
          email,
          role,
          outlet_id: role === 'Owner' ? null : outletId || null,
          permissions: permissions || [],
          phone: phone || null,
          is_active: isActive !== false,
        },
      ]);

    if (profileError) {
      // Cleanup: Delete the auth user if profile creation fails to prevent orphan auth entries
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member registered successfully.',
      user: {
        id: userId,
        email,
        name,
        role,
      },
    });
  } catch (error: any) {
    console.error('Error in staff signup API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
