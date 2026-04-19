import React from 'react';
import { ConnectorsDashboard } from '@/components/connectors/ConnectorsDashboard';

export const ConnectorsPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <ConnectorsDashboard />
    </div>
  );
};

export default ConnectorsPage;
