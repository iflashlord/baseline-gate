// Test file to demonstrate issue grouping functionality
// This file contains multiple instances of the same baseline features

declare const navigator: any;

// Multiple clipboard API calls (same feature, different locations)
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function pasteText(): Promise<string> {
  return await navigator.clipboard.readText();
}

export async function copyData(data: any): Promise<void> {
  const items = [new ClipboardItem({ 'text/plain': data })];
  await navigator.clipboard.write(items);
}

export async function getClipboardContents(): Promise<any> {
  const items = await navigator.clipboard.read();
  return items;
}

export async function clearClipboard(): Promise<void> {
  await navigator.clipboard.writeText('');
}

// Multiple Promise.any calls (same feature, different locations)
export async function raceRequests<T>(requests: Promise<T>[]): Promise<T> {
  return Promise.any(requests);
}

export async function findFirstSuccess<T>(tasks: Promise<T>[]): Promise<T> {
  return Promise.any(tasks);
}

export async function getAnyResult<T>(operations: Promise<T>[]): Promise<T> {
  return Promise.any(operations);
}

// Multiple URL.canParse calls (same feature, different locations)
export function isValidUrl(url: string): boolean {
  return URL.canParse(url);
}

export function checkUrlFormat(input: string): boolean {
  return URL.canParse(input);
}

export function validateUrl(urlString: string): boolean {
  return URL.canParse(urlString);
}

export function parseableUrl(str: string): boolean {
  return URL.canParse(str);
}