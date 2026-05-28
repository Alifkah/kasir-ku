import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, businessName, phone } = body;

    if (!name || !email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Nama, email, password, dan nama bisnis wajib diisi' },
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
      console.warn('API Route /api/register called in Local Fallback mode.');
      return NextResponse.json({
        success: true,
        message: 'Registrasi berhasil (Local Fallback Mode)',
        user: {
          id: `mock-user-${Date.now()}`,
          email: email.toLowerCase(),
          name,
          role: 'Owner',
        },
      });
    }

    // Initialize Supabase admin client with service_role key to bypass email confirmation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const normalizedEmail = email.toLowerCase();

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: { name },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Gagal mendapatkan ID user baru' }, { status: 500 });
    }

    // All permissions key list for Owner
    const allPermissions = [
      'view_reports',
      'manage_inventory',
      'process_refunds',
      'manage_promos',
      'manage_expenses',
      'manage_suppliers_po',
      'manage_settings',
      'manage_staff',
    ];

    // 2. Upsert the owner profile in the profiles table (handles auto-trigger creations gracefully)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert([
        {
          id: userId,
          name,
          email: normalizedEmail,
          role: 'Owner',
          outlet_id: null, // Owners can access all outlets
          permissions: allPermissions,
          phone: phone || null,
          is_active: true,
        },
      ]);

    if (profileError) {
      // Cleanup auth entry
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Gagal membuat profil: ${profileError.message}` }, { status: 400 });
    }

    // 3. Create default primary outlet for this owner
    const newOutletId = `outlet-${Date.now()}`;
    const { error: outletError } = await supabaseAdmin
      .from('outlets')
      .insert([
        {
          id: newOutletId,
          name: businessName,
          address: '',
          staff_count: 0,
          is_active: true,
          phone: phone || '',
          manager: name,
        },
      ]);

    if (outletError) {
      // Cleanup profile and auth entries
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Gagal membuat outlet default: ${outletError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Owner dan outlet default berhasil terdaftar.',
      user: {
        id: userId,
        email: normalizedEmail,
        name,
        role: 'Owner',
        outletId: newOutletId,
      },
    });
  } catch (error: any) {
    console.error('Error in owner register API:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
