import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

export type PlaceOption = {
  id: string;
  name: string;
  full_name?: string | null;
};

type PlaceAutocompleteProps = {
  value: string;
  placeId?: string | null;
  onChange: (value: string) => void;
  onSelect: (place: PlaceOption) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Ort suchen…',
  disabled = false,
}: PlaceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  const { data: options = [] } = useQuery<PlaceOption[]>({
    queryKey: ['places-search', debouncedValue],
    queryFn: async () =>
      apiClient
        .get('/places', { params: { q: debouncedValue } })
        .then((response) => response.data as PlaceOption[]),
    enabled: debouncedValue.trim().length > 0,
    staleTime: 30_000,
  });

  const createLabel = useMemo(() => value.trim(), [value]);

  const createPlace = async () => {
    if (!createLabel) {
      return;
    }

    const created = await apiClient
      .post('/places', { name: createLabel, full_name: createLabel })
      .then((response) => response.data as PlaceOption);

    onSelect(created);
    setIsOpen(false);
  };

  return (
    <div className="rerooted-autocomplete">
      <input
        className="rerooted-input"
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
      />

      {isOpen && !disabled ? (
        <div className="rerooted-autocomplete-menu">
          {options.slice(0, 8).map((place) => (
            <button
              key={place.id}
              type="button"
              className="rerooted-autocomplete-option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(place);
                setIsOpen(false);
              }}
            >
              <strong>{place.name}</strong>
              <span>{place.full_name ?? place.name}</span>
            </button>
          ))}

          {createLabel ? (
            <button
              type="button"
              className="rerooted-autocomplete-option is-create"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void createPlace()}
            >
              <strong>+ "{createLabel}" als neuen Ort anlegen</strong>
              <span>Direkt im Backend speichern</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
