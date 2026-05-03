const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHAR_COUNT = CHARS.length;
const MAX_UNIFORM = 256 - (256 % CHAR_COUNT);

export function generateMeetingCode(): string {
  const array = new Uint8Array(1);
  const result: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    let byte: number;
    do {
      crypto.getRandomValues(array);
      byte = array[0];
    } while (byte >= MAX_UNIFORM);
    
    result.push(CHARS[byte % CHAR_COUNT]);
  }
  
  return result.join('');
}

export function isValidMeetingCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{4}$/i.test(code);
}

export function normalizeMeetingCode(code: string): string {
  return code.toUpperCase().trim();
}
