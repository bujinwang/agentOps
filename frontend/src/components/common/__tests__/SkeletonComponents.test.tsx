import React from 'react';
import { render } from '@testing-library/react-native';
import SkeletonList, {
  LeadListSkeleton,
  TaskListSkeleton,
} from '../SkeletonList';
import {
  LeadDetailSkeleton,
  TaskDetailSkeleton,
} from '../SkeletonCard';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    getThemeValue: (light) => light,
  }),
}));

describe('Skeleton loading components', () => {
  it('renders specified count of generic skeleton cards', () => {
    const { getAllByLabelText } = render(
      <SkeletonList count={3} animated={false} />
    );
    expect(getAllByLabelText(/Loading list item/i)).toHaveLength(3);
  });

  it('renders lead list skeleton items with accessible labels', () => {
    const { getAllByLabelText } = render(<LeadListSkeleton count={4} animated={false} />);
    expect(getAllByLabelText(/Loading leads item/i)).toHaveLength(4);
  });

  it('renders task list skeleton items with accessible labels', () => {
    const { getAllByLabelText } = render(<TaskListSkeleton count={2} animated={false} />);
    expect(getAllByLabelText(/Loading tasks item/i)).toHaveLength(2);
  });

  it('renders multiple sections for lead detail skeleton', () => {
    const { getAllByLabelText } = render(<LeadDetailSkeleton animated={false} />);
    expect(getAllByLabelText(/Loading content/i).length).toBeGreaterThanOrEqual(3);
  });

  it('renders multiple sections for task detail skeleton', () => {
    const { getAllByLabelText } = render(<TaskDetailSkeleton animated={false} />);
    expect(getAllByLabelText(/Loading content/i).length).toBeGreaterThanOrEqual(3);
  });
});
