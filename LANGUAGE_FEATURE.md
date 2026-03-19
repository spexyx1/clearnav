# Multi-Language Support Feature

## Overview

The ClearNav platform now supports 70 languages with user-selectable language preferences that persist across sessions and sync across all devices.

## Features

### 70 Supported Languages

The platform supports all major world languages including:
- European: English, Spanish, French, German, Italian, Portuguese, Russian, Polish, Dutch, and more
- Asian: Chinese, Japanese, Korean, Hindi, Bengali, Thai, Vietnamese, and more
- Middle Eastern: Arabic, Hebrew, Persian, Urdu (with RTL support)
- African: Swahili, Afrikaans, Amharic, Zulu, Xhosa
- And many more regional languages

### User Experience

1. **Quick Language Switcher**: Globe icon in the navigation bar of all portals provides instant access to language selection
2. **Settings Panel Integration**: Full language selector in account settings with search functionality
3. **Persistent Preferences**: Language choice is saved to the user's profile and syncs across devices
4. **RTL Support**: Automatic right-to-left layout for Arabic, Hebrew, Persian, and Urdu
5. **Fallback to English**: Any untranslated strings automatically display in English

## Implementation Details

### Database

- **Table**: `user_preferences`
- **Columns**:
  - `user_id` (unique reference to auth.users)
  - `language` (ISO 639-1 code, default: 'en')
- **RLS Policies**: Users can only read/write their own preferences

### Frontend Architecture

- **i18next**: Industry-standard i18n framework
- **LanguageContext**: Global React context providing language state across the app
- **LanguageSelector**: Reusable component with two variants (full and compact)
- **Translation Files**: JSON-based translation files in `src/i18n/locales/`

### Translation Coverage

Currently translated UI elements:
- All navigation menu items (Manager Sidebar, Client Portal, Platform Admin)
- Common actions (Save, Cancel, Delete, etc.)
- Settings panels and tabs
- Portal navigation bars
- Authentication flows (Sign In, Sign Out, etc.)

User-generated content (fund names, client names, documents) remains in original language.

## Usage

### For Users

1. **Quick Switch**: Click the Globe icon in the top navigation bar
2. **Search**: Type to filter the 70 language options
3. **Select**: Click your preferred language - changes apply instantly
4. **Settings Panel**: Access full language preferences in Account Settings > Preferences

### For Developers

#### Adding New Translations

1. Open `src/i18n/locales/en.json` (source of truth)
2. Add new translation keys following the namespace pattern:
   ```json
   {
     "namespace": {
       "key": "English text"
     }
   }
   ```
3. Use in components:
   ```typescript
   import { useTranslation } from 'react-i18next';

   const { t } = useTranslation();
   return <button>{t('namespace.key')}</button>;
   ```

#### Adding More Languages

Language definitions are in `src/i18n/languages.ts`. All 70 languages are already configured. To add translation files:

1. Create `src/i18n/locales/{language-code}.json`
2. Copy structure from `en.json`
3. Translate all strings
4. Import in `src/i18n/config.ts`

## Technical Stack

- **i18next**: v23.x
- **react-i18next**: v14.x
- **Storage**: Supabase `user_preferences` table
- **Context**: React Context API via `LanguageContext`
- **UI**: Lucide React icons, Tailwind CSS

## Future Enhancements

Potential improvements:
- Automatic language detection based on browser settings
- Crowdsourced translations for community contributions
- AI-powered translation suggestions
- Export/import translation files for professional translation services
- Language-specific date/time/number formatting
