
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().min(0),
  qty: z.number().min(0)
});

const CreateQuoteSchema = z.object({
  quote_number: z.string().min(1, "Quote number is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  organization_name: z.string().min(1, "Organization name is required"),
  contact_person: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  contact_address: z.string().optional(),
  tax_percent: z.number().min(0).max(100),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(ItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  logo_url: z.string().optional()
});

// GET /api/quotes - Get all quotes
router.get('/', async (req, res) => {
  try {
    const quotes = await db.execute(sql`
      SELECT * FROM quotes 
      ORDER BY created_at DESC
    `);

    res.json(quotes.rows);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch quotes' 
    });
  }
});

// GET /api/quotes/:id - Get specific quote
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const quotes = await db.execute(sql`
      SELECT * FROM quotes 
      WHERE id = ${id}
    `);

    if (quotes.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Quote not found' 
      });
    }

    res.json(quotes.rows[0]);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch quote' 
    });
  }
});

// POST /api/quotes - Create new quote
router.post('/', async (req, res) => {
  try {
    const parseResult = CreateQuoteSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed",
        issues: parseResult.error.issues
      });
    }

    const data = parseResult.data;

    // Check if quote number already exists
    const existingQuotes = await db.execute(sql`
      SELECT id FROM quotes 
      WHERE quote_number = ${data.quote_number}
    `);

    if (existingQuotes.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "Quote number already exists"
      });
    }

    // Insert new quote
    const newQuotes = await db.execute(sql`
      INSERT INTO quotes (
        quote_number, date, organization_name, contact_person,
        contact_email, contact_phone, contact_address, tax_percent,
        discount, notes, items, subtotal, total, logo_url
      ) VALUES (
        ${data.quote_number}, ${data.date}, ${data.organization_name}, 
        ${data.contact_person || null}, ${data.contact_email || null}, 
        ${data.contact_phone || null}, ${data.contact_address || null}, 
        ${data.tax_percent}, ${data.discount}, ${data.notes || null}, 
        ${JSON.stringify(data.items)}, ${data.subtotal}, ${data.total}, 
        ${data.logo_url || null}
      )
      RETURNING *
    `);

    res.status(201).json({
      ok: true,
      quote: newQuotes.rows[0]
    });

  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to create quote' 
    });
  }
});

// PUT /api/quotes/:id - Update quote
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = CreateQuoteSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed",
        issues: parseResult.error.issues
      });
    }

    const data = parseResult.data;

    // Check if quote exists
    const existingQuotes = await db.execute(sql`
      SELECT id FROM quotes WHERE id = ${id}
    `);

    if (existingQuotes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Quote not found"
      });
    }

    // Update quote
    const updatedQuotes = await db.execute(sql`
      UPDATE quotes SET
        quote_number = ${data.quote_number},
        date = ${data.date},
        organization_name = ${data.organization_name},
        contact_person = ${data.contact_person || null},
        contact_email = ${data.contact_email || null},
        contact_phone = ${data.contact_phone || null},
        contact_address = ${data.contact_address || null},
        tax_percent = ${data.tax_percent},
        discount = ${data.discount},
        notes = ${data.notes || null},
        items = ${JSON.stringify(data.items)},
        subtotal = ${data.subtotal},
        total = ${data.total},
        logo_url = ${data.logo_url || null}
      WHERE id = ${id}
      RETURNING *
    `);

    res.json({
      ok: true,
      quote: updatedQuotes.rows[0]
    });

  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update quote' 
    });
  }
});

// DELETE /api/quotes/:id - Delete quote
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedQuotes = await db.execute(sql`
      DELETE FROM quotes 
      WHERE id = ${id}
      RETURNING id
    `);

    if (deletedQuotes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Quote not found"
      });
    }

    res.json({
      ok: true,
      message: "Quote deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to delete quote' 
    });
  }
});

export default router;
