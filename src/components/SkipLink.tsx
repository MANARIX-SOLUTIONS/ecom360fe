/**
 * Skip link for keyboard/screen reader users.
 * Hidden until focused, allows skipping navigation to go straight to main content.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      Aller au contenu principal
    </a>
  );
}
