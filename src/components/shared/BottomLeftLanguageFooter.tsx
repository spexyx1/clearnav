import LanguageSelector from './LanguageSelector';

export default function BottomLeftLanguageFooter() {
  return (
    <div className="fixed bottom-0 left-0 p-4 z-40">
      <LanguageSelector variant="compact" theme="dark" />
    </div>
  );
}
