import {
  LeadModel,
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadFilters,
  PaginationOptions,
  PaginatedLeads,
} from '../models/lead.model';
import { AppError } from '../middleware/error.middleware';

export class LeadService {
  async createLead(leadData: LeadCreate): Promise<Lead> {
    // Validate required fields
    if (!leadData.firstName || leadData.firstName.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'First name is required');
    }

    if (!leadData.lastName || leadData.lastName.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Last name is required');
    }

    // Validate email format if provided
    if (leadData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leadData.email)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid email format');
      }
    }

    // Validate phone format if provided
    if (leadData.phoneNumber) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(leadData.phoneNumber)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid phone format');
      }
    }

    // Validate budgets if provided
    if (leadData.budgetMin !== undefined && leadData.budgetMin < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Budget min cannot be negative');
    }

    if (leadData.budgetMax !== undefined && leadData.budgetMax < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Budget max cannot be negative');
    }

    if (leadData.budgetMin && leadData.budgetMax && leadData.budgetMin > leadData.budgetMax) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Budget min cannot be greater than budget max');
    }

    return LeadModel.create(leadData);
  }

  async getLead(leadId: number, userId: number): Promise<Lead> {
    const lead = await LeadModel.findById(leadId, userId);

    if (!lead) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found');
    }

    return lead;
  }

  async getLeads(
    userId: number,
    filters: LeadFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedLeads> {
    // Validate pagination
    if (pagination.page < 1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Page must be greater than 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 100');
    }

    return LeadModel.findAll(userId, filters, pagination);
  }

  async updateLead(leadId: number, userId: number, updateData: LeadUpdate): Promise<Lead> {
    // Validate email format if provided
    if (updateData.email !== undefined && updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid email format');
      }
    }

    // Validate phone format if provided
    if (updateData.phoneNumber !== undefined && updateData.phoneNumber) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(updateData.phoneNumber)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid phone format');
      }
    }

    // Validate budgets if provided
    if (updateData.budgetMin !== undefined && updateData.budgetMin < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Budget min cannot be negative');
    }

    if (updateData.budgetMax !== undefined && updateData.budgetMax < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Budget max cannot be negative');
    }

    const lead = await LeadModel.update(leadId, userId, updateData);

    if (!lead) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found');
    }

    return lead;
  }

  async deleteLead(leadId: number, userId: number): Promise<void> {
    const deleted = await LeadModel.delete(leadId, userId);

    if (!deleted) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found');
    }
  }

  async getLeadStats(userId: number): Promise<Record<string, number>> {
    return LeadModel.countByStatus(userId);
  }
}
