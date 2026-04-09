export type OpenLibraryBook = {
  isbn: string;
  title: string;
  author: string;
  cover: string;
};

type CatalogMetadataLike = {
  title?: string | null;
  author?: string | null;
  cover?: string | null;
};

type CatalogMetadataUpdate = {
  title?: string;
  author?: string;
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

  return {
    isbn,
    title: bookData.title || `Unknown Title (${isbn})`,
    author: bookData.authors?.[0]?.name || 'Unknown Author',
    cover: bookData.cover?.large || buildOpenLibraryCoverUrl(isbn),
  };
}
