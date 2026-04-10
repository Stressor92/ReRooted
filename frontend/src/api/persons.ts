import { apiClient } from './client';

export interface PlaceSummary extends Record<string, unknown> {
  id: string;
  name: string;
  full_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PersonEvent extends Record<string, unknown> {
  id: string;
  person_id: string;
  event_type: string;
  date_text?: string | null;
  date_sort?: string | null;
  place_id?: string | null;
  place_name?: string | null;
  description?: string | null;
  is_private: boolean;
}

export interface PersonImage extends Record<string, unknown> {
  id: string;
  file_id: string;
  is_profile: boolean;
  caption?: string | null;
  date_text?: string | null;
  place_text?: string | null;
  filename?: string | null;
  content_type?: string | null;
  url?: string | null;
  thumb_url?: string | null;
}

export interface PersonSummary extends Record<string, unknown> {
  id: string;
  first_name: string;
  last_name: string;
  is_living: boolean | null;
  birth_place_id?: string | null;
  description?: string | null;
  gramps_id?: string | null;
  profile_image_url: string | null;
}

export interface PersonDetail extends PersonSummary {
  birth_place?: PlaceSummary | null;
  events: PersonEvent[];
  images: PersonImage[];
}

export const getPersons = (): Promise<PersonSummary[]> =>
  apiClient.get('/persons').then((r) => r.data);

export const getPerson = (id: string): Promise<PersonDetail> =>
  apiClient.get(`/persons/${id}`).then((r) => r.data);
