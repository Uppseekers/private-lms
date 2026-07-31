import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PlaceholderPage({ title, description }: { title: string, description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600">{description || 'This module is currently under construction.'}</p>
      </CardContent>
    </Card>
  );
}

// Student Pages
export const Vault = () => <PlaceholderPage title="Document Vault" description="Dual-tab document directory for Course Materials and My Uploads." />;
export const EssayTool = () => <PlaceholderPage title="Essay Writing Tool" description="WYSIWYG editor with live character count, auto-save, and teacher feedback." />;
export const Tasks = () => <PlaceholderPage title="Task Manager" description="Kanban board for personal productivity tracking (TODO, IN PROGRESS, COMPLETED)." />;

// Team Pages
