import React from 'react';
import { MyReportsList } from '../features/incidents/MyReportsList';

export const MyReportsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <MyReportsList />
    </div>
  );
};
