import { useState, useEffect, useCallback } from 'react';
import {
  CommunicationTemplate,
  TemplateVariant,
  TemplateAnalytics,
  ABTestResult,
  TemplateLibrary,
  TemplateSearchFilters,
  TemplatePreview,
  TemplateValidationResult
} from '../types/communication';
import { communicationApiService } from '../services/communicationApiService';
import { templateService } from '../services/templateService';

export interface UseCommunicationTemplatesReturn {
  // State
  templates: CommunicationTemplate[];
  currentTemplate: CommunicationTemplate | null;
  templateVariants: TemplateVariant[];
  templateAnalytics: TemplateAnalytics | null;
  abTestResults: ABTestResult[];
  templateLibrary: TemplateLibrary | null;
  preview: TemplatePreview | null;
  validation: TemplateValidationResult | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isRendering: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchTemplates: (filters?: TemplateSearchFilters) => Promise<void>;
  fetchTemplate: (id: number) => Promise<void>;
  createTemplate: (template: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CommunicationTemplate | null>;
  updateTemplate: (id: number, updates: Partial<CommunicationTemplate>) => Promise<CommunicationTemplate | null>;
  deleteTemplate: (id: number) => Promise<boolean>;
  fetchTemplateVariants: (templateId: number) => Promise<void>;
  fetchTemplateAnalytics: (templateId: number) => Promise<void>;
  fetchABTestResults: (templateId: number) => Promise<void>;
  fetchTemplateLibrary: (filters?: TemplateSearchFilters) => Promise<void>;
  renderTemplate: (templateId: number, context: any) => Promise<void>;
  generatePreview: (template: CommunicationTemplate, sampleData?: any) => void;
  validateTemplate: (template: CommunicationTemplate) => void;
  clearError: () => void;
}

export const useCommunicationTemplates = (): UseCommunicationTemplatesReturn => {
  // State
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<CommunicationTemplate | null>(null);
  const [templateVariants, setTemplateVariants] = useState<TemplateVariant[]>([]);
  const [templateAnalytics, setTemplateAnalytics] = useState<TemplateAnalytics | null>(null);
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
  const [templateLibrary, setTemplateLibrary] = useState<TemplateLibrary | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Helper function to handle API responses
  const handleApiResponse = useCallback(<T,>(
    response: { success: boolean; data?: T; error?: string },
    onSuccess?: (data: T) => void,
    errorMessage?: string
  ) => {
    if (response.success && response.data) {
      onSuccess?.(response.data);
      setError(null);
    } else {
      setError(response.error || errorMessage || 'An error occurred');
    }
  }, []);

  // Actions
  const fetchTemplates = useCallback(async (filters?: TemplateSearchFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await communicationApiService.getTemplates(filters);
      handleApiResponse(
        response,
        (data) => setTemplates(data.data || []),
        'Failed to fetch templates'
      );
    } catch (err) {
      setError('Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const fetchTemplate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await communicationApiService.getTemplate(id);
      handleApiResponse(
        response,
        (data) => setCurrentTemplate(data),
        'Failed to fetch template'
      );
    } catch (err) {
      setError('Failed to fetch template');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const createTemplate = useCallback(async (
    templateData: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CommunicationTemplate | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const createRequest = {
        name: templateData.name,
        category: templateData.category,
        subjectTemplate: templateData.subjectTemplate,
        contentTemplate: templateData.contentTemplate,
        variables: templateData.variables,
        conditions: templateData.conditions,
        isActive: templateData.isActive
      };

      const response = await communicationApiService.createTemplate(createRequest);
      let newTemplate: CommunicationTemplate | null = null;

      handleApiResponse(
        response,
        (data) => {
          newTemplate = data;
          setTemplates(prev => [data, ...prev]);
        },
        'Failed to create template'
      );

      return newTemplate;
    } catch (err) {
      setError('Failed to create template');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [handleApiResponse]);

  const updateTemplate = useCallback(async (
    id: number,
    updates: Partial<CommunicationTemplate>
  ): Promise<CommunicationTemplate | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const updateRequest = {
        id,
        ...updates
      };

      const response = await communicationApiService.updateTemplate(updateRequest);
      let updatedTemplate: CommunicationTemplate | null = null;

      handleApiResponse(
        response,
        (data) => {
          updatedTemplate = data;
          setTemplates(prev => prev.map(t => t.id === id ? data : t));
          if (currentTemplate?.id === id) {
            setCurrentTemplate(data);
          }
        },
        'Failed to update template'
      );

      return updatedTemplate;
    } catch (err) {
      setError('Failed to update template');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [handleApiResponse, currentTemplate]);

  const deleteTemplate = useCallback(async (id: number): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await communicationApiService.deleteTemplate(id);

      if (response.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        if (currentTemplate?.id === id) {
          setCurrentTemplate(null);
        }
        setError(null);
        return true;
      } else {
        setError(response.error || 'Failed to delete template');
        return false;
      }
    } catch (err) {
      setError('Failed to delete template');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [currentTemplate]);

  const fetchTemplateVariants = useCallback(async (templateId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await communicationApiService.getTemplateVariants(templateId);
      handleApiResponse(
        response,
        (data) => setTemplateVariants(data || []),
        'Failed to fetch template variants'
      );
    } catch (err) {
      setError('Failed to fetch template variants');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const fetchTemplateAnalytics = useCallback(async (templateId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await communicationApiService.getTemplateAnalytics(templateId);
      handleApiResponse(
        response,
        (data) => setTemplateAnalytics(data),
        'Failed to fetch template analytics'
      );
    } catch (err) {
      setError('Failed to fetch template analytics');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const fetchABTestResults = useCallback(async (templateId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await communicationApiService.getABTestResults(templateId);
      handleApiResponse(
        response,
        (data) => setAbTestResults(data || []),
        'Failed to fetch A/B test results'
      );
    } catch (err) {
      setError('Failed to fetch A/B test results');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const fetchTemplateLibrary = useCallback(async (filters?: TemplateSearchFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await communicationApiService.getTemplateLibrary(filters);
      handleApiResponse(
        response,
        (data) => setTemplateLibrary(data),
        'Failed to fetch template library'
      );
    } catch (err) {
      setError('Failed to fetch template library');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const renderTemplate = useCallback(async (templateId: number, context: any) => {
    setIsRendering(true);
    setError(null);

    try {
      const response = await communicationApiService.renderTemplate(templateId, context);
      handleApiResponse(
        response,
        (data) => {
          // Handle rendered template data
          console.log('Template rendered:', data);
        },
        'Failed to render template'
      );
    } catch (err) {
      setError('Failed to render template');
    } finally {
      setIsRendering(false);
    }
  }, [handleApiResponse]);

  const generatePreview = useCallback((template: CommunicationTemplate, sampleData?: any) => {
    try {
      const previewResult = templateService.generatePreview(template, sampleData);
      setPreview(previewResult);
      setError(null);
    } catch (err) {
      setError('Failed to generate preview');
      setPreview(null);
    }
  }, []);

  const validateTemplate = useCallback((template: CommunicationTemplate) => {
    try {
      const validationResult = templateService.validateTemplate(template);
      setValidation(validationResult);
      setError(null);
    } catch (err) {
      setError('Failed to validate template');
      setValidation(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    // State
    templates,
    currentTemplate,
    templateVariants,
    templateAnalytics,
    abTestResults,
    templateLibrary,
    preview,
    validation,

    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isRendering,

    // Error state
    error,

    // Actions
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplateVariants,
    fetchTemplateAnalytics,
    fetchABTestResults,
    fetchTemplateLibrary,
    renderTemplate,
    generatePreview,
    validateTemplate,
    clearError,
  };
};