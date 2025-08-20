import { apiSDK } from "@/lib/api-sdk";
import { Lead, CreateLeadPayload, leadSchema } from "../types";
import { z } from "zod";

// Leads API functions (placeholder implementations)
export const leadsApi = {
  // List all leads
  async getLeads(): Promise<Lead[]> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log("🚧 getLeads API not yet implemented - returning empty array");
    return [];
  },

  // Get lead by ID
  async getLead(id: string): Promise<Lead | null> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log(`🚧 getLead(${id}) API not yet implemented - returning null`);
    return null;
  },

  // Create new lead
  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log("🚧 createLead API not yet implemented - returning mock lead");
    
    // Mock response for development
    const mockLead: Lead = {
      id: `lead_${Date.now()}`,
      orgId: payload.orgId,
      contact: payload.contact,
      stage: payload.stage,
      value: payload.value,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return mockLead;
  },

  // Update lead
  async updateLead(id: string, payload: Partial<CreateLeadPayload>): Promise<Lead> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log(`🚧 updateLead(${id}) API not yet implemented`);
    throw new Error("updateLead API not implemented");
  },

  // Delete lead
  async deleteLead(id: string): Promise<void> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log(`🚧 deleteLead(${id}) API not yet implemented`);
    throw new Error("deleteLead API not implemented");
  },
};

// React Query hooks for leads (when implemented)
export const useLeads = () => {
  // TODO: Implement with @tanstack/react-query when API routes are ready
  return { data: [], isLoading: false, error: null };
};

export const useLead = (id: string) => {
  // TODO: Implement with @tanstack/react-query when API routes are ready
  return { data: null, isLoading: false, error: null };
};