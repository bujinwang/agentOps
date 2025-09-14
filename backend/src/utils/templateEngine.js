/**
 * Template Engine for Personalized Communication Templates
 * Supports variable substitution with filters and conditional rendering
 */

class TemplateEngine {
    constructor() {
        this.filters = {
            currency: this.currencyFilter,
            uppercase: this.uppercaseFilter,
            lowercase: this.lowercaseFilter,
            capitalize: this.capitalizeFilter,
            date: this.dateFilter,
            number: this.numberFilter
        };
    }

    /**
     * Render a template with context variables
     */
    render(template, context = {}) {
        let result = template;

        // Replace variables with context values
        result = this.replaceVariables(result, context);

        // Process conditional blocks
        result = this.processConditionals(result, context);

        // Apply filters
        result = this.applyFilters(result);

        return result;
    }

    /**
     * Replace {{variable}} and {{variable | filter}} patterns
     */
    replaceVariables(template, context) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
            const parts = expression.trim().split('|').map(part => part.trim());
            const variablePath = parts[0];
            const filters = parts.slice(1);

            let value = this.getNestedValue(context, variablePath);

            // Apply filters
            for (const filter of filters) {
                value = this.applyFilter(value, filter);
            }

            return value !== undefined && value !== null ? String(value) : '';
        });
    }

    /**
     * Process conditional blocks like {{#if condition}}content{{/if}}
     */
    processConditionals(template, context) {
        return template.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const conditionResult = this.evaluateCondition(condition, context);
            return conditionResult ? content : '';
        });
    }

    /**
     * Apply a filter to a value
     */
    applyFilter(value, filterName) {
        const filter = this.filters[filterName];
        return filter ? filter(value) : value;
    }

    /**
     * Apply all filters in the template
     */
    applyFilters(template) {
        // This could be extended for more complex filter processing
        return template;
    }

    /**
     * Get nested object value by dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                // Handle array access like items[0]
                if (key.includes('[') && key.includes(']')) {
                    const [arrayKey, indexStr] = key.split('[');
                    const index = parseInt(indexStr.replace(']', ''));
                    return current[arrayKey]?.[index];
                }
                return current[key];
            }
            return undefined;
        }, obj);
    }

    /**
     * Evaluate a conditional expression
     */
    evaluateCondition(condition, context) {
        // Simple condition evaluation - can be extended for complex expressions
        const value = this.getNestedValue(context, condition);
        return Boolean(value);
    }

    // Filter implementations
    currencyFilter(value) {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    uppercaseFilter(value) {
        return String(value).toUpperCase();
    }

    lowercaseFilter(value) {
        return String(value).toLowerCase();
    }

    capitalizeFilter(value) {
        const str = String(value);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    dateFilter(value, format = 'short') {
        if (!value) return value;
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;

        const options = format === 'long'
            ? { year: 'numeric', month: 'long', day: 'numeric' }
            : { month: 'short', day: 'numeric', year: 'numeric' };

        return date.toLocaleDateString('en-US', options);
    }

    numberFilter(value, decimals = 0) {
        if (typeof value !== 'number') return value;
        return value.toFixed(decimals);
    }
}

// Export functions for use in other modules
const templateEngine = new TemplateEngine();

function renderTemplate(template, context) {
    return templateEngine.render(template, context);
}

function validateTemplateVariables(template, variables) {
    const errors = [];
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const foundVariables = new Set();

    let match;
    while ((match = variablePattern.exec(template)) !== null) {
        const expression = match[1].trim();
        const variablePath = expression.split('|')[0].trim();
        foundVariables.add(variablePath);
    }

    // Check if all found variables are defined
    for (const variable of foundVariables) {
        if (!isVariableDefined(variables, variable)) {
            errors.push(`Undefined variable: ${variable}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        foundVariables: Array.from(foundVariables)
    };
}

function isVariableDefined(variables, path) {
    const parts = path.split('.');
    let current = variables;

    for (const part of parts) {
        if (!current || typeof current !== 'object') {
            return false;
        }

        // Handle array notation
        if (part.includes('[') && part.includes(']')) {
            const [arrayKey, indexStr] = part.split('[');
            const index = parseInt(indexStr.replace(']', ''));
            current = current[arrayKey]?.[index];
        } else {
            current = current[part];
        }

        if (current === undefined) {
            return false;
        }
    }

    return true;
}

function extractTemplateVariables(template) {
    const variables = new Set();
    const variablePattern = /\{\{([^}]+)\}\}/g;

    let match;
    while ((match = variablePattern.exec(template)) !== null) {
        const expression = match[1].trim();
        const variablePath = expression.split('|')[0].trim();
        variables.add(variablePath);
    }

    return Array.from(variables);
}

module.exports = {
    TemplateEngine,
    renderTemplate,
    validateTemplateVariables,
    extractTemplateVariables
};