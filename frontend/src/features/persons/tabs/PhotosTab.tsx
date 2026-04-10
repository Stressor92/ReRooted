import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { resolveFileUrl } from '../../../api/files';
import type { PersonDetail } from '../../../api/persons';
import Lightbox from '../../../components/Lightbox';
import { useDeletePersonFile, useUpdatePersonImage, useUploadPersonImage } from '../../../hooks/usePersonMutations';

type PhotosTabProps = {
  person: PersonDetail;
};

type PendingPhoto = {
  id: string;
  previewUrl: string;
  filename: string;
};

export default function PhotosTab({ person }: PhotosTabProps) {
  const uploadImage = useUploadPersonImage(person.id);
  const updatePersonImage = useUpdatePersonImage(person.id);
  const deleteFile = useDeletePersonFile(person.id);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { caption: string; date_text: string; place_text: string }>>({});

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        person.images.map((image) => [
          image.id,
          {
            caption: String(image.caption ?? ''),
            date_text: String(image.date_text ?? ''),
            place_text: String(image.place_text ?? ''),
          },
        ]),
      ),
    );
  }, [person.images]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const pendingId = `${file.name}-${file.lastModified}`;
        const previewUrl = URL.createObjectURL(file);
        setPendingPhotos((current) => [...current, { id: pendingId, previewUrl, filename: file.name }]);

        try {
          await uploadImage.mutateAsync({ file });
        } finally {
          setPendingPhotos((current) => current.filter((item) => item.id !== pendingId));
          URL.revokeObjectURL(previewUrl);
        }
      }
    },
    [uploadImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 20 * 1024 * 1024,
  });

  const lightboxItems = useMemo(
    () =>
      person.images
        .map((image) => ({
          src: resolveFileUrl(image.url) ?? '',
          alt: image.filename ?? `${person.first_name} ${person.last_name}`,
          caption: [image.caption, image.date_text, image.place_text].filter(Boolean).join(' · ') || image.filename,
        }))
        .filter((item) => item.src),
    [person.first_name, person.images, person.last_name],
  );

  const saveMetadata = useCallback(
    async (imageId: string, setAsProfile = false) => {
      const draft = drafts[imageId];
      if (!draft) {
        return;
      }

      await updatePersonImage.mutateAsync({
        imageId,
        data: {
          caption: draft.caption.trim() || null,
          date_text: draft.date_text.trim() || null,
          place_text: draft.place_text.trim() || null,
          is_profile: setAsProfile ? true : undefined,
        },
      });
    },
    [drafts, updatePersonImage],
  );

  return (
    <div className="rerooted-tab-stack">
      <section className="rerooted-section">
        <div className="rerooted-section-header">
          <h3>Fotos</h3>
          <span className="rerooted-field-hint">JPEG, PNG oder WEBP · max. 20 MB</span>
        </div>

        <div {...getRootProps()} className={`rerooted-dropzone${isDragActive ? ' is-drag-active' : ''}`}>
          <input {...getInputProps()} />
          <strong>Fotos hier ablegen</strong>
          <span>oder klicken, um neue Bilder hochzuladen.</span>
        </div>
      </section>

      <section className="rerooted-photo-grid">
        {pendingPhotos.map((photo) => (
          <article key={photo.id} className="rerooted-photo-card is-pending">
            <div className="rerooted-photo-skeleton" />
            <span>{photo.filename}</span>
          </article>
        ))}

        {person.images.map((image, index) => {
          const imageSrc = resolveFileUrl(image.thumb_url ?? image.url) ?? resolveFileUrl(image.url) ?? '';

          return (
            <article key={image.id} className="rerooted-photo-card">
              {image.is_profile ? <span className="rerooted-photo-badge">★</span> : null}
              <button type="button" className="rerooted-photo-button" onClick={() => setLightboxIndex(index)}>
                <img src={imageSrc} alt={image.filename ?? `${person.first_name} ${person.last_name}`} />
              </button>

              <div className="rerooted-photo-overlay">
                <button
                  type="button"
                  className="rerooted-inline-button"
                  onClick={() => void saveMetadata(image.id, true)}
                >
                  ✎ Profilbild
                </button>
                <button
                  type="button"
                  className="rerooted-inline-button is-danger"
                  onClick={() => void deleteFile.mutateAsync(image.file_id)}
                >
                  🗑 Löschen
                </button>
              </div>

              <div className="rerooted-photo-meta">
                <input
                  className="rerooted-input"
                  placeholder="Bildunterschrift"
                  value={drafts[image.id]?.caption ?? ''}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [image.id]: { ...(current[image.id] ?? { caption: '', date_text: '', place_text: '' }), caption: event.target.value },
                    }))
                  }
                />
                <div className="rerooted-photo-meta-grid">
                  <input
                    className="rerooted-input"
                    placeholder="Datum / Jahr"
                    value={drafts[image.id]?.date_text ?? ''}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [image.id]: { ...(current[image.id] ?? { caption: '', date_text: '', place_text: '' }), date_text: event.target.value },
                      }))
                    }
                  />
                  <input
                    className="rerooted-input"
                    placeholder="Ort"
                    value={drafts[image.id]?.place_text ?? ''}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [image.id]: { ...(current[image.id] ?? { caption: '', date_text: '', place_text: '' }), place_text: event.target.value },
                      }))
                    }
                  />
                </div>
                <button type="button" className="rerooted-inline-button" onClick={() => void saveMetadata(image.id)}>
                  Speichern
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <Lightbox open={lightboxIndex !== null} items={lightboxItems} initialIndex={lightboxIndex ?? 0} onClose={() => setLightboxIndex(null)} />
    </div>
  );
}
