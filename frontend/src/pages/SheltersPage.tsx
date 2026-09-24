import React from 'react';
import { ShelterSearch } from '../features/shelters/ShelterSearch';

export const SheltersPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ShelterSearch />
    </div>
  );
};
