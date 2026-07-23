const RESEND_API_URL = "https://api.resend.com/emails";
const HOST_EMAIL = "info@villa-joka.eu";
const DEFAULT_FROM = "Villa Joka <anfrage@villa-joka.eu>";

const copy = {
  de: {
    subject: "Ihre Anfrage bei Villa Joka",
    greeting: (name) => `Hallo ${name},`,
    intro:
      "vielen Dank für Ihre Anfrage. Wir haben sie erhalten und melden uns so bald wie möglich persönlich bei Ihnen.",
    summary: "Ihre Angaben",
    arrival: "Anreise",
    departure: "Abreise",
    guests: "Personen",
    message: "Nachricht",
    fallback: "nicht angegeben",
    closing: "Herzliche Grüße aus Banjole",
    family: "Familie Fersterer",
    note: "Dies ist eine automatische Eingangsbestätigung.",
  },
  en: {
    subject: "Your enquiry at Villa Joka",
    greeting: (name) => `Hello ${name},`,
    intro:
      "Thank you for your enquiry. We have received it and will get back to you personally as soon as possible.",
    summary: "Your details",
    arrival: "Arrival",
    departure: "Departure",
    guests: "Guests",
    message: "Message",
    fallback: "not provided",
    closing: "Warm regards from Banjole",
    family: "The Fersterer family",
    note: "This is an automatic confirmation of receipt.",
  },
  uk: {
    subject: "Ваш запит до Villa Joka",
    greeting: (name) => `Вітаємо, ${name}!`,
    intro:
      "Дякуємо за ваш запит. Ми його отримали й особисто зв’яжемося з вами найближчим часом.",
    summary: "Ваші дані",
    arrival: "Заїзд",
    departure: "Виїзд",
    guests: "Кількість гостей",
    message: "Повідомлення",
    fallback: "не вказано",
    closing: "Щирі вітання з Баньоле",
    family: "Родина Ферстерер",
    note: "Це автоматичне підтвердження отримання.",
  },
};

function clean(value, maxLength = 2_000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

function isValidEmail(value) {
  return (
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function formatDate(value, language, fallback) {
  const raw = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;

  const locale = language === "en" ? "en-GB" : language === "uk" ? "uk-UA" : "de-AT";
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function buildEmail(data) {
  const language = ["de", "en", "uk"].includes(data._language)
    ? data._language
    : "de";
  const text = copy[language];
  const firstName = clean(data.vorname, 100) || text.fallback;
  const lastName = clean(data.nachname, 100);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const arrival = formatDate(data.anreise, language, text.fallback);
  const departure = formatDate(data.abreise, language, text.fallback);
  const guests = clean(data.personen, 10) || text.fallback;
  const message = clean(data.nachricht) || text.fallback;
  const subject = `Booking request Villa Joka ${arrival} - ${departure}`;

  const plainText = [
    text.greeting(firstName),
    "",
    text.intro,
    "",
    `${text.summary}:`,
    `${text.arrival}: ${arrival}`,
    `${text.departure}: ${departure}`,
    `${text.guests}: ${guests}`,
    `${text.message}: ${message}`,
    "",
    text.closing,
    text.family,
    "",
    text.note,
  ].join("\n");

  const html = `<!doctype html>
<html lang="${language}">
  <body style="margin:0;background:#f5f1e8;color:#243128;font-family:Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:32px 18px">
      <div style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #ded7c8">
        <div style="background:#183d30;color:#fff;padding:26px 30px">
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Banjole · Istrien · Kroatien</div>
          <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:normal;margin:8px 0 0">Villa Joka</h1>
        </div>
        <div style="padding:30px">
          <p style="font-size:17px;margin:0 0 18px">${escapeHtml(text.greeting(firstName))}</p>
          <p style="line-height:1.65;margin:0 0 24px">${escapeHtml(text.intro)}</p>
          <h2 style="font-family:Georgia,serif;font-size:23px;font-weight:normal;margin:0 0 14px">${escapeHtml(text.summary)}</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;line-height:1.5">
            <tr><td style="padding:8px 10px 8px 0;color:#66736b">${escapeHtml(text.arrival)}</td><td style="padding:8px 0">${escapeHtml(arrival)}</td></tr>
            <tr><td style="padding:8px 10px 8px 0;color:#66736b">${escapeHtml(text.departure)}</td><td style="padding:8px 0">${escapeHtml(departure)}</td></tr>
            <tr><td style="padding:8px 10px 8px 0;color:#66736b">${escapeHtml(text.guests)}</td><td style="padding:8px 0">${escapeHtml(guests)}</td></tr>
            <tr><td style="padding:8px 10px 8px 0;color:#66736b;vertical-align:top">${escapeHtml(text.message)}</td><td style="padding:8px 0">${escapeHtml(message)}</td></tr>
          </table>
          <p style="line-height:1.6;margin:26px 0 0">${escapeHtml(text.closing)}<br><strong>${escapeHtml(text.family)}</strong></p>
        </div>
        <div style="padding:15px 30px;background:#faf8f3;color:#718078;font-size:12px">${escapeHtml(text.note)}</div>
      </div>
    </div>
  </body>
</html>`;

  return { language, fullName, subject, plainText, html };
}

export default {
  async formSubmitted(event) {
    const data = event?.data ?? {};

    if (data["form-name"] && data["form-name"] !== "buchungsanfrage") return;

    const recipient = clean(data.email, 254).toLowerCase();
    if (!isValidEmail(recipient)) {
      console.warn("Confirmation skipped: invalid recipient address.");
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("Confirmation skipped: RESEND_API_KEY is not configured.");
      return;
    }

    const email = buildEmail(data);
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [recipient],
        reply_to: HOST_EMAIL,
        subject: email.subject,
        text: email.plainText,
        html: email.html,
        tags: [{ name: "form", value: "buchungsanfrage" }],
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Resend confirmation failed (${response.status}): ${detail}`);
    }

    console.log(`Confirmation sent for ${email.language} enquiry by ${email.fullName}.`);
  },
};
