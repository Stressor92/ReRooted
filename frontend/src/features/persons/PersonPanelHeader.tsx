import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { uploadFile } from '../../api/files';
import type { PersonDetail } from '../../api/persons';
import { resolveApiUrl } from '../../api/client';
import { useUpdatePerson } from '../../hooks/usePersonMutations';

type PersonPanelHeaderProps = {
  person: PersonDetail;
  onClose: () => void;
  onFocusInfo: () => void;
  onDeleteRequest: () => void;
  onCreateRelative?: (kind: 'child' | 'partner' | 'parent' | 'sibling') => void;
};

export default function PersonPanelHeader({
  person,
  onClose,
  onFocusInfo,
  onDeleteRequest,
  onCreateRelative,
}: PersonPanelHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updatePerson = useUpdatePerson(person.id);
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [relationMenuOpen, setRelationMenuOpen] = useState(false);

  useEffect(() => {
    setFirstName(person.first_name);
    setLastName(person.last_name);
  }, [person.first_name, person.last_name]);

  const saveName = async () => {
    const nextFirstName = firstName.trim() || person.first_name;
    const nextLastName = lastName.trim() || person.last_name;

    if (nextFirstName !== person.first_name || nextLastName !== person.last_name) {
      await updatePerson.mutateAsync({ first_name: nextFirstName, last_name: nextLastName });
    }

    setIsEditingName(false);
  };

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const uploaded = await uploadFile(file);
      await updatePerson.mutateAsync({ profile_image_id: uploaded.id });
    } finally {
      event.target.value = '';
      window.setTimeout(() => {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      }, 1000);
    }
  };

  const imageUrl = previewUrl ?? resolveApiUrl(person.profile_image_url);

  return (
    <header className="rerooted-panel-header">
      <button type="button" className="rerooted-close-button" onClick={onClose} aria-label="Panel schließen">
        ×
      </button>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleProfileUpload(event)} />

      <button type="button" className="rerooted-profile-button" onClick={() => fileInputRef.current?.click()}>
        {imageUrl ? (
          <img className="rerooted-panel-profile-image" src={imageUrl} alt={`${person.first_name} ${person.last_name}`} />
        ) : (
          <div className="rerooted-panel-profile-image rerooted-person-photo--fallback rerooted-panel-profile-fallback">
            {`${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.toUpperCase()}
          </div>
        )}
      </button>

      <div className="rerooted-panel-header-copy">
        {isEditingName ? (
          <motion.div className="rerooted-name-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <input
              className="rerooted-input"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void saveName();
                }
                if (event.key === 'Escape') {
                  setIsEditingName(false);
                  setFirstName(person.first_name);
                  setLastName(person.last_name);
                }
              }}
              autoFocus
            />
            <input
              className="rerooted-input"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void saveName();
                }
              }}
            />
          </motion.div>
        ) : (
          <div className="rerooted-panel-name-block" onDoubleClick={() => setIsEditingName(true)}>
            <h2>
              {person.first_name} {person.last_name}
            </h2>
            <span>Doppelklick zum Umbenennen</span>
          </div>
        )}

        <div className="rerooted-panel-quick-actions">
          <button type="button" className="rerooted-icon-button" onClick={onFocusInfo} title="Info bearbeiten">
            ✎
          </button>
          <div className="rerooted-panel-action-group">
            <button
              type="button"
              className="rerooted-icon-button"
              title="Verwandte hinzufügen"
              onClick={() => setRelationMenuOpen((current) => !current)}
            >
              ⟷
            </button>
            {relationMenuOpen ? (
              <div className="rerooted-panel-action-menu">
                <button type="button" className="rerooted-context-action" onClick={() => { setRelationMenuOpen(false); onCreateRelative?.('partner'); }}>
                  + Partner
                </button>
                <button type="button" className="rerooted-context-action" onClick={() => { setRelationMenuOpen(false); onCreateRelative?.('child'); }}>
                  + Kind
                </button>
                <button type="button" className="rerooted-context-action" onClick={() => { setRelationMenuOpen(false); onCreateRelative?.('parent'); }}>
                  + Elternteil
                </button>
                <button type="button" className="rerooted-context-action" onClick={() => { setRelationMenuOpen(false); onCreateRelative?.('sibling'); }}>
                  + Geschwister
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className="rerooted-icon-button is-danger" onClick={onDeleteRequest} title="Person löschen">
            🗑
          </button>
        </div>
      </div>
    </header>
  );
}
