/**
 * @fileoverview Knowledge Vault Frontend Service
 * API client for unified knowledge management
 */

import api from './api';

export interface VaultItem {
  id: string;
  type: string;
  title: string;
  content: string;
  para_category: string | null;
  folder_path: string | null;
  tags: string[];
  metadata: Record<string, any>;
  linked_items: string[];
  created_by: number;
  created_at: string;
  updated_at: string;
  source_table: string;
  source_id: string;
}

export interface VaultLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: string;
  created_at: string;
}

export interface VaultStats {
  total: number;
  by_type: Record<string, number>;
  by_para: Record<string, number>;
}

/**
 * Initialize the knowledge vault
 */
export const initializeVault = () => {
  return api.post('/vault/initialize');
};

/**
 * Get all vault items with filters
 */
export const getVaultItems = (filters?: {
  type?: string;
  para_category?: string;
  folder_path?: string;
  search?: string;
  tags?: string;
}) => {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.type) params.append('type', filters.type);
    if (filters.para_category) params.append('para_category', filters.para_category);
    if (filters.folder_path) params.append('folder_path', filters.folder_path);
    if (filters.search) params.append('search', filters.search);
    if (filters.tags) params.append('tags', filters.tags);
  }
  return api.get(`/vault/items?${params.toString()}`);
};

/**
 * Get a single vault item
 */
export const getVaultItem = (id: string) => {
  return api.get(`/vault/items/${id}`);
};

/**
 * Create a new vault item
 */
export const createVaultItem = (data: {
  type: string;
  title: string;
  content?: string;
  para_category?: string;
  folder_path?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  linked_items?: string[];
}) => {
  return api.post('/vault/items', data);
};

/**
 * Update a vault item
 */
export const updateVaultItem = (id: string, data: Partial<VaultItem>) => {
  return api.put(`/vault/items/${id}`, data);
};

/**
 * Delete a vault item
 */
export const deleteVaultItem = (id: string) => {
  return api.delete(`/vault/items/${id}`);
};

/**
 * Create a link between vault items
 */
export const createVaultLink = (data: {
  source_id: string;
  target_id: string;
  link_type?: string;
}) => {
  return api.post('/vault/links', data);
};

/**
 * Get links for a vault item
 */
export const getVaultLinks = (itemId: string) => {
  return api.get(`/vault/items/${itemId}/links`);
};

/**
 * Delete a vault link
 */
export const deleteVaultLink = (linkId: string) => {
  return api.delete(`/vault/links/${linkId}`);
};

/**
 * Search vault items
 */
export const searchVault = (query: string) => {
  return api.get(`/vault/search?q=${encodeURIComponent(query)}`);
};

/**
 * Get vault statistics
 */
export const getVaultStats = () => {
  return api.get('/vault/stats');
};

/**
 * Migrate existing data to vault
 */
export const migrateToVault = () => {
  return api.post('/vault/migrate');
};
