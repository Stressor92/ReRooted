type CanvasSearchProps = {
  query: string;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onFocusMatch: () => void;
};

export default function CanvasSearch({ query, resultCount, onQueryChange, onFocusMatch }: CanvasSearchProps) {
  return (
    <div className="rerooted-search-shell">
      <input
        className="rerooted-toolbar-search"
        placeholder="Person suchen…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onFocusMatch();
          }
        }}
      />
      <button type="button" className="rerooted-toolbar-button" onClick={onFocusMatch} title="Zur gefundenen Person springen">
        🔍{resultCount > 0 ? ` ${resultCount}` : ''}
      </button>
    </div>
  );
}
