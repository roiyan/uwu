export function getWhatsAppShareUrl(partnerName: string, inviteUrl: string) {
  const name = partnerName.trim() || "pasangan saya";
  const msg = `Hai ${name}, ayo kelola undangan pernikahan kita bersama di uwu! 💍\n\nKlik link ini untuk bergabung:\n${inviteUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}
