import type { Edge, Node } from '@xyflow/react';
import { apiClient } from './client';
import type { PersonGender } from './persons';

export interface PersonNodeData extends Record<string, unknown> {
  first_name: string;
  last_name: string;
  is_living: boolean | null;
  birth_year: string | null;
  death_year: string | null;
  profile_image_url: string | null;
  description_excerpt: string | null;
  gender: PersonGender | null;
  generation: number;
}

export interface EdgeData extends Record<string, unknown> {
  rel_type: string;
  dashed?: boolean;
  start_date?: string;
  end_date?: string;
  onEditRelationship?: () => void;
}

export interface TreeNode extends Node<PersonNodeData, 'person'> {
  id: string;
  type: 'person';
  position: { x: number; y: number };
  data: PersonNodeData;
}

export interface TreeEdge extends Edge<EdgeData, 'partner' | 'child'> {
  id: string;
  source: string;
  target: string;
  type: 'partner' | 'child';
  data: EdgeData;
}

export interface TreeData {
  nodes: TreeNode[];
  edges: TreeEdge[];
}

export const getTree = (): Promise<TreeData> => apiClient.get('/tree').then((r) => r.data);
