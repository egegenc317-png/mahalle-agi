import nodemailer from "nodemailer";

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from };
}

export async function sendVerificationEmail(email: string, code: string) {
  const config = getMailerConfig();
  if (!config) {
    throw new Error("SMTP ayarları tanımlı değil. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve SMTP_FROM gerekli.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Mahalle Ağı doğrulama kodun",
    text: `Doğrulama kodun: ${code}. Kod 4 dakika boyunca geçerlidir.`,
    html: `<div style="font-family:Arial,sans-serif;padding:24px;background:#fff7ed;color:#292524">
      <h2 style="margin:0 0 12px;color:#c2410c">Mahalle Ağı e-posta doğrulaması</h2>
      <p style="margin:0 0 16px">Kayıt işlemini tamamlamak için aşağıdaki kodu gir:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 20px;border-radius:14px;background:#ffffff;border:1px solid #fdba74;display:inline-block">${code}</div>
      <p style="margin:16px 0 0;font-size:13px;color:#57534e">Kod 4 dakika boyunca geçerlidir.</p>
    </div>`
  });
}
