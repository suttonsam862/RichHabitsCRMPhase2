import { Router } from 'express';
import { sendSuccess } from '../lib/http';

const router = Router();

// Available system roles
const availableRoles = [
  {
    id: 'admin',
    name: 'Administrator', 
    slug: 'admin',
    description: 'Full system access and user management'
  },
  {
    id: 'staff',
    name: 'Staff',
    slug: 'staff', 
    description: 'General staff access to most features'
  },
  {
    id: 'sales',
    name: 'Sales Representative',
    slug: 'sales',
    description: 'Access to sales management and customer data'
  },
  {
    id: 'designer',
    name: 'Designer',
    slug: 'designer',
    description: 'Access to design tools and catalog management'
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    slug: 'manufacturing', 
    description: 'Access to manufacturing and production features'
  },
  {
    id: 'customer',
    name: 'Customer',
    slug: 'customer',
    description: 'Basic customer access to quotes and orders'
  }
];

// GET /api/roles - List available roles
router.get('/', (req, res) => {
  return sendSuccess(res, availableRoles);
});

export { router as rolesRouter };