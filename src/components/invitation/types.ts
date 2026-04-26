export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
};

export type CoupleData = {
  brideName: string;
  brideNickname: string | null;
  bridePhotoUrl: string | null;
  brideFatherName: string | null;
  brideMotherName: string | null;
  groomName: string;
  groomNickname: string | null;
  groomPhotoUrl: string | null;
  groomFatherName: string | null;
  groomMotherName: string | null;
  coverPhotoUrl: string | null;
  story: string | null;
  quote: string | null;
};

export type ScheduleData = {
  label: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  venueMapUrl: string | null;
};

export type InvitationEvent = {
  id?: string;
  title: string;
  slug: string;
  musicUrl: string | null;
};

// Section visibility flags — drive which parts of the preview render.
// The editor mutates these locally; the public invitation keeps them all on.
export type SectionFlags = {
  quote: boolean;
  couple: boolean;
  story: boolean;
  schedules: boolean;
  rsvp: boolean;
  gallery: boolean;
  gifts: boolean;
};

export const ALL_SECTIONS_ON: SectionFlags = {
  quote: true,
  couple: true,
  story: true,
  schedules: true,
  rsvp: true,
  gallery: true,
  gifts: true,
};
