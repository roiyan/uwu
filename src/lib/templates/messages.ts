export type CulturalPreference = "islami" | "umum" | "custom";

export type MessageTemplate = {
  slug: string;
  label: string;
  channel: "whatsapp" | "email";
  culturalPreference: CulturalPreference;
  subject?: string;
  body: string;
  description: string;
};

// Placeholder keys (canonical): {nama}, {panggilan}, {bride}, {groom},
// {date}, {venue}, {link_undangan}. {name} + {link} are backward-compat
// aliases handled in renderTemplate for historical broadcast bodies.
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    slug: "wa-umum-formal",
    label: "WhatsApp • Formal Umum",
    channel: "whatsapp",
    culturalPreference: "umum",
    description:
      "Nada formal netral. Cocok untuk undangan resmi tanpa tone keagamaan.",
    body:
      `Dengan hormat,\n\n` +
      `Bersama ini kami mengundang Bapak/Ibu/Saudara/i *{nama}* untuk menghadiri ` +
      `acara pernikahan kami:\n\n` +
      `*{bride} & {groom}*\n` +
      `📅 {date}\n` +
      `📍 {venue}\n\n` +
      `Detail lengkap dan konfirmasi kehadiran dapat diakses melalui tautan berikut:\n` +
      `{link_undangan}\n\n` +
      `Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir.\n\n` +
      `Hormat kami,\n{bride} & {groom}`,
  },
  {
    slug: "wa-islami-formal",
    label: "WhatsApp • Formal Islami",
    channel: "whatsapp",
    culturalPreference: "islami",
    description:
      "Pembuka salam dan penutup doa. Disarankan untuk pasangan muslim.",
    body:
      `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\n` +
      `Dengan memohon rahmat dan ridha Allah SWT, ` +
      `kami mengundang Bapak/Ibu/Saudara/i *{nama}* ` +
      `untuk turut hadir pada akad nikah dan resepsi pernikahan kami:\n\n` +
      `*{bride} & {groom}*\n` +
      `📅 {date}\n` +
      `📍 {venue}\n\n` +
      `Informasi lengkap dan konfirmasi kehadiran pada tautan berikut:\n` +
      `{link_undangan}\n\n` +
      `Merupakan suatu kehormatan dan kebahagiaan bagi kami ` +
      `atas kehadiran serta doa restu dari Bapak/Ibu/Saudara/i.\n\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Kami yang berbahagia,\n{bride} & {groom}`,
  },
  {
    slug: "wa-umum-santai",
    label: "WhatsApp • Santai",
    channel: "whatsapp",
    culturalPreference: "custom",
    description: "Nada hangat dan personal. Untuk sahabat dekat.",
    body:
      `Hi {nama}! 💌\n\n` +
      `Tanpa terasa hari bahagia kami tiba juga. ` +
      `Kami ingin kamu jadi bagian dari momen spesial *{bride} & {groom}*.\n\n` +
      `📅 {date}\n` +
      `📍 {venue}\n\n` +
      `Yuk konfirmasi kehadiran di sini:\n{link_undangan}\n\n` +
      `Ditunggu ya! ♡`,
  },
  {
    slug: "email-umum-formal",
    label: "Email • Formal Umum",
    channel: "email",
    culturalPreference: "umum",
    subject: "Undangan Pernikahan — {bride} & {groom}",
    description: "Versi email dari template formal umum.",
    body:
      `Dengan hormat,\n\n` +
      `Bersama ini kami mengundang Bapak/Ibu/Saudara/i {nama} untuk menghadiri ` +
      `acara pernikahan kami:\n\n` +
      `{bride} & {groom}\n` +
      `Tanggal: {date}\n` +
      `Lokasi: {venue}\n\n` +
      `Detail lengkap dan konfirmasi kehadiran: {link_undangan}\n\n` +
      `Hormat kami,\n{bride} & {groom}`,
  },
  {
    slug: "email-islami-formal",
    label: "Email • Formal Islami",
    channel: "email",
    culturalPreference: "islami",
    subject: "Undangan Walimatul 'Urs — {bride} & {groom}",
    description: "Versi email dari template formal Islami.",
    body:
      `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\n` +
      `Dengan memohon rahmat dan ridha Allah SWT, ` +
      `kami mengundang Bapak/Ibu/Saudara/i {nama} ` +
      `untuk turut hadir pada walimatul 'urs kami:\n\n` +
      `{bride} & {groom}\n` +
      `Tanggal: {date}\n` +
      `Lokasi: {venue}\n\n` +
      `Informasi lengkap dan konfirmasi kehadiran: {link_undangan}\n\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Kami yang berbahagia,\n{bride} & {groom}`,
  },
];

export function renderTemplate(
  body: string,
  data: {
    name: string;
    /** Salutation / panggilan — e.g. "Pak Ahmad dan Istri". Falls
     *  back to `name` when absent so {panggilan} is always filled. */
    nickname?: string | null;
    bride: string;
    groom: string;
    date: string;
    venue: string;
    link: string;
  },
) {
  const panggilan =
    data.nickname && data.nickname.trim().length > 0
      ? data.nickname.trim()
      : data.name;
  // English keys ({nama}, {link_undangan}) kept for the 5 shipped templates;
  // Indonesian aliases ({nama}, {panggilan}, {link_undangan}) added
  // for the Sprint A brief. {panggilan} falls back to {nama} when
  // the guest has no nickname on file.
  return body
    .replace(/\{name\}/g, data.name)
    .replace(/\{nama\}/g, data.name)
    .replace(/\{nickname\}/g, panggilan)
    .replace(/\{panggilan\}/g, panggilan)
    .replace(/\{bride\}/g, data.bride)
    .replace(/\{groom\}/g, data.groom)
    .replace(/\{date\}/g, data.date)
    .replace(/\{venue\}/g, data.venue)
    .replace(/\{link\}/g, data.link)
    .replace(/\{link_undangan\}/g, data.link);
}

export function pickDefaultTemplate(
  channel: "whatsapp" | "email",
  culturalPreference: CulturalPreference,
) {
  return (
    MESSAGE_TEMPLATES.find(
      (t) =>
        t.channel === channel && t.culturalPreference === culturalPreference,
    ) ??
    MESSAGE_TEMPLATES.find(
      (t) => t.channel === channel && t.culturalPreference === "umum",
    ) ??
    MESSAGE_TEMPLATES.find((t) => t.channel === channel)!
  );
}
