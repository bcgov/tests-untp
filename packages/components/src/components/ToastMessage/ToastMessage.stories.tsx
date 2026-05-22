import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ToastMessage, toastMessage, Status } from './ToastMessage';

const meta = {
  title: 'ToastMessage',
  component: ToastMessage,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof ToastMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultArgs = {
  status: Status.success,
  message: 'Toast message!',
  linkURL: '',
};

export const Default: Story = {
  args: defaultArgs,
  decorators: [
    (Story) => (
      <div style={{ minWidth: '500px', height: '40vh' }}>
        <Story />
        {toastMessage({
          status: defaultArgs.status,
          message: defaultArgs.message,
          linkURL: defaultArgs.linkURL,
        }) as React.ReactNode}
      </div>
    ),
  ],
};

export const WithVcLink: Story = {
  args: {
    status: Status.success,
    message: 'Verifiable credential issued',
    linkURL: 'https://example.com/verify/credential/1',
  },
  decorators: [
    (Story, { args }) => (
      <div style={{ minWidth: '500px', height: '40vh' }}>
        <Story />
        {toastMessage({
          status: args.status,
          message: args.message,
          linkURL: args.linkURL,
        }) as React.ReactNode}
      </div>
    ),
  ],
};
