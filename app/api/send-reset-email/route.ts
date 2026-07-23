import { NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Chave RESEND_API_KEY não configurada no servidor." }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const { email } = await req.json()
    const targetEmail = email || "flavio.adsv@gmail.com"

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://dashboard-de-gestao.vercel.app"
    const cleanOrigin = origin.replace(/\/$/, "")
    const resetToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const resetUrl = `${cleanOrigin}/reset-password?email=${encodeURIComponent(targetEmail)}&token=${resetToken}`

    const data = await resend.emails.send({
      from: "Octho Gestão <onboarding@resend.dev>",
      to: [targetEmail],
      subject: "Octho — Redefinição de Senha",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; text-align: center;">
          <div style="margin-bottom: 24px;">
            <h2 style="color: #0F6FFF; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Octho</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Gestão de Tarefas & Horas</p>
          </div>
          
          <h3 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 12px;">Solicitação de Redefinição de Senha</h3>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: left;">
            Recebemos um pedido para alterar a senha da conta <strong>${targetEmail}</strong>. Clique no botão abaixo para cadastrar sua nova senha com segurança:
          </p>

          <div style="margin: 28px 0;">
            <a href="${resetUrl}" target="_blank" style="background-color: #0F6FFF; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(15,111,255,0.25);">
              Redefinir Minha Senha
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-top: 20px; text-align: left;">
            Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br />
            <a href="${resetUrl}" style="color: #0F6FFF; word-break: break-all;">${resetUrl}</a>
          </p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 28px 0 16px;" />
          <p style="font-size: 12px; color: #cbd5e1; margin: 0;">Se você não solicitou este e-mail, pode ignorá-lo com segurança.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao enviar e-mail via Resend" }, { status: 500 })
  }
}
