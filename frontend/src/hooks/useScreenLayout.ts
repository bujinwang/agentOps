import { useMemo } from 'react';
import { useResponsive } from './useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialSpacing } from '../styles/MaterialDesign';

interface ScreenLayoutOptions {
  maxWidth?: Partial<Record<'mobile' | 'tablet' | 'desktop', number>>;
  verticalPadding?: number;
  horizontalPadding?: number;
}

export const useScreenLayout = (options: ScreenLayoutOptions = {}) => {
  const responsive = useResponsive();
  const { theme } = useTheme();

  const layout = useMemo(() => {
    const horizontalPadding = responsive.getResponsivePadding(
      options.horizontalPadding ?? MaterialSpacing.xl,
      {
        mobile: MaterialSpacing.lg,
        tablet: MaterialSpacing.xl,
        desktop: MaterialSpacing.xl,
      }
    );

    const verticalPadding = responsive.getResponsivePadding(
      options.verticalPadding ?? MaterialSpacing.xl,
      {
        mobile: MaterialSpacing.lg,
      }
    );

    const maxWidth = responsive.getMaxContentWidth({
      tablet: 840,
      desktop: 1120,
      ...options.maxWidth,
    });

    return {
      containerStyle: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: verticalPadding,
        paddingBottom: verticalPadding,
      } as const,
      contentStyle: {
        width: '100%',
        maxWidth,
        alignSelf: 'center',
        paddingHorizontal: horizontalPadding,
        gap: responsive.getResponsiveSpacing(MaterialSpacing.lg),
      } as const,
      sectionSpacing: responsive.getResponsiveSpacing(MaterialSpacing.lg),
      gridColumns: responsive.getGridColumns({
        mobile: 1,
        tablet: 2,
        desktop: 3,
      }),
      responsive,
      theme,
    };
  }, [responsive, theme, options.horizontalPadding, options.maxWidth, options.verticalPadding]);

  return layout;
};

export default useScreenLayout;
