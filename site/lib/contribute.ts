export const CONTRIBUTE_EMAIL = "contact.us@fehlerfix.com";

export const CONTRIBUTE_ITEMS = [
  {
    title: "Neues Feature für die App vorschlagen",
    subject: "Feature-Vorschlag",
  },
  {
    title: "Featureänderungen vorschlagen",
    subject: "Featureänderung",
  },
  {
    title: "Ich habe ein Problem in der App!",
    subject: "Problem in der App",
  },
  {
    title: "Bugs / Sonstiges, das nicht klappt",
    subject: "Bug-Report",
  },
];

export function contributeMailtoHref(subject: string) {
  return `mailto:${CONTRIBUTE_EMAIL}?subject=${encodeURIComponent(`FehlerFix – ${subject}`)}`;
}
