
import { supabaseAdmin } from '../server/lib/supabaseAdmin';
import { randomBytes } from 'crypto';

async function recreateAdminUser() {
  const email = 'samsutton@rich-habits.com';
  const password = 'Arlodog2010!';
  
  try {
    console.log('Creating admin user in Supabase Auth...');
    
    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Sam Sutton',
        role: 'admin',
        permissions: {
          // Give full admin permissions
          'organizations.create': true,
          'organizations.read': true,
          'organizations.update': true,
          'organizations.delete': true,
          'organizations.setup': true,
          'organizations.manage_sports': true,
          'organizations.manage_users': true,
          'organizations.manage_branding': true,
          'organizations.view_metrics': true,
          'users.create': true,
          'users.read': true,
          'users.update': true,
          'users.delete': true,
          'users.assign_roles': true,
          'users.reset_password': true,
          'users.manage_profile': true,
          'users.deactivate': true,
          'users.view_permissions': true,
          'users.edit_permissions': true,
          'system.manage_settings': true,
          'system.view_logs': true,
          'system.backup_data': true,
          'system.manage_integrations': true,
          'system.manage_roles': true,
        },
        page_access: {
          'page.dashboard.view': true,
          'page.dashboard.edit': true,
          'page.organizations.view': true,
          'page.organizations.edit': true,
          'page.organizations.create': true,
          'page.users.view': true,
          'page.users.edit': true,
          'page.users.create': true,
          'page.admin.view': true,
          'page.admin.settings': true,
          'page.admin.users': true,
          'page.admin.roles': true,
        }
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return;
    }

    console.log('Auth user created successfully:', authUser.user.id);

    // Create user record in users table if it exists
    const { data: tableUser, error: tableError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        full_name: 'Sam Sutton',
        role: 'admin',
        is_active: 1,
        email_verified: 1,
        permissions: {
          'organizations.create': true,
          'organizations.read': true,
          'organizations.update': true,
          'organizations.delete': true,
          'organizations.setup': true,
          'organizations.manage_sports': true,
          'organizations.manage_users': true,
          'organizations.manage_branding': true,
          'organizations.view_metrics': true,
          'users.create': true,
          'users.read': true,
          'users.update': true,
          'users.delete': true,
          'users.assign_roles': true,
          'users.reset_password': true,
          'users.manage_profile': true,
          'users.deactivate': true,
          'users.view_permissions': true,
          'users.edit_permissions': true,
          'system.manage_settings': true,
          'system.view_logs': true,
          'system.backup_data': true,
          'system.manage_integrations': true,
          'system.manage_roles': true,
        },
        page_access: {
          'page.dashboard.view': true,
          'page.dashboard.edit': true,
          'page.organizations.view': true,
          'page.organizations.edit': true,
          'page.organizations.create': true,
          'page.users.view': true,
          'page.users.edit': true,
          'page.users.create': true,
          'page.admin.view': true,
          'page.admin.settings': true,
          'page.admin.users': true,
          'page.admin.roles': true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tableError) {
      console.log('Note: Could not create user in users table (may not exist):', tableError.message);
    } else {
      console.log('User table record created successfully');
    }

    console.log('✅ Admin user recreated successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', authUser.user.id);
    
  } catch (error) {
    console.error('Error recreating admin user:', error);
  }
}

recreateAdminUser().catch(console.error);
