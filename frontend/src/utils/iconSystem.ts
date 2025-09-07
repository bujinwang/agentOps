import { MaterialIcons } from '../styles/MaterialDesign';

// Icon validation utilities
export const validateIcon = (name: string, category?: keyof typeof MaterialIcons): boolean => {
  if (category) {
    return !!(MaterialIcons[category] && MaterialIcons[category][name]);
  }
  
  // Check if icon exists in any category
  return Object.values(MaterialIcons).some(categoryIcons => 
    categoryIcons && categoryIcons[name]
  );
};

// Get all available icons in a category
export const getIconsInCategory = (category: keyof typeof MaterialIcons): string[] => {
  const categoryIcons = MaterialIcons[category];
  return categoryIcons ? Object.keys(categoryIcons) : [];
};

// Search icons by name
export const searchIcons = (query: string): Array<{category: string, name: string, icon: string}> => {
  const results: Array<{category: string, name: string, icon: string}> = [];
  
  Object.entries(MaterialIcons).forEach(([category, icons]) => {
    if (icons) {
      Object.entries(icons).forEach(([name, icon]) => {
        if (name.toLowerCase().includes(query.toLowerCase()) || 
            icon.toLowerCase().includes(query.toLowerCase())) {
          results.push({ category, name, icon });
        }
      });
    }
  });
  
  return results;
};

// Get icon by semantic name
export const getIconByName = (name: string, category?: keyof typeof MaterialIcons): string | null => {
  if (category && MaterialIcons[category] && MaterialIcons[category][name]) {
    return MaterialIcons[category][name];
  }
  
  // Search across all categories
  for (const categoryIcons of Object.values(MaterialIcons)) {
    if (categoryIcons && categoryIcons[name]) {
      return categoryIcons[name];
    }
  }
  
  return null;
};

// Icon theme utilities
export const getThemedIconColor = (theme: 'light' | 'dark', state: 'default' | 'active' | 'inactive' | 'disabled' = 'default') => {
  // This would integrate with your theme system
  // For now, returning basic colors based on theme and state
  const colors = {
    light: {
      default: '#212121',
      active: '#1976D2',
      inactive: '#BDBDBD',
      disabled: '#E0E0E0',
    },
    dark: {
      default: '#FFFFFF',
      active: '#64B5F6',
      inactive: '#757575',
      disabled: '#424242',
    },
  };
  
  return colors[theme][state];
};

// Icon accessibility helpers
export const getIconAccessibilityLabel = (name: string, category?: string): string => {
  const categoryLabel = category ? `${category} ` : '';
  return `${categoryLabel}${name.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} icon`;
};

// Icon size helpers
export const getResponsiveIconSize = (baseSize: number, screenWidth: number): number => {
  // Responsive scaling based on screen width
  if (screenWidth < 360) {
    return Math.max(baseSize * 0.8, 16); // Minimum 16px
  } else if (screenWidth > 768) {
    return baseSize * 1.2; // Larger on tablets
  }
  return baseSize;
};