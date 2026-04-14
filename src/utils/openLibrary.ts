export type OpenLibraryBook = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  creationDate: string;
  edition: string;
  language: string;
  physicalDescription: string;
  subjects: string;
  contents: string;
  description: string;
  series: string;
  source: string;
  bookType: string;
  identifier: string;
  cover: string;
};

type CatalogMetadataLike = {
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  creationDate?: string | null;
  edition?: string | null;
  language?: string | null;
  physicalDescription?: string | null;
  subjects?: string | null;
  contents?: string | null;
  description?: string | null;
  series?: string | null;
  source?: string | null;
  bookType?: string | null;
  identifier?: string | null;
  cover?: string | null;
};

type CatalogMetadataUpdate = {
  title?: string;
  author?: string;
  publisher?: string;
  creationDate?: string;
  edition?: string;
  language?: string;
  physicalDescription?: string;
  subjects?: string;
  contents?: string;
  description?: string;
  series?: string;
  source?: string;
  bookType?: string;
  identifier?: string;
  cover?: string;
};

function isMissingText(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function isPlaceholderTitle(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim();
  if (normalized.length === 0) return true;
  return /^unknown title/i.test(normalized);
}

function isPlaceholderAuthor(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim();
  if (normalized.length === 0) return true;
  return /^unknown author/i.test(normalized);
}

function isPlaceholderCover(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.length === 0) return true;
  return normalized.includes('via.placeholder.com') || normalized.endsWith('?text=?');
}

function pickDescription(description: any): string {
  if (!description) return '';
  if (typeof description === 'string') return description.trim();
  if (typeof description?.value === 'string') return description.value.trim();
  return '';
}

function formatList(values: unknown[], limit = 8): string {
  return values
    .map((value) => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'object' && value && 'name' in value && typeof (value as any).name === 'string') {
        return String((value as any).name).trim();
      }
      if (typeof value === 'object' && value && 'title' in value && typeof (value as any).title === 'string') {
        return String((value as any).title).trim();
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, limit)
    .join(', ');
}

function formatLanguages(languages: unknown[]): string {
  return languages
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (typeof entry === 'object' && entry && 'name' in entry && typeof (entry as any).name === 'string') {
        return String((entry as any).name).trim();
      }
      if (typeof entry === 'object' && entry && 'key' in entry && typeof (entry as any).key === 'string') {
        const key = String((entry as any).key);
        return key.split('/').filter(Boolean).pop()?.toUpperCase() ?? '';
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');
}

function formatPhysicalDescription(bookData: Record<string, any>): string {
  const parts = [
    Number.isFinite(bookData.number_of_pages) ? `${bookData.number_of_pages} pages` : '',
    typeof bookData.pagination === 'string' ? bookData.pagination.trim() : '',
    typeof bookData.physical_format === 'string' ? bookData.physical_format.trim() : '',
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(' · ');
}

function formatIdentifiers(identifiers: Record<string, unknown> | undefined, isbn: string): string {
  if (!identifiers || typeof identifiers !== 'object') return isbn;

  const entries = Object.entries(identifiers)
    .map(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      const first = values.find((item) => typeof item === 'string' && item.trim().length > 0);
      if (!first) return '';
      return `${key.toUpperCase()}: ${String(first).trim()}`;
    })
    .filter(Boolean)
    .slice(0, 4);

  return entries.length ? entries.join(' · ') : isbn;
}

export function normalizeIsbn(raw: string): string {
  return String(raw ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function buildOpenLibraryCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'L'): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
}

export function hasIncompleteCatalogMetadata(book: CatalogMetadataLike): boolean {
  return (
    isPlaceholderTitle(book.title) ||
    isPlaceholderAuthor(book.author) ||
    isPlaceholderCover(book.cover)
  );
}

export function mergeCatalogBookMetadata(
  existing: CatalogMetadataLike,
  incoming: OpenLibraryBook,
  options: { force?: boolean } = {},
) : CatalogMetadataUpdate {
  const force = options.force ?? false;
  const update: CatalogMetadataUpdate = {};

  if (incoming.title && (force || isPlaceholderTitle(existing.title))) {
    update.title = incoming.title;
  }

  if (incoming.author && (force || isPlaceholderAuthor(existing.author))) {
    update.author = incoming.author;
  }

  if (incoming.publisher && (force || isMissingText(existing.publisher))) {
    update.publisher = incoming.publisher;
  }

  if (incoming.creationDate && (force || isMissingText(existing.creationDate))) {
    update.creationDate = incoming.creationDate;
  }

  if (incoming.edition && (force || isMissingText(existing.edition))) {
    update.edition = incoming.edition;
  }

  if (incoming.language && (force || isMissingText(existing.language))) {
    update.language = incoming.language;
  }

  if (incoming.physicalDescription && (force || isMissingText(existing.physicalDescription))) {
    update.physicalDescription = incoming.physicalDescription;
  }

  if (incoming.subjects && (force || isMissingText(existing.subjects))) {
    update.subjects = incoming.subjects;
  }

  if (incoming.contents && (force || isMissingText(existing.contents))) {
    update.contents = incoming.contents;
  }

  if (incoming.description && (force || isMissingText(existing.description))) {
    update.description = incoming.description;
  }

  if (incoming.series && (force || isMissingText(existing.series))) {
    update.series = incoming.series;
  }

  if (incoming.source && (force || isMissingText(existing.source))) {
    update.source = incoming.source;
  }

  if (incoming.bookType && (force || isMissingText(existing.bookType))) {
    update.bookType = incoming.bookType;
  }

  if (incoming.identifier && (force || isMissingText(existing.identifier))) {
    update.identifier = incoming.identifier;
  }

  if (incoming.cover && (force || isPlaceholderCover(existing.cover))) {
    update.cover = incoming.cover;
  }

  return update;
}

export async function fetchOpenLibraryBookByIsbn(rawIsbn: string): Promise<OpenLibraryBook | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) return null;

  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  );

  if (!response.ok) {
    throw new Error(`Open Library lookup failed with status ${response.status}`);
  }

  const payload = await response.json().catch(() => ({} as Record<string, any>));
  const bookData = (payload as Record<string, any>)[`ISBN:${isbn}`];
  if (!bookData) return null;

  const publishers = formatList(bookData.publishers ?? [], 4);
  const creationDate = typeof bookData.publish_date === 'string' ? bookData.publish_date.trim() : '';
  const edition = typeof bookData.edition_name === 'string' ? bookData.edition_name.trim() : '';
  const language = formatLanguages(bookData.languages ?? []);
  const physicalDescription = formatPhysicalDescription(bookData);
  const subjects = formatList(bookData.subjects ?? []);
  const contents = formatList(bookData.table_of_contents ?? [], 12);
  const description = pickDescription(bookData.description);
  const series = formatList(bookData.series ?? [], 6);
  const bookType = typeof bookData?.type?.key === 'string'
    ? String(bookData.type.key).split('/').filter(Boolean).pop()?.replace(/_/g, ' ') ?? ''
    : '';
  const identifier = formatIdentifiers(bookData.identifiers, isbn);

  return {
    isbn,
    title: bookData.title || `Unknown Title (${isbn})`,
    author: bookData.authors?.[0]?.name || 'Unknown Author',
    publisher: publishers,
    creationDate,
    edition,
    language,
    physicalDescription,
    subjects,
    contents,
    description,
    series,
    source: 'Open Library',
    bookType,
    identifier,
    cover: bookData.cover?.large || buildOpenLibraryCoverUrl(isbn),
  };
}
