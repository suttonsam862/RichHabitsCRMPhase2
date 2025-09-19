-- Migration: Critical Security Fix for ORD-5
-- Date: 2025-09-19
-- Purpose: Fix RLS bypass in atomic_update_design_job_status RPC function
--          Add strict organization membership validation using auth.uid()

BEGIN;

-- Drop and recreate the function with proper security checks
DROP FUNCTION IF EXISTS atomic_update_design_job_status(UUID, TEXT, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION atomic_update_design_job_status(
    p_design_job_id UUID,
    p_new_status TEXT,
    p_actor_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_org_id UUID DEFAULT NULL -- Make this required by validation below
) 
RETURNS TABLE (
    id UUID,
    org_id UUID,
    order_item_id UUID,
    title TEXT,
    brief TEXT,
    priority INTEGER,
    status_code TEXT,
    assignee_designer_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Keep SECURITY DEFINER for atomicity but add strict security checks
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_job RECORD;
    v_valid_transition BOOLEAN;
    v_order_item_sync_status TEXT;
    v_updated_job RECORD;
    v_error_msg TEXT;
    v_user_org_access BOOLEAN := FALSE;
BEGIN
    -- CRITICAL SECURITY CHECK: Get authenticated user ID
    v_current_user_id := auth.uid();
    
    -- SECURITY VALIDATION: Require authenticated user
    IF v_current_user_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Authentication required - no valid user session'::TEXT;
        RETURN;
    END IF;
    
    -- SECURITY VALIDATION: Require org_id parameter (prevent bypassing org checks)
    IF p_org_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Organization ID is required for security validation'::TEXT;
        RETURN;
    END IF;

    -- Step 1: Fetch current design job with org validation
    SELECT dj.*, oi.org_id as order_item_org_id
    INTO v_current_job
    FROM design_jobs dj
    INNER JOIN order_items oi ON dj.order_item_id = oi.id
    WHERE dj.id = p_design_job_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Design job not found or access denied'::TEXT;
        RETURN;
    END IF;
    
    -- CRITICAL SECURITY CHECK: Validate org_id matches design job's organization
    IF v_current_job.org_id != p_org_id THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Organization mismatch - access denied'::TEXT;
        RETURN;
    END IF;
    
    -- CRITICAL SECURITY CHECK: Validate user is a member of the organization
    -- This prevents cross-organization access even with SECURITY DEFINER
    SELECT EXISTS(
        SELECT 1 FROM organization_members 
        WHERE org_id = v_current_job.org_id 
        AND user_id = v_current_user_id
        AND status = 'active'
    ) INTO v_user_org_access;
    
    IF NOT v_user_org_access THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Access denied - user is not a member of this organization'::TEXT;
        RETURN;
    END IF;
    
    -- Step 3: Validate design job org matches order item org (consistency check)
    IF v_current_job.org_id != v_current_job.order_item_org_id THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Data integrity error - org mismatch between design job and order item'::TEXT;
        RETURN;
    END IF;
    
    -- Step 4: Validate status transition (basic transitions - can be enhanced)
    SELECT CASE 
        WHEN v_current_job.status_code = 'queued' AND p_new_status IN ('assigned', 'canceled') THEN TRUE
        WHEN v_current_job.status_code = 'assigned' AND p_new_status IN ('drafting', 'queued', 'canceled') THEN TRUE  
        WHEN v_current_job.status_code = 'drafting' AND p_new_status IN ('review', 'assigned', 'canceled') THEN TRUE
        WHEN v_current_job.status_code = 'review' AND p_new_status IN ('approved', 'rejected', 'drafting') THEN TRUE
        WHEN v_current_job.status_code = 'rejected' AND p_new_status IN ('drafting', 'canceled') THEN TRUE
        WHEN v_current_job.status_code = p_new_status THEN TRUE -- Allow same status (idempotent)
        ELSE FALSE
    END INTO v_valid_transition;
    
    IF NOT v_valid_transition THEN
        v_error_msg := 'Invalid status transition from ''' || v_current_job.status_code || ''' to ''' || p_new_status || '''';
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, v_error_msg;
        RETURN;
    END IF;
    
    -- Step 5: Validate new status exists in status_design_jobs
    IF NOT EXISTS (SELECT 1 FROM status_design_jobs WHERE code = p_new_status) THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, ('Invalid design job status code: ' || p_new_status)::TEXT;
        RETURN;
    END IF;
    
    -- Step 6: Update design job status atomically with additional security check
    UPDATE design_jobs 
    SET 
        status_code = p_new_status,
        updated_at = NOW()
    WHERE id = p_design_job_id
      AND org_id = v_current_job.org_id -- Additional security check
    RETURNING * INTO v_updated_job;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, 'Failed to update design job - concurrent modification or access denied'::TEXT;
        RETURN;
    END IF;
    
    -- Step 7: Create design job event atomically
    INSERT INTO design_job_events (
        design_job_id,
        event_code,
        actor_user_id,
        payload,
        occurred_at
    ) VALUES (
        p_design_job_id,
        'STATUS_CHANGED',
        COALESCE(p_actor_user_id, v_current_user_id), -- Use authenticated user if no actor specified
        jsonb_build_object(
            'from_status', v_current_job.status_code,
            'to_status', p_new_status,
            'notes', p_notes,
            'atomic_operation', true,
            'authenticated_user_id', v_current_user_id
        ),
        NOW()
    );
    
    -- Step 8: Determine order item status synchronization
    SELECT CASE 
        WHEN p_new_status = 'approved' THEN 'approved'
        WHEN p_new_status = 'rejected' THEN 'design' -- Return to design for rework
        WHEN p_new_status = 'canceled' THEN 'pending' -- Return to pending status
        ELSE NULL -- No sync needed for other statuses
    END INTO v_order_item_sync_status;
    
    -- Step 9: Sync order item status if needed
    IF v_order_item_sync_status IS NOT NULL THEN
        -- Validate the target order item status exists
        IF EXISTS (SELECT 1 FROM status_order_items WHERE code = v_order_item_sync_status) THEN
            UPDATE order_items 
            SET 
                status_code = v_order_item_sync_status,
                updated_at = NOW()
            WHERE id = v_current_job.order_item_id
              AND org_id = v_current_job.org_id; -- Security check
              
            -- Create order item event for audit trail
            INSERT INTO order_events (
                order_id,
                event_code,
                actor_user_id,
                payload,
                occurred_at
            )
            SELECT 
                oi.order_id,
                'ORDER_ITEM_STATUS_SYNCED',
                COALESCE(p_actor_user_id, v_current_user_id),
                jsonb_build_object(
                    'order_item_id', v_current_job.order_item_id,
                    'new_status', v_order_item_sync_status,
                    'triggered_by_design_job', p_design_job_id,
                    'design_job_status', p_new_status,
                    'authenticated_user_id', v_current_user_id
                ),
                NOW()
            FROM order_items oi
            WHERE oi.id = v_current_job.order_item_id;
        END IF;
    END IF;
    
    -- Step 10: Return success with updated design job data
    RETURN QUERY SELECT 
        v_updated_job.id,
        v_updated_job.org_id,
        v_updated_job.order_item_id,
        v_updated_job.title,
        v_updated_job.brief,
        v_updated_job.priority,
        v_updated_job.status_code,
        v_updated_job.assignee_designer_id,
        v_updated_job.created_at,
        v_updated_job.updated_at,
        TRUE, -- success
        NULL::TEXT; -- no error
        
EXCEPTION 
    WHEN OTHERS THEN
        -- Handle any unexpected errors
        v_error_msg := 'Unexpected error: ' || SQLERRM;
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
            NULL::INTEGER, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            FALSE, v_error_msg;
        RETURN;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION atomic_update_design_job_status TO authenticated;

-- Update comment for documentation
COMMENT ON FUNCTION atomic_update_design_job_status IS 
'SECURITY HARDENED: Atomically updates design job status with strict organization membership validation. Uses auth.uid() to prevent cross-organization access even with SECURITY DEFINER. All operations happen in single transaction with comprehensive security checks.';

COMMIT;