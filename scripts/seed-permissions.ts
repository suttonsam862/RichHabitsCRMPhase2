// Seed script for permissions and roles
// This script populates the database with default permissions and roles

import { supabaseAdmin } from '../server/lib/supabaseAdmin';
import { ROLE_DEFAULTS, ACTION_PERMISSIONS, PAGE_ACCESS } from '../server/lib/permissions';

async function seedPermissionsAndRoles() {
  console.log('🌱 Seeding permissions and roles...');
  
  try {
    // 1. Seed all permissions
    console.log('📝 Creating permissions...');
    
    const permissions: Array<{
      category: string;
      action: string;
      resource: string | null;
      description: string;
    }> = [];
    
    // Add action permissions
    for (const [category, actions] of Object.entries(ACTION_PERMISSIONS)) {
      for (const [action, permission] of Object.entries(actions)) {
        permissions.push({
          category: category.toLowerCase(),
          action: action.toLowerCase(),
          resource: null,
          description: `${action} access for ${category}`,
        });
      }
    }
    
    // Add page permissions
    for (const [page, access] of Object.entries(PAGE_ACCESS)) {
      for (const [accessType, permission] of Object.entries(access)) {
        permissions.push({
          category: 'page',
          action: accessType.toLowerCase(),
          resource: page.toLowerCase(),
          description: `${accessType} access to ${page} page`,
        });
      }
    }

    const { data: permissionData, error: permissionError } = await supabaseAdmin
      .from('permissions')
      .upsert(permissions, { 
        onConflict: 'category,action,resource',
        ignoreDuplicates: true 
      })
      .select();

    if (permissionError) {
      console.error('❌ Error creating permissions:', permissionError);
      return;
    }

    console.log(`✅ Created ${permissions.length} permissions`);

    // 2. Seed roles with default permissions
    console.log('👥 Creating roles...');
    
    const roles = [
      {
        name: 'Administrator',
        slug: 'admin',
        description: ROLE_DEFAULTS.ADMIN.description,
        is_staff: ROLE_DEFAULTS.ADMIN.is_staff ? 1 : 0,
        default_permissions: ROLE_DEFAULTS.ADMIN.permissions,
      },
      {
        name: 'Sales Team',
        slug: 'sales', 
        description: ROLE_DEFAULTS.SALES.description,
        is_staff: ROLE_DEFAULTS.SALES.is_staff ? 1 : 0,
        default_permissions: ROLE_DEFAULTS.SALES.permissions,
      },
      {
        name: 'Designer',
        slug: 'designer',
        description: ROLE_DEFAULTS.DESIGNER.description, 
        is_staff: ROLE_DEFAULTS.DESIGNER.is_staff ? 1 : 0,
        default_permissions: ROLE_DEFAULTS.DESIGNER.permissions,
      },
      {
        name: 'Manufacturing',
        slug: 'manufacturing',
        description: ROLE_DEFAULTS.MANUFACTURING.description,
        is_staff: ROLE_DEFAULTS.MANUFACTURING.is_staff ? 1 : 0,
        default_permissions: ROLE_DEFAULTS.MANUFACTURING.permissions,
      },
      {
        name: 'Customer',
        slug: 'customer',
        description: ROLE_DEFAULTS.CUSTOMER.description,
        is_staff: ROLE_DEFAULTS.CUSTOMER.is_staff ? 1 : 0,
        default_permissions: ROLE_DEFAULTS.CUSTOMER.permissions,
      }
    ];

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .upsert(roles, { 
        onConflict: 'slug',
        ignoreDuplicates: false 
      })
      .select();

    if (roleError) {
      console.error('❌ Error creating roles:', roleError);
      return;
    }

    console.log(`✅ Created ${roles.length} roles`);

    console.log('🎉 Permissions and roles seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${permissions.length} permissions created`);
    console.log(`- ${roles.length} roles created`);
    console.log('\n🔐 Default role permissions:');
    
    for (const role of roles) {
      const permCount = Object.values(role.default_permissions).filter(Boolean).length;
      console.log(`- ${role.name}: ${permCount} permissions`);
    }

  } catch (error) {
    console.error('❌ Error seeding permissions and roles:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedPermissionsAndRoles()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedPermissionsAndRoles };