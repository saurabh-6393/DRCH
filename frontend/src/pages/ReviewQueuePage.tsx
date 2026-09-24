import React from 'react';
import { VerificationQueue } from '../features/verifications/VerificationQueue';

export const ReviewQueuePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <VerificationQueue />
    </div>
  );
};
