import {
  InteractionModel,
  Interaction,
  InteractionCreate,
  InteractionFilters,
  PaginationOptions,
  PaginatedInteractions,
} from '../models/interaction.model';
import { LeadModel } from '../models/lead.model';
import { AppError } from '../middleware/error.middleware';

export class InteractionService {
  async createInteraction(interactionData: InteractionCreate): Promise<Interaction> {
    // Validate required fields
    if (!interactionData.type || interactionData.type.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Interaction type is required');
    }

    // Verify lead exists and belongs to user
    const lead = await LeadModel.findById(interactionData.leadId, interactionData.userId);
    if (!lead) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found or does not belong to you');
    }

    // Validate interaction date if provided
    if (interactionData.interactionDate) {
      const date = new Date(interactionData.interactionDate);
      if (isNaN(date.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid interaction date format');
      }
    }

    return InteractionModel.create(interactionData);
  }

  async getInteraction(interactionId: number, userId: number): Promise<Interaction> {
    const interaction = await InteractionModel.findById(interactionId, userId);

    if (!interaction) {
      throw new AppError(404, 'INTERACTION_NOT_FOUND', 'Interaction not found');
    }

    return interaction;
  }

  async getInteractions(
    userId: number,
    filters: InteractionFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedInteractions> {
    // Validate pagination
    if (pagination.page < 1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Page must be greater than 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 100');
    }

    return InteractionModel.findAll(userId, filters, pagination);
  }

  async getLeadTimeline(
    leadId: number,
    userId: number,
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedInteractions> {
    // Verify lead exists and belongs to user
    const lead = await LeadModel.findById(leadId, userId);
    if (!lead) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found or does not belong to you');
    }

    return InteractionModel.findByLeadId(leadId, userId, pagination);
  }

  async deleteInteraction(interactionId: number, userId: number): Promise<void> {
    const deleted = await InteractionModel.delete(interactionId, userId);

    if (!deleted) {
      throw new AppError(404, 'INTERACTION_NOT_FOUND', 'Interaction not found');
    }
  }

  async getInteractionStats(userId: number): Promise<Record<string, number>> {
    return InteractionModel.countByType(userId);
  }
}
