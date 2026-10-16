import { version } from "../package.json";
export function PoweredBy() {
  return (
    <footer className="feuillet-credit">
      <span>
        Propulsé par{" "}
        <a
          href="https://github.com/monsieur-de-paz/feuillet"
          target="_blank"
          rel="noopener noreferrer"
        >
          Feuillet {version}
        </a>
        , créé par Monsieur de PAZ, enseignant en France.
      </span>
    </footer>
  );
}
